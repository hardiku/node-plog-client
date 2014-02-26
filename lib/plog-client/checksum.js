var murmurhash3 = require('murmurhash3');

module.exports.compute = function compute(buffer) {
  // This library won't accept a binary buffer. The operation fails to produce
  // the expected checksum if the string isn't valid utf-8. This is a
  // limitation of the library and no usable workaround exists.
  return murmurhash3.murmur32Sync(buffer.toString('utf-8'))
}
