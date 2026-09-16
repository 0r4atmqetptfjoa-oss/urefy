import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sovereignDM, SovereignDMManager, DirectMessage, DMConversation } from '../src/sovereign-dm.js';
import { createSovereignIdentity, type SovereignKeyPairSet } from '@aetheris/core-crypto';
import { DirectMessagingClient } from '../src/direct-messaging-client.js';
import { onRequestPost } from '../functions/api/direct-messages.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createDmDatabase } from './helpers/dm-database.js';
import { branchOf } from '../src/conversation-context.js';

describe('Sovereign E2EE Direct Messaging (SFrame / TreeKEM)', () => {
  let dmManager: SovereignDMManager;
  let fixture: ReturnType<typeof createDmDatabase>;
  let owner: SovereignKeyPairSet;
  let peer: SovereignKeyPairSet;
  let peerClient: DirectMessagingClient;

  beforeEach(async () => {
    fixture = createDmDatabase();
    resetReplayNonceCache();
    owner = createSovereignIdentity();
    peer = createSovereignIdentity();
    const fetcher: typeof fetch = async (url, options) => onRequestPost({
      env: { DB: fixture.database, ENVIRONMENT: 'production' },
      request: new Request(new URL(String(url), 'https://example.test'), options),
    });
    peerClient = new DirectMessagingClient(async () => peer, fetcher);
    await peerClient.register();
    dmManager = new SovereignDMManager(new DirectMessagingClient(async () => owner, fetcher));
    await dmManager.ready;
  });

  afterEach(async () => {
    await dmManager.startLiveSync();
    await dmManager.persistence;
    dmManager.destroy();
    fixture.sqlite.close();
  });

  it('1. Inițializarea managerului de DM-uri suverane', () => {
    // Test singleton instance
    expect(sovereignDM).toBeDefined();
    expect(sovereignDM).toBeInstanceOf(SovereignDMManager);

    // Test fresh instance initialization and initial state
    expect(dmManager).toBeInstanceOf(SovereignDMManager);
    expect(dmManager.conversations).toBeInstanceOf(Map);
    expect(dmManager.conversations.size).toBe(0);

    // Initial modal states
    expect(dmManager.isTreeKEMDrawerOpen).toBe(false);
    expect(dmManager.isSafetyModalOpen).toBe(false);
    expect(dmManager.isConversationsDrawerOpen).toBe(false);
  });

  it('2. Deschiderea unei conversații cu openDM("peer-fp-123", "GUARDIAN")', () => {
    const peerFP = peer.identity.fingerprint;
    const peerRole = 'GUARDIAN';

    dmManager.openDM(peerFP, peerRole);

    expect(dmManager.isOpen).toBe(true);
    expect(dmManager.isMinimized).toBe(false);
    expect(dmManager.activePeerFP).toBe(peerFP);

    const conv = dmManager.getConversation(peerFP);
    expect(conv).toBeDefined();
    expect(conv?.peerFingerprint).toBe(peerFP);
    expect(conv?.peerRole).toBe(peerRole);
    expect(conv?.messages).toEqual([]);
    expect(conv?.unreadCount).toBe(0);
  });

  it('3 & 4. Trimiterea unui mesaj și verificarea apariției în lista conversației', async () => {
    const peerFP = peer.identity.fingerprint;
    const myFP = owner.identity.fingerprint;
    const text = 'Hello Sovereign World';

    dmManager.openDM(peerFP, 'GUARDIAN');
    await dmManager.sendMessage(text, myFP);

    const conv = dmManager.getConversation(peerFP);
    expect(conv).toBeDefined();
    expect(conv?.messages.length).toBe(1);

    const msg: DirectMessage = conv!.messages[0];
    expect(msg.id).toBeDefined();
    expect(msg.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(msg.senderFP).toBe(myFP);
    expect(msg.receiverFP).toBe(peerFP);
    expect(msg.plaintext).toBe(text);
    expect(msg.isRead).toBe(true);
    expect(msg.timestamp).toBeGreaterThan(0);
    expect(conv?.lastMessageAt).toBe(msg.timestamp);
  });

  it('5. Mesajele au pachete criptate si semnate reale', async () => {
    const peerFP = peer.identity.fingerprint;
    const myFP = owner.identity.fingerprint;
    const text = 'Hello Sovereign World';

    dmManager.openDM(peerFP, 'GUARDIAN');
    await dmManager.sendMessage(text, myFP);

    const conv = dmManager.getConversation(peerFP);
    const msg: DirectMessage = conv!.messages[0];

    // Encrypted payload must be non-empty string and adhere to SFrame format
    expect(typeof msg.encryptedPayload).toBe('string');
    expect(msg.encryptedPayload.length).toBeGreaterThan(0);
    expect(JSON.parse(msg.encryptedPayload).payload.message.version).toBe(1);
    expect(msg.encryptedPayload).not.toContain(text);
  });

  it('6. Închiderea ferestrei de chat cu closeDM()', () => {
    const peerFP = peer.identity.fingerprint;
    dmManager.openDM(peerFP, 'GUARDIAN');
    expect(dmManager.isOpen).toBe(true);

    dmManager.toggleTreeKEMDrawer();
    expect(dmManager.isTreeKEMDrawerOpen).toBe(true);

    dmManager.closeDM();
    expect(dmManager.isOpen).toBe(false);
    expect(dmManager.isTreeKEMDrawerOpen).toBe(false);
    expect(dmManager.isSafetyModalOpen).toBe(false);
    expect(dmManager.isConversationsDrawerOpen).toBe(false);
  });

  it('7. Flux complet de mesagerie bidirecțională și Safety Numbers', async () => {
    const peerFP = peer.identity.fingerprint;
    const myFP = owner.identity.fingerprint;

    dmManager.openDM(peerFP, 'ARCHIVIST');
    await dmManager.sendMessage('Message from local node', myFP);

    await peerClient.send(myFP, { text: 'Peer response acknowledged' });
    await dmManager.synchronize();
    const incoming = dmManager.getConversation(peerFP)!.messages.find(message => message.senderFP === peerFP)!;
    expect(incoming.senderFP).toBe(peerFP);
    expect(incoming.receiverFP).toBe(myFP);
    expect(incoming.plaintext).toBe('Peer response acknowledged');
    expect(JSON.parse(incoming.encryptedPayload).payload.message.version).toBe(1);

    const conv = dmManager.getConversation(peerFP);
    expect(conv?.messages.length).toBe(2);

    // Deterministic Safety Number verification
    const safetyNumber1 = dmManager.getSafetyNumber(peerFP, myFP);
    const safetyNumber2 = dmManager.getSafetyNumber(myFP, peerFP);
    expect(safetyNumber1).toBe(safetyNumber2);
    expect(safetyNumber1.split(' ').length).toBe(12);

    // Export and import transcripts
    const exportedJSON = dmManager.exportTranscriptJSON(peerFP);
    expect(exportedJSON).toContain('UREfy_DM_Encrypted_Transcript_v1');
    expect(exportedJSON).not.toContain('Peer response acknowledged');

    const importSuccess = await dmManager.importTranscriptJSON(exportedJSON);
    expect(importSuccess).toBe(true);

    // Delete message & clear conversation
    const deleted = dmManager.deleteMessage(peerFP, incoming.id);
    expect(deleted).toBe(true);
    expect(conv?.messages.length).toBe(1);

    const cleared = dmManager.clearConversation(peerFP);
    expect(cleared).toBe(true);
    expect(conv?.messages.length).toBe(0);
  });

  it('8. Randare HTML interfață DM cu clase Tailwind și selectori specifici', async () => {
    const peerFP = peer.identity.fingerprint;
    const myFP = owner.identity.fingerprint;

    // Render DM Button
    const btnHtml = dmManager.renderDMButton(peerFP, 'GUARDIAN', '💬 Chat');
    expect(btnHtml).toContain(`data-sovereign-dm-trigger="${peerFP}"`);
    expect(btnHtml).toContain('bg-surface-overlay');
    expect(btnHtml).toContain('text-cyphr');

    // Render Closed Dock Launcher
    dmManager.closeDM();
    const launcherHtml = dmManager.renderDMModal(myFP);
    expect(launcherHtml).toContain('Toggle Sovereign E2EE Direct Messages');
    expect(launcherHtml).toContain('bg-surface-raised');

    // Render Open Chat Modal
    dmManager.openDM(peerFP, 'GUARDIAN');
    await dmManager.sendMessage('Encrypted UI test payload', myFP);
    const modalHtml = dmManager.renderDMModal(myFP);

    expect(modalHtml).toContain('sovereign-dm-modal');
    expect(modalHtml).toContain('sovereign-dm-messages-container');
    expect(modalHtml).toContain('Encrypted UI test payload');
    expect(modalHtml).toContain('bg-surface-base');

    // Render Raw Ciphertext toggle
    dmManager.toggleCiphertext();
    expect(dmManager.showCiphertextToggle).toBe(true);
    const ciphertextModal = dmManager.renderDMModal(myFP);
    expect(ciphertextModal).toContain('senderCopy');
  });

  it('9. Ramificatiile pastreaza provenienta, izoleaza mesajele si reactioneaza', async () => {
    const peerFP = peer.identity.fingerprint;
    const myFP = owner.identity.fingerprint;

    dmManager.openDM(peerFP, 'GUARDIAN');
    await dmManager.sendMessage('Main thread message', myFP);
    const conv = dmManager.getConversation(peerFP)!;
    const source = conv.messages[0];
    expect(branchOf(source)).toBe('main');

    dmManager.replyToId = source.id;
    await dmManager.sendMessage('A reply in the main thread', myFP);
    expect(conv.messages[1].context?.replyToId).toBe(source.id);

    await dmManager.createBranch(peerFP, 'Weekend plans', source.id);
    const branch = dmManager.getBranches(peerFP)[0];
    expect(branch.title).toBe('Weekend plans');
    expect(branch.sourceMessageId).toBe(source.id);
    expect(branch.parentBranchId).toBe('main');
    expect(branch.createdBy).toBe(myFP);
    expect(dmManager.getActiveBranch()).toBe(branch.id);
    // Selecting a branch clears any reply target so context cannot leak across branches.
    expect(dmManager.replyToId).toBeNull();

    await dmManager.sendMessage('Only inside the branch', myFP);
    const branchMessage = conv.messages[2];
    expect(branchOf(branchMessage)).toBe(branch.id);
    expect(branchMessage.context?.branch?.sourceMessageId).toBe(source.id);

    await dmManager.reactToMessage(source.id, '👍');
    expect(dmManager.getReactions(source.id)).toContainEqual({ emoji: '👍', count: 1, mine: true });
    // A reaction is a context marker, never a duplicate visible message in the thread.
    expect(conv.messages[3].plaintext).toBe('');
    expect(conv.messages[3].context?.reaction?.messageId).toBe(source.id);
  });

  it('10. Ramificarea fara mesaj livrat este refuzata', async () => {
    const peerFP = peer.identity.fingerprint;
    dmManager.openDM(peerFP, 'GUARDIAN');
    await expect(dmManager.createBranch(peerFP, 'No source', 'missing-message')).rejects.toThrow(/Choose a delivered message/);
  });
});
