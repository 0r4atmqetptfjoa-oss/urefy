import { describe, it, expect } from 'vitest';
import {
  generateDeviceKeypair,
  issueDeviceCertificate,
  verifyDeviceCertificate,
  createDeviceSignedEnvelope,
  verifyDeviceSignedEnvelope,
} from '../src/device-auth.js';
import { createSovereignIdentity } from '../src/identity.js';

describe('PASS 7.3.4: Device Authority & Cryptographic Separation', () => {
  const rootKeys = createSovereignIdentity();

  it('generates unique physical device keypairs with valid Ed25519 keys', () => {
    const dev1 = generateDeviceKeypair();
    const dev2 = generateDeviceKeypair();

    expect(dev1.deviceId).toMatch(/^dev_[a-zA-Z0-9_-]+$/);
    expect(dev2.deviceId).toMatch(/^dev_[a-zA-Z0-9_-]+$/);
    expect(dev1.deviceId).not.toBe(dev2.deviceId);

    expect(dev1.publicKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(dev1.privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(dev1.publicKeyHex).not.toBe(dev2.publicKeyHex);
  });

  it('allows specifying custom device IDs within valid bounds', () => {
    const dev = generateDeviceKeypair('custom_laptop_device_01');
    expect(dev.deviceId).toBe('custom_laptop_device_01');
  });

  it('issues and verifies a root-signed DeviceCertificate', () => {
    const dev = generateDeviceKeypair();
    const { certificate, signature } = issueDeviceCertificate(
      rootKeys,
      dev.deviceId,
      dev.publicKeyHex,
      'Alice MacBook Pro'
    );

    expect(certificate.identityFingerprint).toBe(rootKeys.identity.fingerprint);
    expect(certificate.deviceId).toBe(dev.deviceId);
    expect(certificate.devicePublicKey).toBe(dev.publicKeyHex.toLowerCase());
    expect(certificate.deviceLabel).toBe('Alice MacBook Pro');

    const isValid = verifyDeviceCertificate(certificate, signature, rootKeys.identity.signingPublicKey);
    expect(isValid).toBe(true);

    // Rejects with wrong root public key
    const wrongRoot = createSovereignIdentity();
    const isWrongValid = verifyDeviceCertificate(certificate, signature, wrongRoot.identity.signingPublicKey);
    expect(isWrongValid).toBe(false);

    // Rejects tampered certificate (e.g. altered deviceId)
    const tamperedCert = { ...certificate, deviceId: 'dev_tampered_id' };
    expect(verifyDeviceCertificate(tamperedCert, signature, rootKeys.identity.signingPublicKey)).toBe(false);

    // Rejects tampered device public key
    const tamperedKey = { ...certificate, devicePublicKey: dev.publicKeyHex.replace(/^../, '99') };
    expect(verifyDeviceCertificate(tamperedKey, signature, rootKeys.identity.signingPublicKey)).toBe(false);
  });

  it('creates and verifies a DeviceSignedEnvelope for routine traffic', () => {
    const dev = generateDeviceKeypair();
    const payload = { action: 'send', messageId: 'msg_123', text: 'Routine encrypted traffic' };

    const envelope = createDeviceSignedEnvelope(payload, dev, rootKeys.identity.fingerprint);

    expect(envelope.authType).toBe('device');
    expect(envelope.version).toBe(2);
    expect(envelope.identityFingerprint).toBe(rootKeys.identity.fingerprint);
    expect(envelope.deviceId).toBe(dev.deviceId);
    expect(envelope.devicePublicKey).toBe(dev.publicKeyHex);
    expect(envelope.signature).toMatch(/^[0-9a-f]{128}$/);

    const verified = verifyDeviceSignedEnvelope(envelope);
    expect(verified.authorized).toBe(true);
    expect(verified.payload).toEqual(payload);
    expect(verified.deviceId).toBe(dev.deviceId);

    // Rejects tampered payload
    const tamperedPayloadEnvelope = {
      ...envelope,
      payload: { ...payload, text: 'Tampered content' },
    };
    expect(verifyDeviceSignedEnvelope(tamperedPayloadEnvelope).authorized).toBe(false);

    // Rejects tampered device public key
    const otherDev = generateDeviceKeypair();
    const tamperedKeyEnvelope = {
      ...envelope,
      devicePublicKey: otherDev.publicKeyHex,
    };
    expect(verifyDeviceSignedEnvelope(tamperedKeyEnvelope).authorized).toBe(false);
  });

  it('enforces timestamp freshness window on DeviceSignedEnvelope', () => {
    const dev = generateDeviceKeypair();
    const payload = { action: 'list', after: 0 };

    // Expired timestamp (10 minutes ago)
    const expiredEnvelope = createDeviceSignedEnvelope(payload, dev, rootKeys.identity.fingerprint, {
      timestamp: Date.now() - 600000,
    });

    const res = verifyDeviceSignedEnvelope(expiredEnvelope);
    expect(res.authorized).toBe(false);
    expect(res.stage).toBe('replay');
  });
});
