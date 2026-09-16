import { describe, expect, it } from 'vitest';
import { branchOf, validateMessageContext, type MessageContext } from '../src/conversation-context.js';

const branch: NonNullable<MessageContext['branch']> = {
  id: 'branch_abc', title: 'Weekend plans', sourceMessageId: 'msg_1', parentBranchId: 'main',
  createdBy: 'owner_fp', createdAt: 1_700_000_000_000,
};

describe('conversation context validation', () => {
  it('accepts a valid branch, reply reference, and reaction', () => {
    expect(() => validateMessageContext({ branch, replyToId: 'msg_1', reaction: { messageId: 'msg_2', emoji: '👍', active: true } })).not.toThrow();
    expect(() => validateMessageContext({})).not.toThrow();
  });

  it('treats a plain message as the main branch', () => {
    expect(branchOf({})).toBe('main');
    expect(branchOf({ context: { branch } })).toBe('branch_abc');
  });

  it('rejects malformed branches so provenance cannot be forged structurally', () => {
    expect(() => validateMessageContext({ branch: { ...branch, id: 'main' } })).toThrow(/branch/);
    expect(() => validateMessageContext({ branch: { ...branch, parentBranchId: branch.id } })).toThrow(/branch/);
    expect(() => validateMessageContext({ branch: { ...branch, title: '   ' } })).toThrow(/branch/);
    expect(() => validateMessageContext({ branch: { ...branch, title: 'x'.repeat(81) } })).toThrow(/branch/);
    expect(() => validateMessageContext({ branch: { ...branch, createdAt: -1 } })).toThrow(/branch/);
    expect(() => validateMessageContext({ branch: { ...branch, sourceMessageId: 'has spaces' } })).toThrow(/branch/);
  });

  it('rejects unknown reactions and bad references', () => {
    expect(() => validateMessageContext({ reaction: { messageId: 'msg_1', emoji: '🔥', active: true } })).toThrow(/reaction/);
    expect(() => validateMessageContext({ replyToId: 'not valid!' })).toThrow(/reply/);
  });
});
