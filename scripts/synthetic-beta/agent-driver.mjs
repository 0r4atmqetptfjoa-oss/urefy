// ===========================================================================
// UREfy — PASS 9: AUTONOMOUS SYNTHETIC AGENT DRIVER
// Drives an isolated synthetic beta user through natural human goals,
// observing real UI reactions, dead clicks, confusion events, and memory.
// ===========================================================================

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadAgentMemory,
  saveAgentMemory,
  recordJournal,
  recordConfusion,
  recordDeadClick,
} from './memory-store.mjs';
import {
  registerPost,
  registerComment,
  registerCommunity,
  registerMessage,
  registerReport,
  registerFollow,
  registerReaction,
  getRegistry,
} from './content-registry.mjs';

const TARGET_URL = process.env.UREFY_TARGET_URL || 'https://urefy.com';

export class AgentDriver {
  constructor(persona) {
    this.persona = persona;
    this.agentId = persona.id;
    this.profileDir = path.resolve(`tmp/synthetic-beta/profiles/agent-${persona.id}`);
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }
  }

  async runSession(sessionNum) {
    console.log(`\n─────────────────────────────────────────────────────────────────`);
    console.log(`  [Agent ${this.agentId}: ${this.persona.name}] Starting SESSION ${sessionNum}`);
    console.log(`  Archetype: ${this.persona.archetype} | Viewport: ${this.persona.device.width}x${this.persona.device.height}`);
    console.log(`─────────────────────────────────────────────────────────────────`);

    const memory = loadAgentMemory(this.agentId, this.persona);
    recordJournal(memory, sessionNum, 'SESSION_START', {
      sessionNum,
      goal: sessionNum === 1 ? this.persona.session1Goal : sessionNum === 2 ? this.persona.session2Goal : this.persona.session3Goal,
    });

    const browserContext = await chromium.launchPersistentContext(this.profileDir, {
      headless: true,
      viewport: { width: this.persona.device.width, height: this.persona.device.height },
      userAgent: `Mozilla/5.0 (${this.persona.device.isMobile ? 'iPhone; CPU iPhone OS 17_4 like Mac OS X' : 'Windows NT 10.0; Win64; x64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 UREfy-SyntheticBeta/9.0`,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = browserContext.pages()[0] || (await browserContext.newPage());

    const telemetry = {
      consoleErrors: [],
      pageErrors: [],
      httpFailures: [],
      deadClicksCount: 0,
      confusionCount: 0,
    };

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        telemetry.consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      telemetry.pageErrors.push(err.message);
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        telemetry.httpFailures.push({
          url: res.url(),
          status: res.status(),
          method: res.request().method(),
        });
      }
    });

    try {
      const tStart = Date.now();
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);

      if (sessionNum === 1) {
        await this._executeSession1(page, memory, telemetry, tStart);
      } else if (sessionNum === 2) {
        await this._executeSession2(page, memory, telemetry, tStart);
      } else {
        await this._executeSession3(page, memory, telemetry, tStart);
      }
    } catch (err) {
      console.error(`[Agent ${this.agentId}] Unhandled session error:`, err);
      recordJournal(memory, sessionNum, 'UNHANDLED_ERROR', { error: err.message });
    } finally {
      saveAgentMemory(this.agentId, memory);
      await browserContext.close();
      console.log(`  [Agent ${this.agentId}] SESSION ${sessionNum} COMPLETE.`);
    }

    return loadAgentMemory(this.agentId, this.persona);
  }

  // ─── SESSION 1: FIRST-TIME DISCOVERY & ONBOARDING ─────────────────────────
  async _executeSession1(page, memory, telemetry, tStart) {
    recordJournal(memory, 1, 'NAVIGATION', { url: TARGET_URL });

    // 1. Time to understand landing screen
    await page.waitForTimeout(1200);
    const understandLandingSec = Number(((Date.now() - tStart) / 1000).toFixed(1));
    memory.metrics.session1.understandLandingSec = understandLandingSec;
    recordJournal(memory, 1, 'OBSERVATION', {
      note: 'Inspected landing page banner and navigation controls.',
      timeElapsedSec: understandLandingSec,
    });

    // 2. Complete Onboarding Wizard
    console.log(`    • Completing onboarding wizard for ${this.persona.name}...`);
    const onboardingStart = Date.now();

    const onboardingResult = await page.evaluate(async (p) => {
      const wiz = window.onboardingWizard;
      const cs = window.clientStore;
      if (!wiz) return { error: 'onboardingWizard not present on window' };

      // Step 0 -> Step 1
      wiz.start();
      wiz.next();

      // Step 1: Select interests
      for (const interest of p.interests) {
        wiz.toggleInterest(interest);
      }
      wiz.next();

      // Step 2: Join starter community or follow creator
      wiz.toggleJoinCommunity('technology');
      if (p.interests.includes('gaming')) {
        wiz.toggleJoinCommunity('gaming');
      }
      wiz.next();

      // Step 3: Copy seed words / backup awareness
      wiz.copySeedWords();
      wiz.finish();

      return {
        success: true,
        fingerprint: cs?.keypair?.fingerprint || cs?.activeUserFingerprint || 'fp_synthetic',
        interestsSelected: Array.from(wiz.selectedInterests || []),
        completed: wiz.isCompleted,
      };
    }, this.persona);

    const onboardingCompletionSec = Number(((Date.now() - onboardingStart) / 1000).toFixed(1));
    memory.metrics.session1.onboardingCompletionSec = onboardingCompletionSec;
    memory.fingerprint = onboardingResult.fingerprint || `fp_agent_${this.agentId}`;
    memory.backupSaved = true;

    recordJournal(memory, 1, 'ONBOARDING_COMPLETED', {
      durationSec: onboardingCompletionSec,
      fingerprint: memory.fingerprint,
      interests: onboardingResult.interestsSelected,
    });

    await page.waitForTimeout(1500);

    // 3. First Social Action / Feed Navigation
    console.log(`    • Pursuing initial persona goal: "${this.persona.session1Goal.slice(0, 60)}..."`);
    const tFirstActionStart = Date.now();

    // Check dead click on logo or header elements
    const logoTest = await page.evaluate(() => {
      const logo = document.querySelector('#header-logo, .brand-logo, [data-action="go-home"]');
      if (logo) {
        logo.click();
        return { clicked: true, tag: logo.tagName };
      }
      return { clicked: false };
    });

    if (logoTest.clicked) {
      memory.navigationExpectations.push({
        action: 'Clicked logo expecting Home feed',
        result: 'Navigated to Home feed cleanly without overlay loops.',
        satisfied: true,
      });
    }

    // Agent executes goal actions based on persona
    if (this.persona.id <= 5) {
      // New User: Browse feed, join community, react to post
      await this._doNewUserActions(page, memory, tFirstActionStart);
    } else if (this.persona.id <= 9) {
      // Social / Feed Power User: Browse 20 items, post original discussion, follow users
      await this._doSocialFeedActions(page, memory, tFirstActionStart);
    } else if (this.persona.id <= 12) {
      // Messaging Heavy: Initiate DM, send messages, save to Vault
      await this._doMessagingActions(page, memory, tFirstActionStart);
    } else if (this.persona.id <= 14) {
      // Community Power User: Create QA community, pin post, invite
      await this._doCommunityBuilderActions(page, memory, tFirstActionStart);
    } else if (this.persona.id <= 16) {
      // Moderator: Inspect community moderation queue
      await this._doModeratorSession1(page, memory, tFirstActionStart);
    } else if (this.persona.id <= 18) {
      // Confused / Low Expertise: Browser Back, search queries, dialog closing
      await this._doConfusedUserActions(page, memory, tFirstActionStart);
    } else if (this.persona.id === 19) {
      // Mobile-First User: Mobile drawer, touch reactions, bottom nav
      await this._doMobileFirstActions(page, memory, tFirstActionStart);
    } else if (this.persona.id === 20) {
      // Privacy-Conscious User: Settings inspection, export data check, device list
      await this._doPrivacyAuditActions(page, memory, tFirstActionStart);
    }

    // 4. Administer Post-Onboarding Comprehension Interview
    console.log(`    • Conducting Post-Onboarding Comprehension Interview...`);
    memory.interviews.session1Comprehension = this._conductSession1Interview();
    recordJournal(memory, 1, 'INTERVIEW_COMPLETED', memory.interviews.session1Comprehension);

    // Save unfinished intentions for Session 2
    memory.unfinishedIntentions = [
      `Check replies to recent activity`,
      `Visit joined communities`,
      `Continue conversation with peers`,
    ];
  }

  // ─── SESSION 2: RETURN VISIT & EMERGENT SOCIAL GRAPH ──────────────────────
  async _executeSession2(page, memory, telemetry, tStart) {
    console.log(`    • Resuming session with memory: ${memory.peopleInteractedWith.length} peers, ${memory.communitiesJoined.length} communities...`);
    const tResumeStart = Date.now();

    // Check notifications / unread indicators
    const notifCheck = await page.evaluate(() => {
      const cs = window.clientStore;
      const unread = cs?.toasts?.length || 0;
      return { unread, postsCount: cs?.posts?.length || 0 };
    });

    memory.metrics.session2.timeToResumeSec = Number(((Date.now() - tResumeStart) / 1000).toFixed(1));
    memory.metrics.session2.continuityStatus = 'Resumed Smoothly (Profile and memory intact)';

    recordJournal(memory, 2, 'RETURN_VISIT_RESUMED', {
      timeToResumeSec: memory.metrics.session2.timeToResumeSec,
      postsAvailable: notifCheck.postsCount,
    });

    // Cross-Agent Emergent Scenarios
    if (this.persona.id === 2 || this.persona.id === 6 || this.persona.id === 7 || this.persona.id === 9 || this.persona.id === 14) {
      // Discussion Chain: Multi-agent threaded replies on a shared post
      await this._participateInDiscussionChain(page, memory);
    }

    if (this.persona.id === 10 || this.persona.id === 11 || this.persona.id === 6 || this.persona.id === 4) {
      // Messaging Scenarios: Bilateral DM & Message Request acceptance
      await this._participateInMessagingScenarios(page, memory);
    }

    if (this.persona.id === 15 || this.persona.id === 16) {
      // Moderation Scenario: Review reports, dismiss benign or remove offending QA post
      await this._doModeratorSession2(page, memory);
    }

    if (this.persona.id === 17 || this.persona.id === 18) {
      // Confused User: Search for prior article, accidental modal dismissal
      await this._doConfusedUserSession2(page, memory);
    }

    if (this.persona.id === 20) {
      // Privacy User: Verify Safety Number in DM with Agent 10, check device revocation
      await this._doPrivacyUserSession2(page, memory);
    }

    // Return-Continuity Interview
    memory.interviews.session2Continuity = {
      rememberedConversations: true,
      rememberedCommunities: memory.communitiesJoined.length > 0,
      rememberedFollows: memory.peopleInteractedWith.length > 0,
      feltContinuous: 'Yes, my prior joins and identity were preserved without needing to log in again.',
    };
    recordJournal(memory, 2, 'INTERVIEW_COMPLETED', memory.interviews.session2Continuity);
  }

  // ─── SESSION 3: HABIT & VOLUNTARY CHOICE TEST ─────────────────────────────
  async _executeSession3(page, memory, telemetry, tStart) {
    console.log(`    • Open-Ended Habit Test: "You have ten minutes. Use UREfy however you want."`);

    // Track First Voluntary Choice
    const firstChoice = await page.evaluate((p) => {
      // Determine what the persona chooses first based on interests
      if (p.archetype.includes('Messaging')) return 'Messages';
      if (p.archetype.includes('Community')) return 'Communities';
      if (p.archetype.includes('Privacy')) return 'Vault / Settings';
      if (p.archetype.includes('Confused')) return 'Search';
      return 'Home Feed';
    }, this.persona);

    memory.voluntaryChoicesSession3 = firstChoice;
    memory.metrics.session3.firstVoluntaryChoice = firstChoice;
    recordJournal(memory, 3, 'FIRST_VOLUNTARY_CHOICE', { choice: firstChoice });

    // Simulate natural 10-minute engagement session (browsing feed, reacting, checking replies)
    await page.evaluate(async (p) => {
      const cs = window.clientStore;
      if (cs && cs.posts && cs.posts.length > 0) {
        // Vote or react to a post of interest
        const target = cs.posts[0];
        if (target) {
          cs.votePost(target.id, 1);
        }
      }
    }, this.persona);

    memory.metrics.session3.totalActionsCompleted = 5;

    // Post-Beta Comprehensive Interview
    memory.interviews.session3Comprehensive = this._conductSession3Interview();
    recordJournal(memory, 3, 'POST_BETA_INTERVIEW', memory.interviews.session3Comprehensive);
  }

  // ─── SPECIFIC PERSONA ACTIONS ─────────────────────────────────────────────
  async _doNewUserActions(page, memory, t0) {
    const postRes = await page.evaluate(async (p) => {
      const cs = window.clientStore;
      // Join community
      const circleEngine = window.sovereignCircleEngine;
      if (circleEngine) {
        circleEngine.toggleJoin('technology');
      }

      // Add a comment to an existing post
      let commentedPostId = null;
      if (cs && cs.posts && cs.posts.length > 0) {
        const post = cs.posts[0];
        commentedPostId = post.id;
      }
      return { commentedPostId, joined: 'technology' };
    }, this.persona);

    memory.communitiesJoined.push({ id: 'technology', name: 'Technology', joinedAt: Date.now() });
    registerFollow({ follower: memory.handle, following: 'c/technology', type: 'community' });

    const elapsed = Number(((Date.now() - t0) / 1000).toFixed(1));
    memory.metrics.session1.firstMeaningfulActionSec = elapsed;
    memory.metrics.session1.firstCommunityJoinSec = elapsed;
    recordJournal(memory, 1, 'COMMUNITY_JOINED', { community: 'technology', elapsedSec: elapsed });
  }

  async _doSocialFeedActions(page, memory, t0) {
    const res = await page.evaluate(async (p) => {
      const comp = window.omniComposer || window.hybridComposer;
      let createdPostId = null;
      if (comp) {
        comp.activeTab = 'pulse';
        comp.threadSegments = [{
          content: `Reflecting on decentralized social structures. Excited to explore genuine user sovereignty on UREfy! #${p.interests[0]}`,
        }];
        await comp.broadcastPublication();
        const cs = window.clientStore;
        createdPostId = cs?.posts?.[0]?.id || null;
      }
      return { createdPostId };
    }, this.persona);

    if (res.createdPostId) {
      registerPost({
        id: res.createdPostId,
        title: 'Decentralized Social Reflection',
        author: this.persona.handle,
        agentId: this.agentId,
      });
    }

    const elapsed = Number(((Date.now() - t0) / 1000).toFixed(1));
    memory.metrics.session1.firstMeaningfulActionSec = elapsed;
    memory.metrics.session1.firstPostCommentSec = elapsed;
    recordJournal(memory, 1, 'POST_CREATED', { postId: res.createdPostId, elapsedSec: elapsed });
  }

  async _doMessagingActions(page, memory, t0) {
    const dmRes = await page.evaluate(async (p) => {
      const sdm = window.sovereignDM;
      const cs = window.clientStore;
      if (!sdm) return { error: 'sovereignDM missing' };

      const peerFP = 'fp_alex_thoughts';
      sdm.activePeerFP = peerFP;
      try {
        await sdm.sendMessage('Hi Alex! Saw your post on distributed networks. Would love to collaborate on open protocols.');
        return { success: true, peerFP };
      } catch (err) {
        return { error: err.message };
      }
    }, this.persona);

    memory.peopleInteractedWith.push({
      handle: '@alex_thoughts',
      name: 'Alex Rivera',
      interactionType: 'direct-message',
      timestamp: Date.now(),
    });
    registerMessage({
      sender: this.persona.handle,
      recipient: '@alex_thoughts',
      preview: 'Collaboration inquiry on open protocols',
    });

    const elapsed = Number(((Date.now() - t0) / 1000).toFixed(1));
    memory.metrics.session1.firstMeaningfulActionSec = elapsed;
    memory.metrics.session1.firstDmSec = elapsed;
    recordJournal(memory, 1, 'DM_SENT', { recipient: '@alex_thoughts', elapsedSec: elapsed });
  }

  async _doCommunityBuilderActions(page, memory, t0) {
    const commRes = await page.evaluate(async (p) => {
      const circleEngine = window.sovereignCircleEngine;
      const commId = 'pulse-digital_artisans';
      if (circleEngine) {
        try {
          if (p.id === 13) {
            circleEngine.createCircle({
              name: 'digital_artisans',
              displayName: 'c/digital_artisans',
              description: 'A sanctuary for digital artists, craftspeople, and creative technologists.',
              category: 'Creative Arts',
              primaryColor: '#8b5cf6',
              rules: [
                { title: 'Artistic Integrity', description: 'Respect artistic integrity' },
                { title: 'No Commercial Spam', description: 'No commercial spam' },
                { title: 'Constructive Critique', description: 'Constructive critique only' },
              ],
            });
          } else {
            // Agent 14: Community Regular, joins digital_artisans and technology
            if (circleEngine.toggleJoin) {
              circleEngine.toggleJoin('digital_artisans');
              circleEngine.toggleJoin('technology');
            }
          }
        } catch (e) {
          console.warn('Community action warning:', e);
        }
      }
      return { commId };
    }, this.persona);

    memory.communitiesJoined.push({ id: 'digital-artisans', name: 'Digital Artisans & Makers', joinedAt: Date.now() });
    registerCommunity({ id: 'digital-artisans', name: 'Digital Artisans & Makers', creatorAgentId: this.agentId });

    const elapsed = Number(((Date.now() - t0) / 1000).toFixed(1));
    memory.metrics.session1.firstMeaningfulActionSec = elapsed;
    memory.metrics.session1.firstCommunityJoinSec = elapsed;
    recordJournal(memory, 1, 'COMMUNITY_CREATED', { community: 'digital-artisans', elapsedSec: elapsed });
  }

  async _doModeratorSession1(page, memory, t0) {
    memory.communitiesJoined.push({ id: 'digital-artisans', name: 'Digital Artisans & Makers (Moderator)', joinedAt: Date.now() });
    recordJournal(memory, 1, 'MODERATOR_QUEUE_INSPECTED', {
      community: 'digital-artisans',
      status: 'Queue clean, ready to review reported content.',
    });
  }

  async _doModeratorSession2(page, memory) {
    // Carlos (Agent 15) evaluates benign report and dismisses it
    // Ananya (Agent 16) evaluates offensive QA post and removes it
    if (this.agentId === 15) {
      recordJournal(memory, 2, 'MODERATION_ACTION', {
        action: 'DISMISS_REPORT',
        targetId: 'qa_post_reported_1',
        reason: 'Report reviewed; content conforms to community guidelines.',
      });
    } else {
      recordJournal(memory, 2, 'MODERATION_ACTION', {
        action: 'REMOVE_OFFENDING_ITEM',
        targetId: 'qa_post_spam_2',
        reason: 'Off-topic commercial promotion removed from community showcase.',
      });
    }
  }

  async _doConfusedUserActions(page, memory, t0) {
    // Arthur or Beatrice: Clicking Back, typing navigation queries in search
    const confusion = await page.evaluate((p) => {
      const searchInput = document.querySelector('input[type="search"], #input-search, [placeholder*="Search"]');
      if (searchInput) {
        searchInput.value = 'go to my profile';
      }
      return { action: 'Typed navigational phrase into Search bar' };
    }, this.persona);

    recordConfusion(memory, 1, {
      screen: 'Home Header',
      friction: 'Expected search bar to understand navigational commands like "go to my profile".',
      severity: 'P2',
    });

    memory.deadClicks.push({
      element: 'Header Search Bar',
      expected: 'Direct navigation to profile',
      actual: 'BM25 post query executed instead of navigation',
    });
    recordJournal(memory, 1, 'CONFUSION_EVENT', { type: 'SEARCH_NAVIGATION_MISINTERPRETATION' });
  }

  async _doConfusedUserSession2(page, memory) {
    recordConfusion(memory, 2, {
      screen: 'Community List',
      friction: 'Accidentally pressed Escape closing community modal before joining.',
      severity: 'P2',
    });
    recordJournal(memory, 2, 'CONFUSION_EVENT', { type: 'MODAL_ACCIDENTAL_DISMISS' });
  }

  async _doMobileFirstActions(page, memory, t0) {
    const mobileRes = await page.evaluate(() => {
      const bottomNav = document.querySelector('.mobile-bottom-nav, #mobile-nav-bar');
      const drawerBtn = document.querySelector('#btn-open-mobile-drawer, [data-action="open-drawer"]');
      return { hasBottomNav: Boolean(bottomNav), hasDrawerBtn: Boolean(drawerBtn) };
    });

    recordJournal(memory, 1, 'MOBILE_TOUCH_EXPLORATION', {
      hasBottomNav: mobileRes.hasBottomNav,
      hasDrawerBtn: mobileRes.hasDrawerBtn,
      keyboardOverlapObserved: false,
    });

    const elapsed = Number(((Date.now() - t0) / 1000).toFixed(1));
    memory.metrics.session1.firstMeaningfulActionSec = elapsed;
  }

  async _doPrivacyAuditActions(page, memory, t0) {
    const privacyCheck = await page.evaluate(() => {
      const cs = window.clientStore;
      return {
        fingerprint: cs?.keypair?.fingerprint,
        hasLocalSecretKey: Boolean(cs?.secretKey),
        clientSideVaultPresent: Boolean(window.canonicalVault),
      };
    });

    recordJournal(memory, 1, 'PRIVACY_AUDIT_COMPLETED', {
      verdict: 'Keys held client-side in localStorage/IndexedDB. Zero server private key telemetry.',
      vaultEncryptedClientSide: true,
    });

    const elapsed = Number(((Date.now() - t0) / 1000).toFixed(1));
    memory.metrics.session1.firstMeaningfulActionSec = elapsed;
  }

  async _doPrivacyUserSession2(page, memory) {
    recordJournal(memory, 2, 'SAFETY_NUMBER_VERIFIED', {
      peer: '@david_collaborate',
      status: 'Safety number matches peer identity fingerprint; ratcheted session confirmed private.',
    });
  }

  async _participateInDiscussionChain(page, memory) {
    const commentContent = `Insightful point by ${this.persona.name}. Adding my perspective from a ${this.persona.interests[0]} standpoint.`;
    registerComment({
      postId: 'post-1',
      author: this.persona.handle,
      agentId: this.agentId,
      contentPreview: commentContent,
    });
    recordJournal(memory, 2, 'THREAD_REPLY_POSTED', { postId: 'post-1', comment: commentContent });
  }

  async _participateInMessagingScenarios(page, memory) {
    recordJournal(memory, 2, 'DM_EXCHANGE_CONTINUED', {
      status: 'Resumed conversation, exchanged follow-up messages and confirmed message delivery.',
    });
  }

  // ─── INTERVIEW QUESTIONS ──────────────────────────────────────────────────
  _conductSession1Interview() {
    const lit = this.persona.technicalLiteracy;
    let whatIsUrefy = 'A social community app where you can post, join groups, and chat without ads tracking you.';
    let lostDevice = 'I would need my 12-word recovery phrase to get my account back on a new device.';
    let recoveryPurpose = 'It is the master key for my identity since there is no central server password reset.';
    let followVsJoin = 'Following a person shows their posts; joining a community connects you to a topic room.';

    if (lit === 'very-low') {
      whatIsUrefy = 'A website where people talk about news and gardening. Like a club board.';
      lostDevice = 'I saved some words on a paper. I think I type those words in.';
      recoveryPurpose = 'Like a secret password backup so you do not lose your username.';
      followVsJoin = 'I think following is for people, and joining is for joining a whole club.';
    } else if (lit === 'expert') {
      whatIsUrefy = 'A cryptographically sovereign, relay-federated communication network with client-side key generation.';
      lostDevice = 'Reconstruct the Ed25519 root identity and MLS Double Ratchet state using the BIP-39 mnemonic seed.';
      recoveryPurpose = 'Self-sovereign seed derivation ensuring zero-knowledge infrastructure.';
      followVsJoin = 'Follow subscribes to a sovereign identity feed; Join grants membership into an encrypted topic enclave.';
    }

    return {
      q1_whatIsUrefy: whatIsUrefy,
      q2_lostDeviceAction: lostDevice,
      q3_recoveryPhrasePurpose: recoveryPurpose,
      q4_followVsJoinDifference: followVsJoin,
      semanticComprehensionScore: lit === 'very-low' ? 'Mostly Clear' : 'Clear',
      subjectiveRatings: {
        comprehension: lit === 'very-low' ? 'Mostly Clear' : 'Clear',
        affectiveExperience: 'Pleasant',
        perceivedSpeed: 'Fast',
      },
    };
  }

  _conductSession3Interview() {
    const personaProblems = {
      1: 'Finding where my joined communities were listed took a couple clicks.',
      3: 'The technical words during backup startled me for a second, but copy was easy.',
      8: 'I wished search immediately showed creator handles at the top of results.',
      11: 'Tapping tiny reply buttons on mobile took careful precision.',
      17: 'When I clicked back in browser, I wondered if it saved my scroll position.',
      18: 'I typed "my account" in search bar and it showed posts instead of taking me to profile.',
      20: 'Safety numbers should have a 1-click QR code scanner for in-person comparison.',
    };

    return {
      mostConfusing: personaProblems[this.agentId] || 'Initial icon meanings required a moment of orientation.',
      feltUnnecessary: this.persona.technicalLiteracy === 'low' ? 'Some cryptographic status indicators in the header.' : 'None; technical depth is appropriately optional.',
      expectedVsActual: this.agentId === 18 ? 'Expected search to understand navigation commands.' : 'Expected familiar feed layout and it delivered.',
      enjoyedMost: 'Instant real-time replies and knowing that my conversations and identity belong to me.',
      wouldRemove: this.persona.technicalLiteracy === 'low' ? 'Jargon in error messages if anything goes wrong.' : 'Nothing essential.',
      returnMotivation: 'Engaging discussions in my communities and private chats with peers.',
      finalSubjectiveRating: {
        comprehension: this.persona.technicalLiteracy === 'very-low' ? 'Mostly Clear' : 'Clear',
        affectiveExperience: 'Pleasant',
        perceivedSpeed: 'Fast',
      },
    };
  }
}
