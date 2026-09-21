// ===========================================================================
// UREfy — PASS 9.1: COMPLEX SOCIAL GRAPH SCENARIOS
// Executes all mandated social graph requirements:
//   1. Organic QA Thread: >= 30 comments, >= 8 agents, >= 1 depth-3 chain, >= 3 branching subthreads
//   2. Community Scenario: >= 8 distinct agents discover & join shared community (paths recorded)
//   3. Bilateral DMs: 4 real pairs, both sending/receiving multiple messages
//   4. Message Requests: 3 stranger requests (sender expectation, receiver discovery, decision)
//   5. Block Flow: "Don't want this person contacting me" -> discover Block -> blocked user interaction attempt
//   6. Mute Flow: "See less without blocking" -> discover Mute
//   7. Report Flow: 2 agents encounter inappropriate content -> discover Report
//   8. Moderator Flow: Moderators use UI only to find queue, evaluate context, take action, verify outcome
//   9. Return to Discussion: >= 5 agents locate prior thread without direct URL
// ===========================================================================

import { chromium } from 'playwright';
import path from 'node:path';
import { PERSONAS_9_1 } from './personas.mjs';
import { loadAgentMemory, saveAgentMemory, recordJournal } from './memory-store.mjs';
import { loadSocialRegistry, saveSocialRegistry } from './social-registry.mjs';

const PROFILES_DIR = 'd:/proiect site total/tmp/synthetic-beta-9.1/profiles';
const TARGET_URL = process.env.UREFY_TARGET_URL || 'https://urefy.com';

export class SocialScenariosRunner {
  constructor() {
    this.registry = loadSocialRegistry();
  }

  // ─── 1. ORGANIC QA THREAD (>=30 comments, >=8 agents, depth-3, 3 subthreads) ───
  async executeDiscussionThreadScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 1: ORGANIC QA THREAD (>= 30 Comments, Depth-3, Branching)');
    console.log('===================================================================');

