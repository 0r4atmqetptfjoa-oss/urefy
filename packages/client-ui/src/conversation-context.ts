/** Context stays inside the authenticated, encrypted message body. Never index it publicly. */
export interface ConversationBranch {
  id: string;
  title: string;
  sourceMessageId: string;
  parentBranchId: string;
  createdBy: string;
  createdAt: number;
}

export interface MessageContext {
  branch?: ConversationBranch;
  replyToId?: string;
  reaction?: { messageId: string; emoji: string; active: boolean };
  readReceipt?: { messageIds: string[]; readAt: number };
}

export const MESSAGE_REACTIONS = ['👍', '❤️', '✅', '🤔'] as const;
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9:_-]{1,160}$/i.test(value);

export function validateMessageContext(context: MessageContext): void {
  if (!context || typeof context !== 'object') throw new Error('Invalid conversation context');
  if (context.replyToId !== undefined && !identifier(context.replyToId)) throw new Error('Invalid reply reference');
  const branch = context.branch;
  if (branch && (!identifier(branch.id) || branch.id === 'main' || !identifier(branch.sourceMessageId) ||
    !identifier(branch.parentBranchId) || branch.parentBranchId === branch.id || !identifier(branch.createdBy) ||
    typeof branch.title !== 'string' || !branch.title.trim() || branch.title.length > 80 ||
    !Number.isSafeInteger(branch.createdAt) || branch.createdAt < 0)) throw new Error('Invalid conversation branch');
  const reaction = context.reaction;
  if (reaction && (!identifier(reaction.messageId) || !MESSAGE_REACTIONS.includes(reaction.emoji as typeof MESSAGE_REACTIONS[number]) ||
    typeof reaction.active !== 'boolean')) throw new Error('Invalid message reaction');
  const readReceipt = context.readReceipt;
  if (readReceipt && (!Array.isArray(readReceipt.messageIds) || !readReceipt.messageIds.every(identifier) ||
    !Number.isSafeInteger(readReceipt.readAt) || readReceipt.readAt < 0)) throw new Error('Invalid read receipt context');
}

export function branchOf(message: { context?: MessageContext }): string {
  return message.context?.branch?.id || 'main';
}
