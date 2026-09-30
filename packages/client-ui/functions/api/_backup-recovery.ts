export interface BackupRecoveryEnvelope {
  version: 1;
  algorithm: 'RSA-OAEP-SHA256';
  keyDerivation: 'AES256GCM-SHA256';
  recipientKeySha256: string;
  wrappedKey: string;
}

/** Wrap only the infrastructure backup key for the owner's local recovery key. */
export async function wrapBackupRecoveryKey(secret: string, publicKeyDerBase64: string): Promise<BackupRecoveryEnvelope> {
  const der = Uint8Array.from(atob(publicKeyDerBase64), c => c.charCodeAt(0));
  const recipient = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  if ((recipient.algorithm as RsaHashedKeyAlgorithm).modulusLength < 3072) throw new Error('Recovery RSA key must be at least 3072 bits.');
  const derivedKey = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const wrapped = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, recipient, derivedKey));
  const fingerprint = new Uint8Array(await crypto.subtle.digest('SHA-256', der));
  return {
    version: 1,
    algorithm: 'RSA-OAEP-SHA256',
    keyDerivation: 'AES256GCM-SHA256',
    recipientKeySha256: Array.from(fingerprint, b => b.toString(16).padStart(2, '0')).join(''),
    wrappedKey: btoa(String.fromCharCode(...wrapped)),
  };
}
