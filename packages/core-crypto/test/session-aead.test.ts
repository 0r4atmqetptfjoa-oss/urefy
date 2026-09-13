import { describe, it, expect } from 'vitest';
import { 
  createSessionContext, 
  deriveSessionTag, 
  encryptWithSession, 
  decryptWithSession,
  type SessionContext
} from '../src/session-aead.js';
import { bytesToHex } from '@noble/hashes/utils';

describe('Session AEAD Protocol', () => {
  it('should encrypt and decrypt round-trip', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const senderCtx = createSessionContext('sender123', 'recipient456', key);
    const receiverCtx: SessionContext = { ...senderCtx, localFingerprint: 'recipient456', remoteFingerprint: 'sender123' };
    
    const { envelope, context: newSenderCtx } = await encryptWithSession('hello world', senderCtx);
    const { plaintext, context: newReceiverCtx } = await decryptWithSession(envelope, receiverCtx);
    
    expect(plaintext).toBe('hello world');
    expect(newSenderCtx.messageCounter).toBe(1);
    expect(newReceiverCtx.messageCounter).toBe(1);
  });
  
  it('cross-session replay should throw', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const ctx1 = createSessionContext('a', 'b', key);
    const ctx2 = createSessionContext('a', 'b', key); // different session id
    
    const { envelope } = await encryptWithSession('test', ctx1);
    
    const receiverCtx2: SessionContext = { ...ctx2, localFingerprint: 'b', remoteFingerprint: 'a' };
    
    await expect(decryptWithSession(envelope, receiverCtx2)).rejects.toThrow('Session ID mismatch');
  });

  it('fingerprint mismatch should throw', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const ctx = createSessionContext('a', 'b', key);
    const { envelope } = await encryptWithSession('test', ctx);
    
    const receiverCtx: SessionContext = { ...ctx, localFingerprint: 'b', remoteFingerprint: 'c' };
    await expect(decryptWithSession(envelope, receiverCtx)).rejects.toThrow('Sender fingerprint mismatch');
  });

  it('session tag tampering should throw', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const ctx = createSessionContext('a', 'b', key);
    const { envelope } = await encryptWithSession('test', ctx);
    
    envelope.sessionTag = '00'.repeat(16);
    
    const receiverCtx: SessionContext = { ...ctx, localFingerprint: 'b', remoteFingerprint: 'a' };
    await expect(decryptWithSession(envelope, receiverCtx)).rejects.toThrow('Session binding violation');
  });

  it('messageIndex replay should throw', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const ctx = createSessionContext('a', 'b', key);
    const { envelope } = await encryptWithSession('test', ctx);
    
    const receiverCtx: SessionContext = { ...ctx, localFingerprint: 'b', remoteFingerprint: 'a' };
    const { context: nextReceiverCtx } = await decryptWithSession(envelope, receiverCtx);
    
    await expect(decryptWithSession(envelope, nextReceiverCtx)).rejects.toThrow('Message replay detected');
  });
  
  it('multiple messages ordering with counter', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    let senderCtx = createSessionContext('a', 'b', key);
    let receiverCtx: SessionContext = { ...senderCtx, localFingerprint: 'b', remoteFingerprint: 'a' };
    
    const { envelope: env1, context: sCtx1 } = await encryptWithSession('msg1', senderCtx);
    const { envelope: env2, context: sCtx2 } = await encryptWithSession('msg2', sCtx1);
    const { envelope: env3, context: sCtx3 } = await encryptWithSession('msg3', sCtx2);
    
    let dec1 = await decryptWithSession(env1, receiverCtx);
    expect(dec1.plaintext).toBe('msg1');
    receiverCtx = dec1.context;
    
    let dec2 = await decryptWithSession(env2, receiverCtx);
    expect(dec2.plaintext).toBe('msg2');
    receiverCtx = dec2.context;
    
    await expect(decryptWithSession(env1, receiverCtx)).rejects.toThrow('Message replay detected');
  });
  
  it('deriving session tag is deterministic', () => {
    const key = new Uint8Array(32);
    key.fill(1);
    const id = '1234-5678';
    
    const tag1 = deriveSessionTag(key, id);
    const tag2 = deriveSessionTag(key, id);
    expect(bytesToHex(tag1)).toBe(bytesToHex(tag2));
  });
  
  it('decrypting with tampered ciphertext throws', async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const ctx = createSessionContext('a', 'b', key);
    const { envelope } = await encryptWithSession('test', ctx);
    
    const ctChars = envelope.ciphertext.split('');
    ctChars[ctChars.length - 1] = ctChars[ctChars.length - 1] === '0' ? '1' : '0';
    envelope.ciphertext = ctChars.join('');
    
    const receiverCtx: SessionContext = { ...ctx, localFingerprint: 'b', remoteFingerprint: 'a' };
    await expect(decryptWithSession(envelope, receiverCtx)).rejects.toThrow('Decryption failed');
  });

  it('createSessionContext creates copy of key, avoids mutation side effects', () => {
    const key = new Uint8Array(32);
    key.fill(1);
    const ctx = createSessionContext('a', 'b', key);
    key[0] = 2; // Mutate original
    expect(ctx.sessionKey[0]).toBe(1);
  });
  
  it('session key length mismatch throws', () => {
    const key = new Uint8Array(16);
    expect(() => createSessionContext('a', 'b', key)).toThrow('Session key must be 32 bytes');
  });
});
