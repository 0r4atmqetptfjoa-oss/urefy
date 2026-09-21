// ===========================================================================
// UREfy — PASS 9: SYNTHETIC CLOSED BETA WAVE ORCHESTRATOR
// Executes longitudinal session waves across all 20 autonomous personas:
//   Wave 1: Session 1 (First-Time Discovery & Onboarding)
//   Wave 2: Session 2 (Return Visit & Emergent Social Graph)
//   Wave 3: Session 3 (Habit & Voluntary Choice Test)
// ===========================================================================

import { PERSONAS } from './personas.mjs';
import { AgentDriver } from './agent-driver.mjs';
import { loadAgentMemory } from './memory-store.mjs';
import { getRegistry } from './content-registry.mjs';

const waveArg = process.argv.find((a) => a.startsWith('--wave='));
const targetWave = waveArg ? parseInt(waveArg.split('=')[1], 10) : 1;

const agentArg = process.argv.find((a) => a.startsWith('--agent='));
const targetAgentId = agentArg ? parseInt(agentArg.split('=')[1], 10) : null;

console.log('═══════════════════════════════════════════════════════════════════');
console.log(`  UREfy — PASS 9: 20-AGENT SYNTHETIC CLOSED BETA (WAVE ${targetWave})`);
console.log(`  Target Origin: ${process.env.UREFY_TARGET_URL || 'https://urefy.com'}`);
console.log(`  Total Personas: ${PERSONAS.length}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

async function runBetaWave(waveNum) {
  const personasToRun = targetAgentId
    ? PERSONAS.filter((p) => p.id === targetAgentId)
    : PERSONAS;

  const results = [];
  const startTime = Date.now();

  for (const persona of personasToRun) {
    const driver = new AgentDriver(persona);
    try {
      const memory = await driver.runSession(waveNum);
      results.push({ persona, memory });
    } catch (err) {
      console.error(`[Orchestrator] Error running Agent ${persona.id}:`, err);
      results.push({ persona, error: err.message });
    }
  }

  const totalDurationSec = Number(((Date.now() - startTime) / 1000).toFixed(1));

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`  WAVE ${waveNum} EXECUTION SUMMARY (${personasToRun.length} Agents, ${totalDurationSec}s)`);
  console.log('═══════════════════════════════════════════════════════════════════');

  if (waveNum === 1) {
    // Wave 1 Analysis
    const avgLanding = (results.reduce((acc, r) => acc + (r.memory?.metrics?.session1?.understandLandingSec || 0), 0) / results.length).toFixed(1);
    const avgOnboarding = (results.reduce((acc, r) => acc + (r.memory?.metrics?.session1?.onboardingCompletionSec || 0), 0) / results.length).toFixed(1);
    const avgFirstAction = (results.reduce((acc, r) => acc + (r.memory?.metrics?.session1?.firstMeaningfulActionSec || 0), 0) / results.length).toFixed(1);

    console.log(`\n  Timing Averages (Session 1):`);
    console.log(`    • Time to Understand Landing:         ~${avgLanding}s`);
    console.log(`    • Time to Complete Onboarding Wizard: ~${avgOnboarding}s`);
    console.log(`    • Time to First Meaningful Action:    ~${avgFirstAction}s`);

    const allDeadClicks = results.flatMap((r) => r.memory?.deadClicks || []);
    const allConfusions = results.flatMap((r) => r.memory?.confusionsEncountered || []);

    console.log(`\n  Friction & Telemetry:`);
    console.log(`    • Total Dead Clicks Observed:         ${allDeadClicks.length}`);
    console.log(`    • Total Confusion Events Recorded:    ${allConfusions.length}`);

    console.log(`\n  Top Observed Friction Points:`);
    if (allConfusions.length > 0) {
      for (const c of allConfusions) {
        console.log(`    [${c.severity || 'P2'}] ${c.screen}: ${c.friction}`);
      }
    } else {
      console.log('    • None: Smooth onboarding across all 20 synthetic agents.');
    }
  } else if (waveNum === 2) {
    // Wave 2 Analysis
    const registry = getRegistry();
    console.log(`\n  Emergent Social Graph Progress:`);
    console.log(`    • Posts Registered:         ${registry.posts.length}`);
    console.log(`    • Comments / Replies:       ${registry.comments.length}`);
    console.log(`    • Communities Formed:       ${registry.communities.length}`);
    console.log(`    • Direct Message Exchanges: ${registry.messages.length}`);
    console.log(`    • Moderation Reports:       ${registry.reports.length}`);
    console.log(`    • Community Follows:        ${registry.follows.length}`);
  } else if (waveNum === 3) {
    // Wave 3 Analysis
    console.log(`\n  Voluntary First Choices (Session 3 Habit Test):`);
    const choices = {};
    for (const r of results) {
      const choice = r.memory?.voluntaryChoicesSession3 || 'Unknown';
      choices[choice] = (choices[choice] || 0) + 1;
    }
    for (const [k, v] of Object.entries(choices)) {
      console.log(`    • ${k.padEnd(22)}: ${v} agents`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════\n');
  return results;
}

runBetaWave(targetWave)
  .then(() => {
    console.log(`Wave ${targetWave} completed successfully.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`Wave ${targetWave} failed:`, err);
    process.exit(1);
  });
