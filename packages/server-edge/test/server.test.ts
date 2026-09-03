import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AetherisServer } from '../src/server.js';
import { AetherisDatabase } from '../src/db/database.js';
import { executeAtomicRollback } from '../src/rollback.js';
import { WebSocket } from 'ws';
import { generateKeyPair, ZKRLN, Field } from '@aetheris/core-crypto';

describe('Server Edge & Real-time Signaling Engine', () => {
  let server: AetherisServer;
  const TEST_PORT = 4199;

  beforeAll(async () => {
    server = new AetherisServer({ port: TEST_PORT });
    await server.listen(TEST_PORT);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Database Operations & 24h Atomic Rollback', () => {
    it('records actions and rolls them back atomically', () => {
      const db = new AetherisDatabase(':memory:');
      const modFingerprint = 'mod-bad-actor-999';
      const msgId = 'msg-target-to-hide';

      // Seed a message
      db.insertMessage({
        id: msgId,
        channelId: 'relays-general',
        authorFingerprint: 'innocent-user',
        ciphertext: 'deadbeef',
        iv: '0102030405060708090a0b0c',
        epoch: 'epoch_1',
        x: '11',
        y: '22',
        nullifier: 'null-1',
        signature: 'sig',
        status: 'VISIBLE',
        createdAt: Date.now(),
      });

      // Rogue moderator hides the message
      db.updateMessageStatus(msgId, 'HIDDEN');
      db.recordAudit({
        actionType: 'HIDE_MESSAGE',
        actorFingerprint: modFingerprint,
        targetId: msgId,
        payloadJson: JSON.stringify({ reason: 'abuse' }),
        timestamp: Date.now(),
      });

      expect(db.getMessages('relays-general').length).toBe(0);

      // Execute 24-hour Atomic Rollback
      const result = executeAtomicRollback(db, modFingerprint, 'admin-fingerprint');
      expect(result.success).toBe(true);
      expect(result.revertedActionsCount).toBe(1);

      // Message is restored to VISIBLE
      const restored = db.getMessages('relays-general');
      expect(restored.length).toBe(1);
      expect(restored[0].id).toBe(msgId);
      expect(restored[0].status).toBe('VISIBLE');
    });
  });

  describe('WebSocket Communication & ZK-RLN Slashing Interception', () => {
    it('authenticates, routes messages, and slashes spammer on duplicate epoch share', async () => {
      const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
      const userKey = generateKeyPair();
      const userSecret = Field.hashToField('my-super-secret-key-12345');
      const nullifier = ZKRLN.computeNullifier(userSecret);
      const epoch = 'epoch_network_test_001';

      await new Promise((resolve) => ws.on('open', resolve));

      const receivedPackets: any[] = [];
      ws.on('message', (data) => {
        receivedPackets.push(JSON.parse(data.toString()));
      });

      // 1. Send AUTH
      ws.send(JSON.stringify({
        type: 'AUTH',
        fingerprint: userKey.fingerprint,
        publicKeyHex: userKey.publicKeyHex,
        nullifier,
        role: 'MEMBER',
      }));

      await new Promise(r => setTimeout(r, 100));
      expect(receivedPackets.some(p => p.type === 'AUTH_SUCCESS')).toBe(true);

      // 2. Join Channel
      ws.send(JSON.stringify({
        type: 'JOIN_CHANNEL',
        channelId: 'relays-general',
      }));

      await new Promise(r => setTimeout(r, 100));
      expect(receivedPackets.some(p => p.type === 'CHANNEL_DATA')).toBe(true);

      // 3. Send Legitimate Message #1
      const share1 = ZKRLN.createShare(userSecret, epoch, 'Valid Message #1');
      ws.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        channelId: 'relays-general',
        ciphertext: 'encrypted_payload_1',
        iv: '123456789012345678901234',
        epoch: share1.epoch,
        x: share1.x,
        y: share1.y,
        nullifier: share1.nullifier,
      }));

      await new Promise(r => setTimeout(r, 150));
      expect(receivedPackets.some(p => p.type === 'NEW_MESSAGE')).toBe(true);

      // 4. Send SPAM Message #2 in the SAME epoch
      const share2 = ZKRLN.createShare(userSecret, epoch, 'Spam Message #2 Duplicate Attack');
      ws.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        channelId: 'relays-general',
        ciphertext: 'encrypted_spam_payload',
        iv: '123456789012345678901234',
        epoch: share2.epoch,
        x: share2.x,
        y: share2.y,
        nullifier: share2.nullifier,
      }));

      await new Promise(r => setTimeout(r, 200));

      // Network must have triggered slashing and issued QUARANTINE_ALERT!
      const alert = receivedPackets.find(p => p.type === 'QUARANTINE_ALERT');
      expect(alert).toBeDefined();
      expect(alert.nullifier).toBe(nullifier);

      // Extracted secret key must match original secret
      const originalSecretHex = Field.mod(userSecret).toString(16).padStart(64, '0');
      expect(alert.extractedSecretKey).toBe(originalSecretHex);

      ws.close();
    });
  });
});
