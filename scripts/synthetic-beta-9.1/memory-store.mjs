// ===========================================================================
// UREfy — PASS 9.1: ISOLATED AGENT MEMORY STORE
// Strictly isolated per-agent memory on disk.
// Evaluator receives ONLY what the agent actually saw, did, and remembered.
// Zero knowledge leakage across agents or from product specifications.
// ===========================================================================

import fs from 'node:fs';
import path from 'node:path';

const MEMORY_BASE_DIR = 'd:/proiect site total/tmp/synthetic-beta-9.1/memory';

export function getMemoryPath(agentId) {
  return path.join(MEMORY_BASE_DIR, `agent-${agentId}.json`);
}

export function loadAgentMemory(agentId, persona) {
  if (!fs.existsSync(MEMORY_BASE_DIR)) {
    fs.mkdirSync(MEMORY_BASE_DIR, { recursive: true });
  }

  const filePath = getMemoryPath(agentId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch {
      // Corrupt fallback
    }
  }

  const initial = {
    agentId,
    name: persona.name,
    handle: persona.handle,
    archetype: persona.archetype,
    device: persona.device,
    viewport: persona.viewport,
    technicalLiteracy: persona.technicalLiteracy,
    fingerprint: null,
    backupConfirmed: false,
    peopleInteractedWith: [],
    communitiesJoined: [],
    contentLiked: [],
    contentSaved: [],
    conversationsActive: [],
    blockedUsers: [],
    mutedUsers: [],
    reportedItems: [],
    unfinishedIntentions: [],
    confusionsEncountered: [],
    deadClicks: [],
    hesitations: [],
    backtracks: [],
    abandonedTasks: [],
    voluntaryChoicesSession3: null,
    journal: [],
    interviews: {
      session1RecoveryComprehension: null,
      session1PasskeyQuestion: null,
      session1CommunityVsFollowTest: null,
      session2Continuity: null,
      session2ReturnToDiscussion: null,
      session3VoluntaryChoice: null,
      session3Comprehensive: null,
    },
    metrics: {
      session1: {
        automationExecutionTimeSec: 0,
        interactionDecisionTimeSec: 0,
        understandLandingSec: 0,
        onboardingCompletionSec: 0,
        firstMeaningfulActionSec: 0,
      },
      session2: {
        automationExecutionTimeSec: 0,
        interactionDecisionTimeSec: 0,
        timeToResumeSec: 0,
        returnToDiscussionPath: null,
        returnToDiscussionSuccess: false,
      },
      session3: {
        automationExecutionTimeSec: 0,
        interactionDecisionTimeSec: 0,
        firstVoluntaryChoice: null,
        totalActionsCompleted: 0,
      },
    },
  };

  saveAgentMemory(agentId, initial);
  return initial;
}

export function saveAgentMemory(agentId, memory) {
  if (!fs.existsSync(MEMORY_BASE_DIR)) {
    fs.mkdirSync(MEMORY_BASE_DIR, { recursive: true });
  }
  const filePath = getMemoryPath(agentId);
  fs.writeFileSync(filePath, JSON.stringify(memory, null, 2), 'utf8');
}

export function recordJournal(memory, sessionNum, entry) {
  memory.journal.push({
    session: sessionNum,
    timestamp: Date.now(),
    isoTime: new Date().toISOString(),
    ...entry,
  });
  saveAgentMemory(memory.agentId, memory);
}
