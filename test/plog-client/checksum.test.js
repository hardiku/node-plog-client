var chai = require('chai'),
    expect = chai.expect,
    Checksum = require('../../lib/plog-client/checksum');

describe('Checksum', function () {
  describe('compute', function () {

    context('when the buffer contains a valid utf-8 string', function () {
      var buffer = new Buffer('utf8-string', 'utf-8'),
          expected = 1200192782;

      it('computes the correct checksum', function () {
        expect(Checksum.compute(buffer)).to.equal(expected);
      });
    });

    context('when the buffer contains an invalid utf-8 sequence', function () {
      var buffer = new Buffer([0xC2]),
          expected = 270853570;

      it('computes the correct checksum', function () {
        expect(Checksum.compute(buffer)).to.equal(expected);
      });
    });

    context('when the hash would be greater than 2^31', function () {
      var buffer = new Buffer('95dfa7c4-307b-4a88-8739-4801f09b2d04', 'utf-8'),
          expected = 3557673916;

      it('computes the correct checksum', function () {
        expect(Checksum.compute(buffer)).to.equal(expected);
      });
    });

  });
});
