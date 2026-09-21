// ===========================================================================
// UREfy — PASS 9.1: SOCIAL GRAPH & SCENARIO REGISTRY
// Tracks progress against PASS 9.1 graph requirements:
//   - >= 30 comments/replies in central discussion thread
//   - >= 8 distinct participating agents
//   - >= 1 depth-3 reply chain & >= 3 branching subthreads
//   - >= 8 distinct agents discovering shared community
//   - >= 4 bilateral DM pairs (multiple messages both ways)
//   - >= 3 message-request flows
//   - >= 1 block flow (with post-block attempt)
//   - >= 1 mute flow
//   - >= 2 moderation report flows + UI moderator resolution
//   - >= 5 return-to-discussion paths
// ===========================================================================

import fs from 'node:fs';
import path from 'node:path';

const REGISTRY_FILE = 'd:/proiect site total/tmp/synthetic-beta-9.1/social-registry.json';

export function loadSocialRegistry() {
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    } catch {}
  }

  const initial = {
    centralDiscussionPostId: null,
    centralDiscussionTitle: 'Decentralized Social Networks: Can Sovereign Identity Replace Centralized Logins?',
    comments: [], // { id, parentId, authorHandle, agentId, text, depth, subthreadId }
    communityJoins: [], // { communityId, agentId, handle, discoveryPath }
    bilateralDMPairs: {}, // { 'pairKey': { agentA, agentB, messagesAtoB: [], messagesBtoA: [] } }
    messageRequests: [], // { senderId, receiverId, message, senderExpectation, receiverDiscovery, decision, senderResultState }
    blockFlows: [], // { blockerAgentId, blockedHandle, discoveredVia, postBlockAttemptStatus }
    muteFlows: [], // { muterAgentId, mutedHandle, discoveredVia }
    moderationReports: [], // { reportingAgentId, targetId, targetType, reason, details }
    moderatorActions: [], // { moderatorAgentId, targetId, actionTaken, outcomeVerified }
    returnToDiscussionAttempts: [], // { agentId, pathUsed, success, notes }
  };

  saveSocialRegistry(initial);
  return initial;
}

export function saveSocialRegistry(data) {
  const dir = path.dirname(REGISTRY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf8');
}
