import { describe, it, expect } from 'vitest';
import { PollEngine } from '../src/polls.js';

describe('Cryptographic Interactive Poll Engine', () => {
  it('creates polls and casts unique votes per fingerprint', () => {
    const engine = new PollEngine();
    const poll = engine.createPoll('test-poll-1', 'What is your favorite crypto primitive?', [
      'ZK-SNARKs / BN254',
      'Ed25519 Curves',
      'TreeKEM MLS',
    ]);

    expect(poll.options.length).toBe(3);
    expect(poll.totalVotes).toBe(0);

    // Voter 1 votes for option 0
    const res1 = engine.castVote('test-poll-1', 'opt-0', 'fingerprint-alice');
    expect(res1).toBe(true);

    const updated = engine.getPoll('test-poll-1')!;
    expect(updated.totalVotes).toBe(1);
    expect(updated.options[0].voteCount).toBe(1);

    // Voter 1 changes vote to option 2
    const res2 = engine.castVote('test-poll-1', 'opt-2', 'fingerprint-alice');
    expect(res2).toBe(true);
    expect(updated.totalVotes).toBe(1); // total should still be 1!
    expect(updated.options[0].voteCount).toBe(0);
    expect(updated.options[2].voteCount).toBe(1);

    // Voter 2 votes for option 2
    engine.castVote('test-poll-1', 'opt-2', 'fingerprint-bob');
    expect(updated.totalVotes).toBe(2);
    expect(updated.options[2].voteCount).toBe(2);
  });
});
