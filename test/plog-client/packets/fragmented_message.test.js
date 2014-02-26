var chai = require('chai'),
    expect = chai.expect,
    packets = require('../../../lib/plog-client/packets');

describe('FragmentedMessage', function () {
  describe('encode', function () {
    var messageId, length, checksum, chunkSize, count, index, payload;

    beforeEach(function () {
      messageId = 1;
      length    = 2;
      checksum  = 3;
      chunkSize = 4;
      count     = 5;
      index     = 6;
      payload   = new Buffer([7, 8, 9]);
    });

    function encoded () {
      return packets.FragmentedMessage.encode(
        messageId,
        length,
        checksum,
        chunkSize,
        count,
        index,
        payload
      );
    }

    function encoded_range (first, last) {
      var result = encoded();
      // Slice the requested range and return as integer bytes.
      range = [];
      for (var i = first; i <= last; i++) {
        range.push(result[i]);
      }
      return range;
    }


    it("encodes a string with length 24 + payload length", function () {
      expect(encoded().length).to.equal(24 + payload.length);
    });

    it("encodes the protocol version as the first byte", function () {
      expect(encoded_range(0, 0)).to.eql([packets.FragmentedMessage.protocolVersion]);
    });

    it("encodes the command as the second byte", function () {
      expect(encoded_range(1, 1)).to.eql([packets.FragmentedMessage.packetType]);
    });

    it("encodes the multipart packet count big endian as bytes 02-03", function () {
      expect(encoded_range(2, 3)).to.eql([0, count]);
    });

    it("encodes the multipart packet index big endian as bytes 04-05", function () {
      expect(encoded_range(4, 5)).to.eql([0, index]);
    });

    it("encodes the chunk size big endian as bytes 06-07", function () {
      expect(encoded_range(6, 7)).to.eql([0, chunkSize]);
    });

    it("encodes the message id big endian as bytes 08-11", function () {
      expect(encoded_range(8, 11)).to.eql([0, 0, 0, messageId]);
    });

    it("encodes the total message length as bytes 12-15", function () {
      expect(encoded_range(12, 15)).to.eql([0, 0, 0, length]);
    });

    it("encodes the message checksum as bytes 16-19", function () {
      expect(encoded_range(16, 19)).to.eql([0, 0, 0, checksum]);
    });

    it("encodes zero padding for the reserved segment as bytes 20-23", function () {
      expect(encoded_range(20, 23)).to.eql([0, 0, 0, 0]);
    });

    it("copys the payload to the end of the header", function () {
      expect(encoded_range(24, 26)).to.eql([7, 8, 9]);
    });

  });
});
