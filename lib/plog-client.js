var packets  = require('./plog-client/packets'),
    checksum = require('./plog-client/checksum'),
    dgram    = require('dgram');

module.exports = PlogClient;

var messageIdCeiling = Math.pow(2, 32);

function PlogClient(options) {
  this.options = options || {};

  this.host = this.options.host || '127.0.0.1';
  this.port = this.options.port || 23456;
  this.chunkSize = this.options.chunkSize || 64000;
  this.logger = this.options.logger || console;
  this.verbose = this.options.verbose || false;

  this.socket = this.options.socket || null;
  this.lastMessageId = Math.floor(Math.random() * messageIdCeiling);
}

PlogClient.prototype.send = function (message) {
  // Coerce non-buffers to buffers via toString.
  if (!Buffer.isBuffer(message)) {
    message = new Buffer(message == null ? '' : message.toString());
  }

  var messageId = this._nextMessageId(),
      messageChecksum = checksum.compute(message),
      chunks = this._chunkBuffer(message, this.chunkSize);

  if (this.verbose) {
    this.logger.info("Plog: sending (" + messageId + "; " + chunks.length + " chunk(s))")
  }

  for (var index = 0; index < chunks.length; index++) {
    this._sendToSocket(
      packets.FragmentedMessage.encode(
        messageId,
        message.length,
        messageChecksum,
        this.chunkSize,
        chunks.length,
        index,
        chunks[index]
      )
    )
  }

  return messageId;
};

PlogClient.prototype._nextMessageId = function () {
  this.lastMessageId += 1;
  this.lastMessageId %= messageIdCeiling;
  return this.lastMessageId;
}

PlogClient.prototype._chunkBuffer = function(buffer, chunkSize) {
  var chunks = [];
  for (var offset = 0; offset < buffer.length; offset += chunkSize) {
    chunks.push(buffer.slice(offset, offset + chunkSize));
  }
  return chunks;
}

PlogClient.prototype._sendToSocket = function(buffer) {
  if (this.verbose) {
    this.logger.info("Plog: writing to socket: " + this._bufferToHex(buffer))
  }

  this._getSocket().send(
    buffer,
    0,
    buffer.length,
    this.port,
    this.host
  );
}

PlogClient.prototype._getSocket = function () {
  if (!this.socket) {
    this.socket = dgram.createSocket('udp4');
    // When an exception is raised, discard the socket.
    var _this = this;
    this.socket.once('error', function (err) {
      _this.logger.error("Plog: Socket error: " + err);
      _this.closeSocket();
    });
  }
  return this.socket
}

PlogClient.prototype._closeSocket = function () {
  if (this.socket) {
    this.socket.close();
    this.socket = null;
  }
}

PlogClient.prototype._bufferToHex = function (buffer) {
  var string = '';
  for (var i = 0; i < buffer.length; i++) {
    if (i != 0) string += ' ';
    var hex = buffer[i].toString(16);
    if (hex.length == 1) hex = "0" + hex;
    string += hex;
  }
  return string;
}