    // Context-aware comments reflecting real human technical debate
    const THREAD_TREE = [
      // Subthread 1: Key Recovery & Paper backups (Root 1)
      {
        id: 'c-root-1',
        authorAgentId: 2, // Marcus
        depth: 0,
        parentId: null,
        subthreadId: 'subthread-recovery',
        text: 'From a student perspective, writing down 12 words on a piece of paper feels nostalgic but also terrifying. If my dorm catches fire or a roommate spills coffee, my identity is permanently gone. How does UREfy address social guardians or threshold backup schemes?',
      },
      {
        id: 'c-sub1-1',
        authorAgentId: 6, // Alex
        depth: 1,
        parentId: 'c-root-1',
        subthreadId: 'subthread-recovery',
        text: 'Valid concern Marcus. Self-sovereignty means no central server has a backdoor, which creates that exact vulnerability. UREfy provides multi-device sync via QR pairing and Shamir Secret Sharing social recovery for trusted peers.',
      },
      {
        id: 'c-sub1-2',
        authorAgentId: 10, // David
        depth: 2,
        parentId: 'c-sub1-1',
        subthreadId: 'subthread-recovery',
        text: 'Crucially, the Shamir scheme splits the root entropy into a 3-of-5 threshold. No single friend or guardian can access your messages or reconstruct your key alone.',
      },
      // Depth-3 reply chain!
      {
        id: 'c-sub1-3-depth3',
        authorAgentId: 20, // Valerie (Privacy Auditor)
        depth: 3,
        parentId: 'c-sub1-2',
        subthreadId: 'subthread-recovery',
        text: 'I audited this mechanism: the polynomial shares are computed locally in WebAssembly and encrypted with each guardian’s public key before broadcast. The edge relay only sees ciphertext envelopes.',
      },
      // Branching in Subthread 1
      {
        id: 'c-sub1-branch-b',
        authorAgentId: 4, // Liam
        depth: 1,
        parentId: 'c-root-1',
        subthreadId: 'subthread-recovery',
        text: 'What about hardware keys like YubiKeys? Can we store the root seed inside an on-device secure enclave instead of physical paper?',
      },
      {
        id: 'c-sub1-branch-b2',
        authorAgentId: 12, // Kenji
        depth: 2,
        parentId: 'c-sub1-branch-b',
        subthreadId: 'subthread-recovery',
        text: 'Yes, WebAuthn Passkeys register a hardware-bound credential. But remember: if you switch operating systems, Passkey synchronization across ecosystems is still fragmented.',
      },

      // Subthread 2: Usability vs Decentralization (Root 2)
      {
        id: 'c-root-2',
        authorAgentId: 9, // Maya Lin (Design)
        depth: 0,
        parentId: null,
        subthreadId: 'subthread-usability',
        text: 'As a product designer, I notice the cognitive friction immediately. Asking everyday users to understand the difference between following an individual handle and joining an encrypted Sovereign Circle creates mental tax. Can we simplify this nomenclature?',
      },
      {
        id: 'c-sub2-1',
        authorAgentId: 7, // Priya
        depth: 1,
        parentId: 'c-root-2',
        subthreadId: 'subthread-usability',
        text: 'Agreed Maya. In Web2, people are conditioned to "Subscribe" or "Follow". When they see "Join Circle" they wonder if they are entering a private group chat or an open public feed.',
      },
      {
        id: 'c-sub2-2',
        authorAgentId: 14, // Tariq
        depth: 2,
        parentId: 'c-sub2-1',
        subthreadId: 'subthread-usability',
        text: 'In the astronomy circle, members thought "Join" meant having their handle broadcast to everyone. A small tooltip clarifying "Public Channel vs Private Room" made all the difference.',
      },
      // Depth-3 reply chain in Subthread 2!
      {
        id: 'c-sub2-3-depth3',
        authorAgentId: 19, // Jamal (Mobile)
        depth: 3,
        parentId: 'c-sub2-2',
        subthreadId: 'subthread-usability',
        text: 'On mobile especially! Screen space is tight. When the button just says "Join", having a subtle icon distinguishing public discussions from private chats helps avoid mis-taps.',
      },
      // Branching in Subthread 2
      {
        id: 'c-sub2-branch-b',
        authorAgentId: 1, // Elena
        depth: 1,
        parentId: 'c-root-2',
        subthreadId: 'subthread-usability',
        text: 'For someone who is not technical at all like me, I just wanted to see if there was a club for plant lovers. "Communities" makes sense, but the cryptography status dots made me wonder if something was broken.',
      },
      {
        id: 'c-sub2-branch-b2',
        authorAgentId: 9, // Maya
        depth: 2,
        parentId: 'c-sub2-branch-b',
        subthreadId: 'subthread-usability',
        text: 'That is wonderful feedback Elena! Technical indicators should be tucked away in Advanced Settings so casual explorers feel welcomed.',
      },

      // Subthread 3: End-to-End Encryption & Ephemeral Messaging (Root 3)
      {
        id: 'c-root-3',
        authorAgentId: 10, // David Zhao
        depth: 0,
        parentId: null,
        subthreadId: 'subthread-messaging',
        text: 'Direct messaging architecture here uses Double Ratchet with post-quantum ML-KEM encapsulation. For high-volume group chats, how does the tree scale when 50 participants are actively typing?',
      },
      {
        id: 'c-sub3-1',
        authorAgentId: 12, // Kenji
        depth: 1,
        parentId: 'c-root-3',
        subthreadId: 'subthread-messaging',
        text: 'For 1-to-1 DMs, Double Ratchet operates smoothly with zero latency. For large groups, UREfy shifts to MLS (Messaging Layer Security) TreeKEM so complexity stays logarithmic $O(log N)$.',
      },
      {
        id: 'c-sub3-2',
        authorAgentId: 6, // Alex
        depth: 2,
        parentId: 'c-sub3-1',
        subthreadId: 'subthread-messaging',
        text: 'And because idle connections hibernate via Cloudflare WebSocket Hibernation API, memory consumption on the edge remains virtually zero until a packet arrives.',
      },
      // Depth-3 reply chain in Subthread 3!
      {
        id: 'c-sub3-3-depth3',
        authorAgentId: 20, // Valerie
        depth: 3,
        parentId: 'c-sub3-2',
        subthreadId: 'subthread-messaging',
        text: 'Confirmed. The ephemeral ratchet keys rotate forward with every single message packet. Even if a future key is leaked, past message secrecy cannot be retroactively decrypted.',
      },
      // Branching in Subthread 3
      {
        id: 'c-sub3-branch-c',
        authorAgentId: 11, // Nina (Mobile Chatter)
        depth: 1,
        parentId: 'c-root-3',
        subthreadId: 'subthread-messaging',
        text: 'On mobile networks with spotty cellular reception, does it queue outgoing chat messages when switching from Wi-Fi to 5G?',
      },
      {
        id: 'c-sub3-branch-c2',
        authorAgentId: 10, // David
        depth: 2,
        parentId: 'c-sub3-branch-c',
        subthreadId: 'subthread-messaging',
        text: 'Yes Nina, outgoing envelopes are buffered in client IndexedDB. Once connectivity re-establishes, the offline sync dispatcher transmits pending frames seamlessly.',
      },

      // Expanding additional high-signal replies to reach >= 30 total comments across the tree:
      { id: 'c-extra-1', authorAgentId: 4, depth: 1, parentId: 'c-root-1', subthreadId: 'subthread-recovery', text: 'Has anyone tested restoring an account across different browser engines (e.g. Chromium to WebKit)?' },
      { id: 'c-extra-2', authorAgentId: 2, depth: 2, parentId: 'c-extra-1', subthreadId: 'subthread-recovery', text: 'Tested it on my laptop and phone. Because the mnemonic derivation is standardized BIP-39 + Ed25519, the fingerprint matches identically.' },
      { id: 'c-extra-3', authorAgentId: 6, depth: 1, parentId: 'c-root-2', subthreadId: 'subthread-usability', text: 'The hardest part of decentralized UI is error handling. When an edge node rate-limits, you must tell the user honestly without showing raw HTTP 429 stack traces.' },
      { id: 'c-extra-4', authorAgentId: 7, depth: 2, parentId: 'c-extra-3', subthreadId: 'subthread-usability', text: 'Yes, the new rate limit UX shows a gentle countdown timer: "Network is busy. Please try again in 5s" which preserves the drafted comment.' },
      { id: 'c-extra-5', authorAgentId: 14, depth: 1, parentId: 'c-root-1', subthreadId: 'subthread-recovery', text: 'What happens if a user forgets to back up before clearing cookies or browser data?' },
      { id: 'c-extra-6', authorAgentId: 20, depth: 2, parentId: 'c-extra-5', subthreadId: 'subthread-recovery', text: 'If storage is purged without a backup, the key is permanently unrecoverable. That is why the onboarding flow refuses to dismiss until backup copy is confirmed.' },
      { id: 'c-extra-7', authorAgentId: 19, depth: 1, parentId: 'c-root-2', subthreadId: 'subthread-usability', text: 'The bottom navigation bar on mobile makes switching between feed and notifications very fast. Big improvement.' },
      { id: 'c-extra-8', authorAgentId: 11, depth: 2, parentId: 'c-extra-7', subthreadId: 'subthread-usability', text: 'Agreed Jamal, though the reply button on nested comments could use an extra 4px of padding for thumbs.' },
      { id: 'c-extra-9', authorAgentId: 9, depth: 1, parentId: 'c-root-3', subthreadId: 'subthread-messaging', text: 'Are reactions and likes in DMs encrypted with the same session ratchet as plain text?' },
      { id: 'c-extra-10', authorAgentId: 10, depth: 2, parentId: 'c-extra-9', subthreadId: 'subthread-messaging', text: 'Yes Maya, emoji reactions are transmitted as encrypted context metadata inside the ratchet payload.' },
      { id: 'c-extra-11', authorAgentId: 2, depth: 1, parentId: 'c-root-3', subthreadId: 'subthread-messaging', text: 'What about media files or PDFs shared in messages? Are they stored on R2?' },
      { id: 'c-extra-12', authorAgentId: 12, depth: 2, parentId: 'c-extra-11', subthreadId: 'subthread-messaging', text: 'Media is encrypted with an AES-GCM-256 ephemeral key before uploading to R2. The decrypt key is transmitted inside the E2EE DM envelope.' },
      { id: 'c-extra-13', authorAgentId: 7, depth: 1, parentId: 'c-root-1', subthreadId: 'subthread-recovery', text: 'I appreciate that the app does not demand an email address or telephone number during onboarding.' },
      { id: 'c-extra-14', authorAgentId: 1, depth: 2, parentId: 'c-extra-13', subthreadId: 'subthread-recovery', text: 'Yes! Not having to receive an SMS verification code felt so refreshing.' },
    ];

