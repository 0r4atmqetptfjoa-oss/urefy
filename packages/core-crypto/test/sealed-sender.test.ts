import { describe, it, expect } from 'vitest';
import { createSovereignIdentity } from '../src/identity.js';
import { 
  createDeliveryCertificate, 
  verifyDeliveryCertificate, 
  sealSenderEnvelope, 
  unsealSenderEnvelope 
} from '../src/sealed-sender.js';

describe('Sealed Sender Protocol', () => {
  it('should round-trip seal and unseal an envelope', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    
    const cert = createDeliveryCertificate(sender, recipient.identity.fingerprint);
    const payload = { msg: 'Hello world' };
    
    const envelope = await sealSenderEnvelope(payload, cert, sender, recipient.identity);
    
    const unsealed = await unsealSenderEnvelope(envelope, recipient);
    
    expect(unsealed.payload).toEqual(payload);
    expect(unsealed.senderFingerprint).toBe(sender.identity.fingerprint);
    expect(unsealed.certificate.senderPublicKey).toBe(sender.identity.signingPublicKey);
  });
  
  it('should not contain sender fingerprint in public envelope fields', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, recipient.identity.fingerprint);
    const envelope = await sealSenderEnvelope('secret', cert, sender, recipient.identity);
    
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain(sender.identity.fingerprint);
  });
  
  it('server knowing only recipientFingerprint cannot identify sender', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, recipient.identity.fingerprint);
    const envelope = await sealSenderEnvelope('test', cert, sender, recipient.identity);
    
    expect(envelope.recipientFingerprint).toBe(recipient.identity.fingerprint);
    expect(envelope.ephemeralPublicKey).not.toBe(sender.identity.encryptionPublicKey);
  });
  
  it('should create and verify delivery certificate', () => {
    const sender = createSovereignIdentity();
    const recipientFingerprint = '1234567890abcdef';
    const cert = createDeliveryCertificate(sender, recipientFingerprint);
    expect(verifyDeliveryCertificate(cert)).toBe(true);
  });
  
  it('should reject expired delivery certificate', () => {
    const sender = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, 'recipient', -1000); // negative TTL
    expect(verifyDeliveryCertificate(cert)).toBe(false);
  });
  
  it('should reject certificate with invalid signature', () => {
    const sender = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, 'recipient');
    // Modify signature slightly
    cert.certificate = '00' + cert.certificate.slice(2);
    expect(verifyDeliveryCertificate(cert)).toBe(false);
  });
  
  it('should fail unseal if recipient fingerprint mismatch', async () => {
    const sender = createSovereignIdentity();
    const recipient1 = createSovereignIdentity();
    const recipient2 = createSovereignIdentity();
    
    const cert = createDeliveryCertificate(sender, recipient1.identity.fingerprint);
    const envelope = await sealSenderEnvelope('test', cert, sender, recipient1.identity);
    
    await expect(unsealSenderEnvelope(envelope, recipient2)).rejects.toThrow('Recipient fingerprint mismatch');
  });

  it('should unseal correctly with complex arbitrary objects', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, recipient.identity.fingerprint);
    
    const complexPayload = {
      id: 123,
      nested: { a: 'b', arr: [1, 2, 3] },
      flag: true,
    };
    
    const envelope = await sealSenderEnvelope(complexPayload, cert, sender, recipient.identity);
    const unsealed = await unsealSenderEnvelope(envelope, recipient);
    expect(unsealed.payload).toEqual(complexPayload);
  });
  
  it('should reject if cert recipient does not match envelope recipient', async () => {
    const sender = createSovereignIdentity();
    const recipient1 = createSovereignIdentity();
    const recipient2 = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, recipient2.identity.fingerprint);
    const envelope = await sealSenderEnvelope('test', cert, sender, recipient1.identity);
    
    await expect(unsealSenderEnvelope(envelope, recipient1)).rejects.toThrow('Certificate recipient mismatch');
  });
  
  it('should fail decryption if ciphertext is tampered', async () => {
    const sender = createSovereignIdentity();
    const recipient = createSovereignIdentity();
    const cert = createDeliveryCertificate(sender, recipient.identity.fingerprint);
    const envelope = await sealSenderEnvelope('test', cert, sender, recipient.identity);
    
    const ctChars = envelope.sealedContent.split('');
    ctChars[ctChars.length - 1] = ctChars[ctChars.length - 1] === '0' ? '1' : '0';
    envelope.sealedContent = ctChars.join('');
    
    await expect(unsealSenderEnvelope(envelope, recipient)).rejects.toThrow('Decryption failed');
  });
});
