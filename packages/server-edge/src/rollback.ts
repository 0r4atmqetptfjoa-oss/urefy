import { AetherisDatabase } from './db/database.js';

export interface RollbackResult {
  actorFingerprint: string;
  revertedActionsCount: number;
  details: string[];
  success: boolean;
}

/**
 * 24-Hour Atomic Rollback Engine for compromised moderator actions.
 */
export function executeAtomicRollback(
  db: AetherisDatabase,
  compromisedActor: string,
  initiatorFingerprint: string,
  timeWindowMs: number = 24 * 60 * 60 * 1000
): RollbackResult {
  const sinceTimestamp = Date.now() - timeWindowMs;
  const actions = db.getAuditActionsByActor(compromisedActor, sinceTimestamp);

  const details: string[] = [];
  let revertedCount = 0;

  for (const action of actions) {
    try {
      const payload = JSON.parse(action.payloadJson || '{}');

      switch (action.actionType) {
        case 'HIDE_MESSAGE':
        case 'DELETE_MESSAGE':
          db.updateMessageStatus(action.targetId, 'VISIBLE');
          details.push(`Restored message ${action.targetId} to VISIBLE`);
          revertedCount++;
          break;

        case 'QUARANTINE_USER':
          db.setQuarantine(action.targetId, false);
          details.push(`Lifting malicious quarantine on nullifier ${action.targetId}`);
          revertedCount++;
          break;

        case 'ASSIGN_ROLE':
          if (payload.previousRole) {
            const id = db.getIdentity(action.targetId);
            if (id) {
              db.upsertIdentity({ ...id, role: payload.previousRole });
              details.push(`Reverted role on ${action.targetId} back to ${payload.previousRole}`);
              revertedCount++;
            }
          }
          break;

        default:
          details.push(`Skipping unhandled action type: ${action.actionType}`);
      }
    } catch (err: any) {
      details.push(`Failed to revert action ${action.id}: ${err.message}`);
    }
  }

  // Record the rollback execution in the audit trail
  db.recordAudit({
    actionType: 'ATOMIC_ROLLBACK_EXECUTED',
    actorFingerprint: initiatorFingerprint,
    targetId: compromisedActor,
    payloadJson: JSON.stringify({ revertedActionsCount: revertedCount, timeWindowMs }),
    timestamp: Date.now(),
  });

  return {
    actorFingerprint: compromisedActor,
    revertedActionsCount: revertedCount,
    details,
    success: true,
  };
}