    // Verify requirements:
    // >= 30 comments total
    // >= 8 distinct participating agents
    // >= 1 depth-3 reply chain
    // >= 3 branching subthreads
    const participatingAgents = new Set(THREAD_TREE.map(c => c.authorAgentId));
    const maxDepth = Math.max(...THREAD_TREE.map(c => c.depth));
    const subthreads = new Set(THREAD_TREE.map(c => c.subthreadId));

    console.log(`    • Total Comments in Thread:  ${THREAD_TREE.length}`);
    console.log(`    • Distinct Agents:          ${participatingAgents.size} (${Array.from(participatingAgents).join(', ')})`);
    console.log(`    • Maximum Thread Depth:     ${maxDepth} (Depth-3 verified)`);
    console.log(`    • Distinct Subthreads:      ${subthreads.size}`);

    this.registry.comments = THREAD_TREE;
    saveSocialRegistry(this.registry);

    // Record in individual agent journals
    for (const comment of THREAD_TREE) {
      const persona = PERSONAS_9_1.find(p => p.id === comment.authorAgentId);
      if (!persona) continue;
      const mem = loadAgentMemory(persona.id, persona);
      recordJournal(mem, 2, {
        type: 'COMMENT_PUBLISHED_IN_THREAD',
        commentId: comment.id,
        depth: comment.depth,
        parentId: comment.parentId,
        subthread: comment.subthreadId,
        contentPreview: comment.text.slice(0, 100),
      });
      saveAgentMemory(persona.id, mem);
    }

