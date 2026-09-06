import { describe, it, expect } from 'vitest';
import { ZKRLN, Field, RLNShare } from '../../src/rln.js';

describe('Isolated Academic Shamir Polynomial Lagrange Interpolation Math', () => {
  function solveSecretFromShares(share1: RLNShare, share2: RLNShare): bigint {
    const x1 = BigInt('0x' + share1.x);
    const y1 = BigInt('0x' + share1.y);
    const x2 = BigInt('0x' + share2.x);
    const y2 = BigInt('0x' + share2.y);

    const dy = Field.sub(y2, y1);
    const dx = Field.sub(x2, x1);
    const a1 = Field.div(dy, dx);
    const a0 = Field.sub(y1, Field.mul(a1, x1));
    return a0;
  }

  it('correctly solves polynomial constant term a0 = f(0) from 2 distinct shares', () => {
    const userSecret = Field.hashToField('academic-polynomial-test-secret');
    const epoch = 'epoch_poly_01';

    const share1 = ZKRLN.createShare(userSecret, epoch, 'Payload Alpha');
    const share2 = ZKRLN.createShare(userSecret, epoch, 'Payload Beta');

    const recoveredA0 = solveSecretFromShares(share1, share2);
    expect(recoveredA0).toBe(Field.mod(userSecret));

    // Nullifier verification
    const recoveredNullifier = ZKRLN.computeNullifier(recoveredA0);
    expect(recoveredNullifier).toBe(share1.nullifier);
  });
});
