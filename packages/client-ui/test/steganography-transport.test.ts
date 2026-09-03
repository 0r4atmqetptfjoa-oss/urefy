import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SteganographicFallbackTransport,
  E2EEPulse,
  CENSORSHIP_TIMEOUT_MS,
  createSyntheticCarrierImage,
} from '../src/steganography-transport.js';

describe('Innovation 7: Anti-Censorship Steganographic Fallback Transport', () => {
  let transport: SteganographicFallbackTransport;

  beforeEach(() => {
    transport = new SteganographicFallbackTransport({
      censorshipThresholdMs: CENSORSHIP_TIMEOUT_MS, // 15,000ms
      carrierWidth: 100,
      carrierHeight: 100,
    });
  });

  describe('Censorship Detection & Failover Trigger', () => {
    it('remains on PRIMARY_WEBSOCKET during normal heartbeats', () => {
      const now = 100000;
      transport.recordWsHeartbeat(now);

      expect(transport.getTransportMode()).toBe('PRIMARY_WEBSOCKET');
      expect(transport.isCensored()).toBe(false);

      // Check after 5 seconds: still within 15s window
      expect(transport.checkCensorshipStatus(now + 5000)).toBe(false);
      expect(transport.getTransportMode()).toBe('PRIMARY_WEBSOCKET');
    });

    it('does not trigger censorship failover if failure duration is under 15 seconds', () => {
      const t0 = 100000;
      transport.recordWsHeartbeat(t0);

      // Failure occurs at t0 + 10s
      transport.recordWsFailure(t0 + 10000);
      expect(transport.getTransportMode()).toBe('PRIMARY_WEBSOCKET');
      expect(transport.isCensored()).toBe(false);
    });

    it('automatically fails over to FALLBACK_STEGANOGRAPHY when connection fails for > 15 seconds', () => {
      const modeListener = vi.fn();
      transport.onTransportModeChange(modeListener);

      const t0 = 100000;
      transport.recordWsHeartbeat(t0);

      // Simulate network censorship blocking WebSocket for 16 seconds
      const isCensored = transport.recordWsFailure(t0 + 16000);

      expect(isCensored).toBe(true);
      expect(transport.getTransportMode()).toBe('FALLBACK_STEGANOGRAPHY');
      expect(transport.isCensored()).toBe(true);
      expect(modeListener).toHaveBeenCalledWith('FALLBACK_STEGANOGRAPHY');
    });

    it('recovers to PRIMARY_WEBSOCKET when WebSocket connection is restored', () => {
      const t0 = 100000;
      transport.recordWsHeartbeat(t0);
      transport.recordWsFailure(t0 + 16000);
      expect(transport.getTransportMode()).toBe('FALLBACK_STEGANOGRAPHY');

      // Uncensored / restored heartbeat
      transport.recordWsHeartbeat(t0 + 20000);
      expect(transport.getTransportMode()).toBe('PRIMARY_WEBSOCKET');
      expect(transport.isCensored()).toBe(false);
    });
  });

  describe('2-Bit LSB PNG Carrier Encoding/Decoding Roundtrip', () => {
    it('packages outgoing urgent E2EE pulse into PNG carrier and extracts with 100% E2EE intact', async () => {
      const urgentPulse: E2EEPulse = {
        id: 'pulse_urgent_9901',
        topic: 'emergency_beacon',
        senderFingerprint: '0x8899aabbccddeeff',
        recipientFingerprint: '0x1122334455667788',
        encryptedPayload: 'AES-256-GCM:dGVzdF9jaXBoZXJfdGV4dF9lMmVlX3B1bHNl',
        iv: '0102030405060708090a0b0c',
        signature: 'ed25519_sig_sovereign_transmission_proof_hash_123',
        timestamp: 1725391200000,
        priority: 'URGENT',
      };

      // 1. Encode into carrier
      const { carrierData, packet } = await transport.encodePulseIntoCarrier(urgentPulse);
      expect(packet.pulseId).toBe(urgentPulse.id);
      expect(carrierData).toBeDefined();
      expect(carrierData.width).toBe(100);
      expect(carrierData.height).toBe(100);

      // 2. Decode from carrier
      const decodedPulse = await transport.extractPulseFromCarrier(carrierData);

      // Verify 100% E2EE integrity preserved
      expect(decodedPulse.id).toBe(urgentPulse.id);
      expect(decodedPulse.encryptedPayload).toBe(urgentPulse.encryptedPayload);
      expect(decodedPulse.iv).toBe(urgentPulse.iv);
      expect(decodedPulse.signature).toBe(urgentPulse.signature);
      expect(decodedPulse.senderFingerprint).toBe(urgentPulse.senderFingerprint);
      expect(decodedPulse.priority).toBe('URGENT');
    });

    it('works with optional steganographic passphrase encryption', async () => {
      const secureTransport = new SteganographicFallbackTransport({
        passphrase: 'EmergencyStegKey2026!',
        carrierWidth: 110,
        carrierHeight: 110,
      });

      const pulse: E2EEPulse = {
        id: 'pulse_double_encrypted_42',
        senderFingerprint: '0xaa11bb22',
        encryptedPayload: 'DoubleEncryptedCiphertext_ABC123',
        timestamp: Date.now(),
        priority: 'URGENT',
      };

      const { carrierData } = await secureTransport.encodePulseIntoCarrier(pulse);
      const decoded = await secureTransport.extractPulseFromCarrier(carrierData);

      expect(decoded.id).toBe(pulse.id);
      expect(decoded.encryptedPayload).toBe(pulse.encryptedPayload);
    });

    it('creates synthetic carrier image with valid dimensions and opaque alpha', () => {
      const carrier = createSyntheticCarrierImage(80, 80);
      expect(carrier.width).toBe(80);
      expect(carrier.height).toBe(80);
      expect(carrier.data.length).toBe(80 * 80 * 4);

      // Verify all alpha pixels are 255 (opaque)
      for (let i = 3; i < carrier.data.length; i += 4) {
        expect(carrier.data[i]).toBe(255);
      }
    });
  });

  describe('Fallback Failover & Inbound CDN Carrier Polling', () => {
    it('routes urgent pulses via Steganographic Image Transport when censored and polls inbound carriers', async () => {
      const t0 = 100000;
      transport.recordWsHeartbeat(t0);
      // Mark as censored (> 15 seconds)
      transport.recordWsFailure(t0 + 16000);
      expect(transport.getTransportMode()).toBe('FALLBACK_STEGANOGRAPHY');

      const urgentPulse: E2EEPulse = {
        id: 'pulse_censorship_bypass_01',
        senderFingerprint: '0x99887766',
        encryptedPayload: 'E2EE_PULSE_PAYLOAD_FIREWALL_BYPASSED',
        timestamp: Date.now(),
        priority: 'URGENT',
      };

      // Outgoing pulse automatically uses Steganographic Image Transport
      const sendResult = await transport.sendPulse(urgentPulse, t0 + 16000);
      expect(sendResult.mode).toBe('FALLBACK_STEGANOGRAPHY');
      expect(sendResult.deliveredViaWebSocket).toBe(false);
      expect(sendResult.carrierPacket).toBeDefined();
      expect(sendResult.carrierPacket?.pulseId).toBe(urgentPulse.id);
      expect(sendResult.carrierPacket?.carrierUrl).toContain('cdn.sovereign.io/carriers');

      // Inbound adapter polling CDN carriers
      const receivedMessages: E2EEPulse[] = [];
      transport.onMessage((p) => {
        receivedMessages.push(p);
      });

      const polledPulses = await transport.pollAndExtractCarriers();
      expect(polledPulses.length).toBe(1);
      expect(polledPulses[0].id).toBe(urgentPulse.id);
      expect(polledPulses[0].encryptedPayload).toBe(urgentPulse.encryptedPayload);

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].id).toBe(urgentPulse.id);
    });

    it('uses primary WebSocket when network is not censored', async () => {
      transport.recordWsHeartbeat(Date.now());
      expect(transport.getTransportMode()).toBe('PRIMARY_WEBSOCKET');

      const pulse: E2EEPulse = {
        id: 'pulse_normal_01',
        senderFingerprint: '0x1234',
        encryptedPayload: 'NORMAL_E2EE_DATA',
        timestamp: Date.now(),
        priority: 'NORMAL',
      };

      const sendResult = await transport.sendPulse(pulse);
      expect(sendResult.mode).toBe('PRIMARY_WEBSOCKET');
      expect(sendResult.deliveredViaWebSocket).toBe(true);
      expect(sendResult.carrierPacket).toBeUndefined();
    });
  });
});