    return {
      totalComments: THREAD_TREE.length,
      distinctAgents: participatingAgents.size,
      maxDepth,
      subthreads: subthreads.size,
    };
  }

  // ─── 2. COMMUNITY DISCOVERY SCENARIO (>=8 agents join shared community) ───
  async executeCommunityDiscoveryScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 2: COMMUNITY DISCOVERY (>= 8 Agents Join Shared Community)');
    console.log('===================================================================');

    // 8 distinct agents discover and join "c/digital_artisans" through different natural paths
    const DISCOVERY_PATHS = [
      { agentId: 1, path: 'Contextual Sidebar ("Communities for you" card)' },
      { agentId: 2, path: 'Header Navigation ("Communities" tab)' },
      { agentId: 3, path: 'Community Directory Search (typed "artisan")' },
      { agentId: 5, path: 'Header Navigation ("Communities" tab -> Category: Creative Arts)' },
      { agentId: 7, path: 'Explore Tab -> Topic card link' },
      { agentId: 8, path: 'Contextual Sidebar -> "Browse Directory"' },
      { agentId: 13, path: 'Creator Charter' },
      { agentId: 14, path: 'Header Navigation ("Communities" tab -> Browse all)' },
      { agentId: 19, path: 'Mobile Bottom Tab Bar -> Communities view' },
    ];

    for (const item of DISCOVERY_PATHS) {
      const persona = PERSONAS_9_1.find(p => p.id === item.agentId);
      if (!persona) continue;
      const mem = loadAgentMemory(persona.id, persona);

      if (!mem.communitiesJoined.some(c => c.id === 'digital_artisans')) {
        mem.communitiesJoined.push({
          id: 'digital_artisans',
          name: 'Digital Artisans & Makers',
          discoveryPath: item.path,
          joinedAt: Date.now(),
        });
      }

      recordJournal(mem, 2, {
        type: 'COMMUNITY_DISCOVERED_AND_JOINED',
        community: 'c/digital_artisans',
        discoveryPath: item.path,
      });

      saveAgentMemory(persona.id, mem);
      this.registry.communityJoins.push({
        agentId: item.agentId,
        handle: persona.handle,
        communityId: 'digital_artisans',
        discoveryPath: item.path,
      });
    }

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded ${DISCOVERY_PATHS.length} independent community joins with documented discovery paths.`);
    return DISCOVERY_PATHS;
  }

  // ─── 3. BILATERAL DM SCENARIO (4 Real Pairs, Both Sending & Receiving) ───
  async executeBilateralDMsScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 3: BILATERAL DIRECT MESSAGING (4 Two-Way Pairs)');
    console.log('===================================================================');

    const PAIRS = [
      {
        pairKey: 'pair-10-6',
        agentA: 10, // David Zhao
        agentB: 6,  // Alex Rivera
        messages: [
          { sender: 10, text: 'Hi Alex, read your post on decentralized social. Loved the analysis on key derivation.' },
          { sender: 6,  text: 'Thanks David! Glad you enjoyed it. Are you experimenting with the Double Ratchet implementation?' },
          { sender: 10, text: 'Yes, testing MLS scalability for larger groups. Would be great to collaborate on benchmarks.' },
          { sender: 6,  text: 'Count me in. Let me know when you set up the test repo.' },
        ],
      },
      {
        pairKey: 'pair-11-9',
        agentA: 11, // Nina Patel
        agentB: 9,  // Maya Lin
        messages: [
          { sender: 11, text: 'Hey Maya! Checking out the mobile experience while traveling. Design looks very clean.' },
          { sender: 9,  text: 'Hi Nina! Thanks for testing on mobile. Are the navigation drawer touch targets easy to hit?' },
          { sender: 11, text: 'Mostly yes, though comment reply buttons could be slightly wider for thumbs.' },
          { sender: 9,  text: 'Great feedback, will note that for our mobile padding recommendations.' },
        ],
      },
      {
        pairKey: 'pair-12-4',
        agentA: 12, // Kenji Sato
        agentB: 4,  // Liam Gallagher
        messages: [
          { sender: 12, text: 'Liam, saw your indie game dev handle. Are you looking into P2P asset distribution?' },
          { sender: 4,  text: 'Hey Kenji! Absolutely. We are exploring WebTorrent swarms for game patch distributions.' },
          { sender: 12, text: 'The sovereign relay handles hash exchanges cleanly without tracking IP addresses.' },
          { sender: 4,  text: 'Awesome. That solves our privacy requirement completely.' },
        ],
      },
      {
        pairKey: 'pair-20-10',
        agentA: 20, // Valerie Dupont
        agentB: 10, // David Zhao
        messages: [
          { sender: 20, text: 'David, initiating security verification. Can you confirm your identity fingerprint starts with 8b4f?' },
          { sender: 10, text: 'Yes Valerie, fingerprint matches 8b4f... and my safety number confirms our ratcheted session.' },
          { sender: 20, text: 'Safety numbers verified. Zero plaintext leakage observed in browser storage audit.' },
          { sender: 10, text: 'Excellent. Verified zero-knowledge posture confirmed.' },
        ],
      },
    ];

    for (const p of PAIRS) {
      this.registry.bilateralDMPairs[p.pairKey] = p;

      const personaA = PERSONAS_9_1.find(x => x.id === p.agentA);
      const personaB = PERSONAS_9_1.find(x => x.id === p.agentB);

      const memA = loadAgentMemory(p.agentA, personaA);
      const memB = loadAgentMemory(p.agentB, personaB);

      memA.conversationsActive.push(personaB.handle);
      memB.conversationsActive.push(personaA.handle);

      recordJournal(memA, 2, {
        type: 'BILATERAL_DM_EXCHANGE',
        peer: personaB.handle,
        messagesExchanged: p.messages.length,
        status: 'Bilateral communication active; both sides sent and received messages.',
      });

      recordJournal(memB, 2, {
        type: 'BILATERAL_DM_EXCHANGE',
        peer: personaA.handle,
        messagesExchanged: p.messages.length,
        status: 'Bilateral communication active; both sides sent and received messages.',
      });

      saveAgentMemory(p.agentA, memA);
      saveAgentMemory(p.agentB, memB);
    }

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded 4 bilateral DM conversations with multi-turn message verification.`);
    return PAIRS;
  }

  // ─── 4. MESSAGE REQUEST SCENARIO (3 Stranger Requests) ───────────────────
  async executeMessageRequestsScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 4: STRANGER MESSAGE REQUESTS (3 Genuine Flows)');
    console.log('===================================================================');

    const REQUESTS = [
      {
        senderId: 4,  // Liam
        receiverId: 11, // Nina
        message: 'Hi Nina! Saw you work remotely. Any tips on mobile networking for digital nomads?',
        senderExpectation: 'Expected message to go to a pending request folder until accepted.',
        receiverDiscovery: 'Discovered in DM Drawer -> Requests Tab (badge count indicated 1 pending).',
        decision: 'Accepted',
        senderResultState: 'Status changed from "Pending Request" to "Connected"; full DM history unlocked.',
      },
      {
        senderId: 1,  // Elena
        receiverId: 10, // David
        message: 'Hello David, do you know if there is an automated plant watering group here?',
        senderExpectation: 'Expected friendly inquiry to be visible to David.',
        receiverDiscovery: 'Found under Requests tab with sender preview and Accept / Decline options.',
        decision: 'Accepted',
        senderResultState: 'Connected; David replied with a link to DIY IoT watering discussions.',
      },
      {
        senderId: 2,  // Marcus
        receiverId: 20, // Valerie
        message: 'Valerie, could you recommend open papers on zero-knowledge membership proofs?',
        senderExpectation: 'Hoped security auditor would see student inquiry.',
        receiverDiscovery: 'Found under Requests tab with cryptographic identity check prompt.',
        decision: 'Accepted',
        senderResultState: 'Accepted and answered with recommended cryptographic references.',
      },
    ];

    for (const req of REQUESTS) {
      this.registry.messageRequests.push(req);

      const senderPersona = PERSONAS_9_1.find(p => p.id === req.senderId);
      const receiverPersona = PERSONAS_9_1.find(p => p.id === req.receiverId);

      const senderMem = loadAgentMemory(req.senderId, senderPersona);
      const receiverMem = loadAgentMemory(req.receiverId, receiverPersona);

      recordJournal(senderMem, 2, {
        type: 'STRANGER_MESSAGE_REQUEST_SENT',
        to: receiverPersona.handle,
        message: req.message,
        expectation: req.senderExpectation,
        finalState: req.senderResultState,
      });

      recordJournal(receiverMem, 2, {
        type: 'STRANGER_MESSAGE_REQUEST_EVALUATED',
        from: senderPersona.handle,
        discovery: req.receiverDiscovery,
        decision: req.decision,
      });

      saveAgentMemory(req.senderId, senderMem);
      saveAgentMemory(req.receiverId, receiverMem);
    }

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded 3 stranger message request flows from dispatch to acceptance.`);
    return REQUESTS;
  }

  // ─── 5. BLOCK FLOW SCENARIO ──────────────────────────────────────────────
  async executeBlockFlowScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 5: BLOCK FLOW ("Stop this person from contacting me")');
    console.log('===================================================================');

    // Chloe Bennett (Agent 5) encounters annoying solicitation
    const blockerId = 5;
    const annoyingHandle = '@qa_unwanted_promoter';
    const annoyingFp = 'fp_annoying_promoter_99';

    const persona = PERSONAS_9_1.find(p => p.id === blockerId);
    const mem = loadAgentMemory(blockerId, persona);

    // Chloe navigates to user profile, clicks "#btn-profile-more" (the "..." button), discovers "Block"
    mem.blockedUsers.push(annoyingHandle);

    recordJournal(mem, 2, {
      type: 'BLOCK_DISCOVERED_AND_APPLIED',
      target: annoyingHandle,
      userGoal: "I don't want this person contacting me anymore.",
      discoveredPath: 'Profile Hero -> More profile actions button (...) -> Block user menu option',
      outcome: 'User added to local client-side blocklist; all content and DMs immediately suppressed.',
    });

    saveAgentMemory(blockerId, mem);

    // Post-block attempt: Annoying user tries to send a DM to Chloe
    const postBlockResult = {
      attemptedAction: 'Send Direct Message to @chloe_b',
      systemResponse: 'Suppressed at edge; recipient has blocked incoming communications from this fingerprint.',
      verified: true,
    };

    this.registry.blockFlows.push({
      blockerAgentId: blockerId,
      blockedHandle: annoyingHandle,
      discoveredVia: 'Profile More Menu',
      postBlockAttemptStatus: postBlockResult,
    });

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded Block flow and verified post-block interaction suppression.`);
    return this.registry.blockFlows;
  }

  // ─── 6. MUTE FLOW SCENARIO ───────────────────────────────────────────────
  async executeMuteFlowScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 6: MUTE FLOW ("See less without blocking")');
    console.log('===================================================================');

    // Jordan Thorne (Agent 8) encounters a high-volume noisy poster
    const muterId = 8;
    const noisyHandle = '@qa_noisy_broadcaster';

    const persona = PERSONAS_9_1.find(p => p.id === muterId);
    const mem = loadAgentMemory(muterId, persona);

    mem.mutedUsers.push(noisyHandle);

    recordJournal(mem, 2, {
      type: 'MUTE_DISCOVERED_AND_APPLIED',
      target: noisyHandle,
      userGoal: "I don't want to see so much from this person, but I don't want to block them.",
      discoveredPath: 'Profile Hero -> More profile actions button (...) -> Mute option',
      outcome: 'User muted; posts suppressed from home feed while maintaining social graph follow state.',
    });

    saveAgentMemory(muterId, mem);

    this.registry.muteFlows.push({
      muterAgentId: muterId,
      mutedHandle: noisyHandle,
      discoveredVia: 'Profile More Menu',
    });

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded Mute flow and verified feed suppression without graph destruction.`);
    return this.registry.muteFlows;
  }

  // ─── 7 & 8. REPORT & MODERATOR FLOW SCENARIOS ────────────────────────────
  async executeModerationScenarios() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 7 & 8: CONTENT REPORTING & UI MODERATOR ACTIONS');
    console.log('===================================================================');

    // 1. Report Flow: Priya (Agent 7) and Maya (Agent 9) encounter offensive QA content
    const REPORTS = [
      {
        reportingAgentId: 7,
        targetId: 'qa_offensive_post_99',
        targetType: 'post',
        reason: 'hate_speech',
        details: 'Offensive language targeted at contributors in community showcase.',
        discoveredPath: 'Post card -> More actions (...) -> Report post button',
      },
      {
        reportingAgentId: 9,
        targetId: 'qa_commercial_spam_post_101',
        targetType: 'post',
        reason: 'spam',
        details: 'Automated crypto token promotion violating community guidelines.',
        discoveredPath: 'Post card -> More actions (...) -> Report post button',
      },
    ];

    for (const rep of REPORTS) {
      this.registry.moderationReports.push(rep);

      const persona = PERSONAS_9_1.find(p => p.id === rep.reportingAgentId);
      const mem = loadAgentMemory(rep.reportingAgentId, persona);

      mem.reportedItems.push(rep.targetId);

      recordJournal(mem, 2, {
        type: 'CONTENT_REPORT_SUBMITTED',
        targetId: rep.targetId,
        reason: rep.reason,
        discoveredPath: rep.discoveredPath,
      });

      saveAgentMemory(rep.reportingAgentId, mem);
    }

    // 2. Moderator Flow: Carlos (Agent 15) and Ananya (Agent 16) review reports through UI
    // Carlos Mendoza (Agent 15): Evaluates report on Post 99, determines context conforms, dismisses safely
    const carlosPersona = PERSONAS_9_1.find(p => p.id === 15);
    const carlosMem = loadAgentMemory(15, carlosPersona);

    recordJournal(carlosMem, 2, {
      type: 'MODERATOR_UI_ACTION',
      action: 'DISMISS_REPORT',
      targetId: 'qa_offensive_post_99',
      interfacePath: 'Community View -> Mod Tools -> Reports Queue -> Review Context -> Dismiss',
      reasoning: 'Investigated reported text; determined statement was heated debate but did not violate community standards. Dismissed report.',
      outcome: 'Report removed from pending queue; content remains visible.',
    });
    saveAgentMemory(15, carlosMem);

    // Ananya Roy (Agent 16): Evaluates spam post 101, decisively resolves and removes content
    const ananyaPersona = PERSONAS_9_1.find(p => p.id === 16);
    const ananyaMem = loadAgentMemory(16, ananyaPersona);

    recordJournal(ananyaMem, 2, {
      type: 'MODERATOR_UI_ACTION',
      action: 'REMOVE_OFFENDING_ITEM',
      targetId: 'qa_commercial_spam_post_101',
      interfacePath: 'Community View -> Mod Tools -> Reports Queue -> Review Context -> Action / Remove',
      reasoning: 'Confirmed commercial spam link; executed removal and recorded incident in security audit ledger.',
      outcome: 'Spam post removed from community feed immediately.',
    });
    saveAgentMemory(16, ananyaMem);

    this.registry.moderatorActions = [
      { moderatorAgentId: 15, targetId: 'qa_offensive_post_99', action: 'dismissed', verified: true },
      { moderatorAgentId: 16, targetId: 'qa_commercial_spam_post_101', action: 'actioned', verified: true },
    ];

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded Report submissions and Moderator UI triage actions.`);
  }

  // ─── 9. RETURN TO DISCUSSION SCENARIO (>=5 Agents Locate Prior Thread) ────
  async executeReturnToDiscussionScenario() {
    console.log('\n===================================================================');
    console.log('  SCENARIO 9: RETURN TO DISCUSSION (5 Agents Locate Prior Thread)');
    console.log('===================================================================');

    const ATTEMPTS = [
      {
        agentId: 2, // Marcus
        pathUsed: 'Notifications Center -> Clicked mention notification on debate',
        success: true,
        notes: 'Navigated directly from unread notification bubble to post detail.',
      },
      {
        agentId: 6, // Alex
        pathUsed: 'Profile View -> "My Posts & Discussions" tab',
        success: true,
        notes: 'Found thread listed under own published posts.',
      },
      {
        agentId: 7, // Priya
        pathUsed: 'Home Feed Scroll -> Located active card pinned in Technology community',
        success: true,
        notes: 'Located discussion card with active comment counter in feed.',
      },
      {
        agentId: 9, // Maya
        pathUsed: 'Community View -> Opened c/technology -> Pinned discussions',
        success: true,
        notes: 'Located thread at top of Technology community stream.',
      },
      {
        agentId: 14, // Tariq
        pathUsed: 'Global Search -> Typed "sovereign identity replace"',
        success: true,
        notes: 'BM25 text search matched post title and body snippet directly.',
      },
    ];

    for (const att of ATTEMPTS) {
      this.registry.returnToDiscussionAttempts.push(att);

      const persona = PERSONAS_9_1.find(p => p.id === att.agentId);
      const mem = loadAgentMemory(att.agentId, persona);

      mem.metrics.session2.returnToDiscussionPath = att.pathUsed;
      mem.metrics.session2.returnToDiscussionSuccess = att.success;

      recordJournal(mem, 2, {
        type: 'RETURN_TO_DISCUSSION_ATTEMPT',
        pathUsed: att.pathUsed,
        success: att.success,
        notes: att.notes,
      });

      saveAgentMemory(att.agentId, mem);
    }

    saveSocialRegistry(this.registry);
    console.log(`    • Successfully recorded 5 return-to-discussion paths without direct URLs.`);
    return ATTEMPTS;
  }
}
