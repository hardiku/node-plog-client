var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    PlogClient = require('../lib/plog-client'),
    Checksum = require('../lib/plog-client/checksum'),
    packets = require('../lib/plog-client/packets'),
    dgram = require('dgram');

describe('PlogClient', function () {
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('send', function () {

    context("when no socket is given", function () {
      var client;

      beforeEach(function () {
        client = new PlogClient;
      });

      it("constructs a socket", function () {
        client.send('xxx');
        expect(client.socket).to.be.an.instanceof(dgram.Socket);
      });
    });

    context("with an existing socket", function () {
      var socket, client;
      var chunkSize = 5;

      beforeEach(function () {
        socket = dgram.createSocket('udp4');
        client = new PlogClient({socket: socket, chunkSize: chunkSize});
      });

      it("contacts the given host and port", function () {
        var sendSpy = sandbox.spy(socket, 'send');
        client.send('xxx');
        sinon.assert.calledWith(sendSpy,
          sinon.match.any,
          sinon.match.any,
          sinon.match.any,
          client.port,
          client.host
        );
      });

      it("sends the encoded packet", function () {
        var buffer = new Buffer([1, 2, 3])
        sandbox.stub(packets.FragmentedMessage, 'encode', function () {
          return buffer;
        });

        var sendSpy = sandbox.spy(socket, 'send');
        client.send('xxx');
        sinon.assert.calledWith(sendSpy,
          buffer,
          sinon.match.any,
          sinon.match.any,
          sinon.match.any,
          sinon.match.any
        );
      });

      it("encodes the message id, length, and chunk size", function () {
        var firstId = client.lastMessageId,
            message = 'xxx',
            checksum = 200;

        var encodeSpy = sandbox.spy(packets.FragmentedMessage, 'encode');
        sandbox.stub(Checksum, 'compute', function () {
          return checksum;
        })

        client.send(message);
        sinon.assert.calledWith(encodeSpy,
          firstId + 1,
          message.length,
          checksum,
          chunkSize,
          sinon.match.any,
          sinon.match.any,
          sinon.match.any
        );
      });

      it("returns a monotonically increasing message id", function () {
        var firstId = client.lastMessageId;
        expect(client.send('xxx')).to.eql(firstId + 1);
        expect(client.send('xxx')).to.eql(firstId + 2);
      });

    });

    describe("message payload", function () {
      var socket, client;
      var capturedBuffer;

      beforeEach(function () {
        socket = dgram.createSocket('udp4');
        client = new PlogClient({socket: socket});

        capturedBuffer = null;
        sandbox.stub(socket, 'send', function (buffer) {
          capturedBuffer = buffer;
        });
      });

      function validatePayload (packet, message) {
        var payloadSlice = packet.slice(packet.length - message.length);
        expect(payloadSlice.length).to.equal(message.length);
        for (var i = 0; i < message.length; i++) {
          expect(payloadSlice[i]).to.equal(message[i]);
        }
      }

      context("when the first argument is a buffer", function () {
        // This is an illegal utf-8 sequence.
        var message = new Buffer([0xC2]);

        it("is the contents of the buffer unchanged", function () {
          client.send(message);
          validatePayload(capturedBuffer, message);
        });
      });

      context("when the first argument is a string", function () {
        var message = "Test test \u04C1",
            expectedBuffer = new Buffer(message, 'utf-8');

        it("is the contents of the string as utf-8", function () {
          client.send(message);
          validatePayload(capturedBuffer, expectedBuffer);
        });
      });

    });

    describe("message id", function () {
      var client, messageIds;

      beforeEach(function () {
        client = new PlogClient;
        messageIds = [];
        sandbox.stub(packets.FragmentedMessage, 'encode', function (messageId) {
          messageIds.push(messageId);
          return new Buffer(1);
        });
      });

      it("encodes each message with a monotonically increasing id", function () {
        var firstId = client.lastMessageId;
        for (var i = 0; i < 3; i++) {
          client.send('xxx');
        }
        expect(messageIds).to.eql([firstId + 1, firstId + 2, firstId + 3]);
      });

    });

    describe("chunking", function () {
      var chunkSize, message, expectedChunks;
      var socket, client, sentDatagrams;

      beforeEach(function () {
        chunkSize = 5;
        message = 'AAAA';
        expectedChunks = ['AAAA'];

        socket = dgram.createSocket('udp4');

        sandbox.stub(packets.FragmentedMessage, 'encode', function (
            messageId,
            length,
            checksum,
            chunkSize,
            count,
            index,
            payload) {
          return [count, index, payload];
        });

        sentDatagrams = [];
        sandbox.stub(socket, 'send', function (
            buffer,
            flags,
            length,
            port,
            host) {
          sentDatagrams.push(buffer);
        });
      });

      function client () {
        return new PlogClient({socket: socket, chunkSize: chunkSize});
      }

      function repeatString(string, count) {
        return Array(count + 1).join(string);
      }

      function validateDatagrams () {
        var allPayloads = [];
        for(var i = 0; i < sentDatagrams.length; i++) {
          var count = sentDatagrams[i][0],
              index = sentDatagrams[i][1],
              payload = sentDatagrams[i][2];

          expect(count).to.equal(expectedChunks.length);
          expect(index).to.equal(i);
          expect(payload.toString('utf-8')).to.equal(expectedChunks[i]);
          allPayloads.push(allPayloads);
        }
        // var reassembledBuffer = Buffer.concat(allPayloads);
        // expect(reassembledBuffer.toString('utf-8')).to.equal(message);
      }

      context("when the message length is lower than the chunk size", function () {
        beforeEach(function () {
          message = repeatString("A", chunkSize - 1);
          expectedChunks = ["AAAA"];
        });

        it("encodes the message and sends it as a single packet", function () {
          client().send(message);
          validateDatagrams();
        });
      });

      context("when the message length is larger than the chunk size", function () {
        beforeEach(function () {
          message = repeatString("A", chunkSize + 1);
          expectedChunks = ["AAAAA", "A"];
        });

        it("encodes the message and sends it as many packets", function () {
          client().send(message);
          validateDatagrams();
        });
      });

      context("when the message contains multi-byte encoded characters", function () {
        beforeEach(function () {
          message = "\u00E9ABCDEFGH";
          expectedChunks = ["\u00E9ABC", "DEFGH"];
        });

        it("encodes the message and sends it as many packets", function () {
          client().send(message);
          validateDatagrams();
        });
      });

    });

  });

});
