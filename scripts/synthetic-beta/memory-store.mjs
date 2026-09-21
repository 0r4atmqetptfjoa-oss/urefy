// ===========================================================================
// UREfy — PASS 9: AGENT MEMORY STORE
// Provides isolated, persistent cross-session memory for each synthetic agent.
// Stored strictly in tmp/synthetic-beta/memory/agent-<id>.json
// Strictly omits sensitive cryptographic keys / recovery phrase plaintext.
// ===========================================================================

import fs from 'node:fs';
import path from 'node:path';

const MEMORY_DIR = path.resolve('tmp/synthetic-beta/memory');

function ensureDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

export function getMemoryPath(agentId) {
  ensureDir();
  return path.join(MEMORY_DIR, `agent-${agentId}.json`);
}

export function loadAgentMemory(agentId, persona) {
  const filePath = getMemoryPath(agentId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch (err) {
      console.warn(`[MemoryStore] Warning: Could not parse memory for agent ${agentId}, initializing fresh.`);
    }
  }

  // Initialize fresh memory
  const initial = {
    agentId,
    name: persona?.name || `Agent ${agentId}`,
    handle: persona?.handle || `@agent_${agentId}`,
    archetype: persona?.archetype || 'Beta User',
    device: persona?.device?.name || 'Desktop',
    fingerprint: null,
    backupSaved: false,
    peopleInteractedWith: [],
    communitiesJoined: [],
    contentLiked: [],
    contentSaved: [],
    unfinishedIntentions: [],
    confusionsEncountered: [],
    deadClicks: [],
    navigationExpectations: [],
    journal: [],
    interviews: {
      session1Comprehension: null,
      session2Continuity: null,
      session3Comprehensive: null,
    },
    voluntaryChoicesSession3: null,
    metrics: {
      session1: {
        understandLandingSec: null,
        onboardingCompletionSec: null,
        firstMeaningfulActionSec: null,
        firstSocialConnectionSec: null,
        firstCommunityJoinSec: null,
        firstPostCommentSec: null,
        firstDmSec: null,
      },
      session2: {
        timeToResumeSec: null,
        continuityStatus: null,
      },
      session3: {
        firstVoluntaryChoice: null,
        totalActionsCompleted: 0,
      },
    },
  };

  saveAgentMemory(agentId, initial);
  return initial;
}

export function saveAgentMemory(agentId, memory) {
  ensureDir();
  const filePath = getMemoryPath(agentId);
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), 'utf8');
}

export function recordJournal(memory, sessionNum, eventType, details) {
  const entry = {
    session: sessionNum,
    timestamp: Date.now(),
    isoTime: new Date().toISOString(),
    type: eventType,
    details,
  };
  memory.journal.push(entry);
  return entry;
}

export function recordConfusion(memory, sessionNum, confusion) {
  memory.confusionsEncountered.push({
    session: sessionNum,
    timestamp: Date.now(),
    ...confusion,
  });
}

export function recordDeadClick(memory, sessionNum, deadClick) {
  memory.deadClicks.push({
    session: sessionNum,
    timestamp: Date.now(),
    ...deadClick,
  });
}
