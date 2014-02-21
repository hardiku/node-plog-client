var murmurhash3 = require('murmurhash3');

module.exports.compute = function compute(buffer) {
  // This library will not accept a buffer.
  return murmurhash3.murmur32Sync(buffer.toString('utf-8'))
}
