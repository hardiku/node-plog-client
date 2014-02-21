var protocolVersion = 0,
    packetType = 1;

module.exports = {
  // constants
  protocolVersion: protocolVersion,
  packetType: packetType,
  // methods
  encode: encode
}

function encode(messageId, length, checksum, chunkSize, count, index, payload) {
    var buf = new Buffer(payload.length + 24);
    // Write the header.
    buf.writeUInt8(    protocolVersion,  0 ); // 00
    buf.writeUInt8(    packetType,       1 ); // 01
    buf.writeUInt16BE( count,            2 ); // 02-03
    buf.writeUInt16BE( index,            4 ); // 04-05
    buf.writeUInt16BE( chunkSize,        6 ); // 06-07
    buf.writeUInt32BE( messageId,        8 ); // 08-11
    buf.writeInt32BE(  length,          12 ); // 12-15
    buf.writeUInt32BE( checksum,        16 ); // 16-19
    buf.writeUInt32BE( 0,               20 ); // 20-23
    // Write the chunk payload.
    payload.copy(buf, 24);
    return buf;
}
