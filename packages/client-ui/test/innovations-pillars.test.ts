import { describe, it, expect, beforeEach } from 'vitest';
import { sovereignDM } from '../src/sovereign-dm.js';
import { aiAssistant } from '../src/ai-assistant.js';

describe('Innovations Suite: Pillar 1, Pillar 3, and Pillar 5', () => {
  beforeEach(() => {
    sovereignDM.closeDM();
    sovereignDM.revealedStegoMap.clear();
    sovereignDM.isStegoModeActive = false;
    sovereignDM.pqcBenchmarkResult = null;
  });

  describe('Pillar 1: Quantum-Safe Messaging LIVE (NIST FIPS 203 ML-KEM-768)', () => {
    it('executes live hybrid ML-KEM-768 + X25519 key exchange benchmark', () => {
      const benchmark = sovereignDM.runPQCExchangeBenchmark();

      expect(benchmark).toBeDefined();
      expect(benchmark.verified).toBe(true);
      expect(benchmark.timeMs).toBeGreaterThan(0);
      expect(benchmark.sharedSecretHex).toHaveLength(64); // 32 bytes in hex
      expect(sovereignDM.pqcBenchmarkResult).toEqual(benchmark);
    });

    it('renders ML-KEM-768 active shield badge and quantum inspector drawer HTML', () => {
      const peerFP = 'c3dc28cb705e';
      const myFP = 'me_local_node_0x9f4e';
      sovereignDM.openDM(peerFP);
      sovereignDM.isQuantumInspectorOpen = true;

      const modalHtml = sovereignDM.renderDMModal(myFP);

      // Verify ML-KEM-768 header badge
      expect(modalHtml).toContain('btn-pqc-shield-badge');
      expect(modalHtml).toContain('ML-KEM-768');

      // Verify Quantum Shield Drawer
      expect(modalHtml).toContain('quantum-shield-drawer');
      expect(modalHtml).toContain('Quantum Shield Inspector');
      expect(modalHtml).toContain('NIST FIPS 203 ML-KEM-768 + X25519');
      expect(modalHtml).toContain('Z_q[X]/(X^256+1)');
      expect(modalHtml).toContain('q = 3329');
      expect(modalHtml).toContain('k = 3 (Kyber)');
      expect(modalHtml).toContain('1,088 Bytes');
      expect(modalHtml).toContain('1,120 Bytes');
      expect(modalHtml).toContain('AETHERIS_HYBRID_PQC_ML_KEM_768_V1');
      expect(modalHtml).toContain('btn-run-pqc-benchmark');
    });

    it('toggles quantum inspector open and closed', () => {
      expect(sovereignDM.isQuantumInspectorOpen).toBe(false);
      sovereignDM.toggleQuantumInspector();
      expect(sovereignDM.isQuantumInspectorOpen).toBe(true);
      sovereignDM.toggleQuantumInspector();
      expect(sovereignDM.isQuantumInspectorOpen).toBe(false);
    });
  });

  describe('Pillar 3: Deniable Steganography Chat (2-bit LSB PNG Carrier)', () => {
    it('toggles stego mode on and off', () => {
      expect(sovereignDM.isStegoModeActive).toBe(false);
      sovereignDM.toggleStegoMode();
      expect(sovereignDM.isStegoModeActive).toBe(true);
      sovereignDM.toggleStegoMode();
      expect(sovereignDM.isStegoModeActive).toBe(false);
    });

    it('renders stego mode button and armed indicator in DM modal', () => {
      sovereignDM.openDM('c3dc28cb705e');
      sovereignDM.isStegoModeActive = true;

      const modalHtml = sovereignDM.renderDMModal('me_local_node_0x9f4e');
      expect(modalHtml).toContain('btn-stego-mode-toggle');
      expect(modalHtml).toContain('Stego ON');
      expect(modalHtml).toContain('2-Bit LSB Pixel Carrier Synthesis Armed');
      expect(modalHtml).toContain('DENIABLE TIER');
    });

    it('refuses to fabricate a steganographic transmission without a browser canvas', async () => {
      sovereignDM.openDM('c3dc28cb705e');
      sovereignDM.isStegoModeActive = true;

      const before = sovereignDM.getConversation('c3dc28cb705e')!.messages.length;
      await expect(sovereignDM.sendMessage('Classified operational pulse for whistleblowers')).rejects.toThrow('browser canvas');

      const conv = sovereignDM.getConversation('c3dc28cb705e');
      expect(conv).toBeDefined();
      expect(conv!.messages.length).toBe(before);
    });

    it('renders a carrier but never fabricates a decoded result when canvas is unavailable', async () => {
      const msgId = 'msg_stego_test_123';
      const syntheticCarrierPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const stegoPlaintext = `STEG_CARRIER_V1::${syntheticCarrierPng}::[Decoy: Routine network heartbeat ping]`;

      const msg = {
        id: msgId,
        senderFP: 'c3dc28cb705e',
        receiverFP: 'me_local_node_0x9f4e',
        encryptedPayload: 'SFRAME::v2.4::EP1::GEN0::00::MAC00',
        plaintext: stegoPlaintext,
        timestamp: Date.now(),
        isRead: true,
      };

      // Unrevealed state
      const unrevealedHtml = sovereignDM.renderMessageItem(msg, 'me_local_node_0x9f4e');
      expect(unrevealedHtml).toContain('STEGANOGRAPHIC CARRIER');
      expect(unrevealedHtml).toContain(`btn-reveal-stego-${msgId}`);
      expect(unrevealedHtml).toContain('Extract Plaintext');

      // Reveal message
      await sovereignDM.revealStego(msgId, syntheticCarrierPng);

      // Revealed state
      const revealedHtml = sovereignDM.renderMessageItem(msg, 'me_local_node_0x9f4e');
      expect(sovereignDM.revealedStegoMap.has(msgId)).toBe(false);
      expect(revealedHtml).not.toContain('Decoded confidential transmission');
    });
  });

  describe('Pillar 5: On-Device AI Zero-Cloud Guarantee Inspector', () => {
    it('renders zero-cloud audit tab with real-time 0B network telemetry', () => {
      const postId = 'post_telemetry_test_1';
      const content = 'Sovereign distributed consensus verification using zero knowledge proofs and post quantum lattices.';

      const state = aiAssistant.getOrCreatePanelState(postId, content);
      state.isOpen = true;
      state.activeTab = 'zero-cloud';
      const panelHtml = aiAssistant.renderAIPanel(postId, content);

      // Check tab button
      expect(panelHtml).toContain('data-ai-tab="zero-cloud"');
      expect(panelHtml).toContain('Zero-Cloud Audit');

      // Check zero-cloud telemetry metrics
      expect(panelHtml).toContain('100% LOCAL ZERO-CLOUD GUARANTEE');
      expect(panelHtml).toContain('No OpenAI · No Anthropic · No Cloud Telemetry · 0.00 USD Cost');
      expect(panelHtml).toContain('AIR-GAP SAFE');
      expect(panelHtml).toContain('Cloud Requests');
      expect(panelHtml).toContain('Bytes Exfiltrated');
      expect(panelHtml).toContain('0 B');
      expect(panelHtml).toContain('$0.00');

      // Check algorithmic pipeline details
      expect(panelHtml).toContain('TextRank Graph Centrality');
      expect(panelHtml).toContain('Sublinear TF-IDF + L2 Norm');
      expect(panelHtml).toContain('11 AST & Secret Heuristic Rules');
      expect(panelHtml).toContain('In-Memory Privacy Sandbox');

      // Check air-gap audit button
      expect(panelHtml).toContain(`btn-verify-airgap-${postId}`);
      expect(panelHtml).toContain('Run Air-Gap Audit');
    });
  });
});
