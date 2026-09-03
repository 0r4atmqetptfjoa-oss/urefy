import { describe, it, expect, beforeEach } from 'vitest';
import { sovereignDM, SovereignDMManager, DirectMessage, DMConversation } from '../src/sovereign-dm.js';

describe('Sovereign E2EE Direct Messaging (SFrame / TreeKEM)', () => {
  let dmManager: SovereignDMManager;

  beforeEach(() => {
    // Instantiate a fresh manager for isolated test execution
    dmManager = new SovereignDMManager();
  });

  it('1. Inițializarea managerului de DM-uri suverane', () => {
    // Test singleton instance
    expect(sovereignDM).toBeDefined();
    expect(sovereignDM).toBeInstanceOf(SovereignDMManager);

    // Test fresh instance initialization and initial state
    expect(dmManager).toBeInstanceOf(SovereignDMManager);
    expect(dmManager.conversations).toBeInstanceOf(Map);
    expect(dmManager.conversations.size).toBeGreaterThanOrEqual(2);

    // Verify seeded peer conversations
    const guardianConv = dmManager.getConversation('c3dc28cb705e');
    expect(guardianConv).toBeDefined();
    expect(guardianConv?.peerRole).toBe('GUARDIAN');
    expect(guardianConv?.messages.length).toBeGreaterThan(0);

    const archivistConv = dmManager.getConversation('a89104fa2211');
    expect(archivistConv).toBeDefined();
    expect(archivistConv?.peerRole).toBe('ARCHIVIST');
    expect(archivistConv?.messages.length).toBeGreaterThan(0);

    // Initial modal states
    expect(dmManager.isTreeKEMDrawerOpen).toBe(false);
    expect(dmManager.isSafetyModalOpen).toBe(false);
    expect(dmManager.isConversationsDrawerOpen).toBe(false);
  });

  it('2. Deschiderea unei conversații cu openDM("peer-fp-123", "GUARDIAN")', () => {
    const peerFP = 'peer-fp-123';
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

  it('3 & 4. Trimiterea unui mesaj și verificarea apariției în lista conversației', () => {
    const peerFP = 'peer-fp-123';
    const myFP = 'my-fp-000';
    const text = 'Hello Sovereign World';

    dmManager.openDM(peerFP, 'GUARDIAN');
    dmManager.sendMessage(text, myFP);

    const conv = dmManager.getConversation(peerFP);
    expect(conv).toBeDefined();
    expect(conv?.messages.length).toBe(1);

    const msg: DirectMessage = conv!.messages[0];
    expect(msg.id).toBeDefined();
    expect(msg.id.startsWith('msg_')).toBe(true);
    expect(msg.senderFP).toBe(myFP);
    expect(msg.receiverFP).toBe(peerFP);
    expect(msg.plaintext).toBe(text);
    expect(msg.isRead).toBe(true);
    expect(msg.timestamp).toBeGreaterThan(0);
    expect(conv?.lastMessageAt).toBe(msg.timestamp);
  });

  it('5. Criptarea locală simulată (câmpul encryptedPayload este prezent și nevid)', () => {
    const peerFP = 'peer-fp-123';
    const myFP = 'my-fp-000';
    const text = 'Hello Sovereign World';

    dmManager.openDM(peerFP, 'GUARDIAN');
    dmManager.sendMessage(text, myFP);

    const conv = dmManager.getConversation(peerFP);
    const msg: DirectMessage = conv!.messages[0];

    // Encrypted payload must be non-empty string and adhere to SFrame format
    expect(typeof msg.encryptedPayload).toBe('string');
    expect(msg.encryptedPayload.length).toBeGreaterThan(0);
    expect(msg.encryptedPayload).toContain('SFRAME::v2.4::');
    expect(msg.encryptedPayload).toMatch(/^SFRAME::v2\.4::EP\d+::GEN\d+::[0-9a-f]+::MAC[0-9a-f]+$/);
    expect(msg.encryptedPayload).not.toBe(text);
  });

  it('6. Închiderea ferestrei de chat cu closeDM()', () => {
    const peerFP = 'peer-fp-123';
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

  it('7. Flux complet de mesagerie bidirecțională și Safety Numbers', () => {
    const peerFP = 'peer-fp-node-x';
    const myFP = 'my-local-fp';

    dmManager.openDM(peerFP, 'ARCHIVIST');
    dmManager.sendMessage('Message from local node', myFP);

    // Simulate incoming peer response
    const incoming = dmManager.receiveMessage(peerFP, 'Peer response acknowledged', myFP);
    expect(incoming.senderFP).toBe(peerFP);
    expect(incoming.receiverFP).toBe(myFP);
    expect(incoming.plaintext).toBe('Peer response acknowledged');
    expect(incoming.encryptedPayload).toContain('SFRAME::v2.4::');

    const conv = dmManager.getConversation(peerFP);
    expect(conv?.messages.length).toBe(2);

    // Deterministic Safety Number verification
    const safetyNumber1 = dmManager.getSafetyNumber(peerFP, myFP);
    const safetyNumber2 = dmManager.getSafetyNumber(myFP, peerFP);
    expect(safetyNumber1).toBe(safetyNumber2);
    expect(safetyNumber1.split(' ').length).toBe(6);

    // Export and import transcripts
    const exportedJSON = dmManager.exportTranscriptJSON(peerFP);
    expect(exportedJSON).toContain('Aetheris_Sovereign_DM_Transcript_v2.4');
    expect(exportedJSON).toContain('Peer response acknowledged');

    const importSuccess = dmManager.importTranscriptJSON(exportedJSON);
    expect(importSuccess).toBe(true);

    // Delete message & clear conversation
    const deleted = dmManager.deleteMessage(peerFP, incoming.id);
    expect(deleted).toBe(true);
    expect(conv?.messages.length).toBe(1);

    const cleared = dmManager.clearConversation(peerFP);
    expect(cleared).toBe(true);
    expect(conv?.messages.length).toBe(0);
  });

  it('8. Randare HTML interfață DM cu clase Tailwind și selectori specifici', () => {
    const peerFP = 'peer-fp-ui-test';
    const myFP = 'my-fp-000';

    // Render DM Button
    const btnHtml = dmManager.renderDMButton(peerFP, 'GUARDIAN', '💬 Chat');
    expect(btnHtml).toContain('data-sovereign-dm-trigger="peer-fp-ui-test"');
    expect(btnHtml).toContain('bg-surface-overlay');
    expect(btnHtml).toContain('text-cyphr');

    // Render Closed Dock Launcher
    dmManager.closeDM();
    const launcherHtml = dmManager.renderDMModal(myFP);
    expect(launcherHtml).toContain('Toggle Sovereign E2EE Direct Messages');
    expect(launcherHtml).toContain('bg-surface-raised');

    // Render Open Chat Modal
    dmManager.openDM(peerFP, 'GUARDIAN');
    dmManager.sendMessage('Encrypted UI test payload', myFP);
    const modalHtml = dmManager.renderDMModal(myFP);

    expect(modalHtml).toContain('sovereign-dm-modal');
    expect(modalHtml).toContain('sovereign-dm-messages-container');
    expect(modalHtml).toContain('TreeKEM SFrame');
    expect(modalHtml).toContain('Encrypted UI test payload');
    expect(modalHtml).toContain('bg-surface-base');

    // Render Raw Ciphertext toggle
    dmManager.toggleCiphertext();
    expect(dmManager.showCiphertextToggle).toBe(true);
    const ciphertextModal = dmManager.renderDMModal(myFP);
    expect(ciphertextModal).toContain('SFRAME::v2.4::');
  });
});
