var murmur3 = require('node-murmur3');

module.exports.compute = function compute(buffer) {
  return murmur3.hash32(buffer)
}
