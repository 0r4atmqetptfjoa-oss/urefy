import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  generateKeyPair,
  createSovereignIdentity,
  bytesToHex,
  hexToBytes,
} from '@aetheris/core-crypto';

console.log('════════════════════════════════════════════════════════════════');
console.log('  PASS 2: IDENTITY RECOVERY & EXPORT/IMPORT INTEGRITY SUITE');
console.log('════════════════════════════════════════════════════════════════\n');

const results = {};

function runSuite() {
  // ─── 1. DISPOSABLE RECOVERY IDENTITY CREATION ──────────────────────────────
  console.log('[Test 1] Creating disposable Sovereign Identity...');
  const mnemonic1 = generateMnemonic(128);
  const words = mnemonic1.split(' ');
  console.log('Generated Mnemonic word count:', words.length);
  
  const seed1 = mnemonicToSeed(mnemonic1).subarray(0, 32);
  const keypair1 = generateKeyPair(seed1);
  const identity1 = createSovereignIdentity({ seed: seed1 });
  const fingerprint1 = identity1.identity.fingerprint;
  console.log('Original Identity Fingerprint:', fingerprint1);

  results.identityCreation = {
    fingerprint: fingerprint1,
    wordCount: words.length,
    validMnemonic: validateMnemonic(mnemonic1),
  };

  // ─── 2. DETERMINISTIC RESTORATION FROM RECOVERY PHRASE ──────────────────────
  console.log('\n[Test 2] Restoring identity from identical mnemonic in clean context...');
  const cleanMnemonic = mnemonic1.trim().toLowerCase().replace(/\s+/g, ' ');
  const isValidMnemonic = validateMnemonic(cleanMnemonic);
  const restoredSeed = mnemonicToSeed(cleanMnemonic).subarray(0, 32);
  const restoredKeypair = generateKeyPair(restoredSeed);
  const restoredIdentity = createSovereignIdentity({ seed: restoredSeed });
  const restoredFingerprint = restoredIdentity.identity.fingerprint;

  console.log('Restored Identity Fingerprint:', restoredFingerprint);
  const matches = restoredFingerprint === fingerprint1 && bytesToHex(restoredKeypair.publicKey) === bytesToHex(keypair1.publicKey);
  console.log('Deterministic Match Result:', matches ? 'PASS' : 'FAIL');
  results.recoveryMatch = {
    originalFingerprint: fingerprint1,
    restoredFingerprint: restoredFingerprint,
    keysMatch: matches,
  };

  // ─── 3. WRONG WORD (CHECKSUM FAILURE) ──────────────────────────────────────
  console.log('\n[Test 3] Testing recovery phrase with one incorrect word...');
  const corruptedWords = [...words];
  corruptedWords[5] = corruptedWords[5] === 'abandon' ? 'ability' : 'abandon';
  const corruptedPhrase = corruptedWords.join(' ');
  const corruptValid = validateMnemonic(corruptedPhrase);
  console.log('Corrupted phrase validation result:', corruptValid);
  results.wrongWord = {
    corruptedAccepted: corruptValid,
    safeRejection: !corruptValid,
  };

  // ─── 4. WRONG WORD ORDER ───────────────────────────────────────────────────
  console.log('\n[Test 4] Testing recovery phrase with swapped word order...');
  const swappedWords = [...words];
  const temp = swappedWords[2];
  swappedWords[2] = swappedWords[3];
  swappedWords[3] = temp;
  const swappedPhrase = swappedWords.join(' ');
  const swappedValid = validateMnemonic(swappedPhrase);
  console.log('Swapped order validation result:', swappedValid);
  results.swappedOrder = {
    swappedAccepted: swappedValid,
    safeRejection: !swappedValid,
  };

  // ─── 5. MISSING AND EXTRA WORDS ────────────────────────────────────────────
  console.log('\n[Test 5] Testing truncated (11 words) and extra (13 words) phrases...');
  const truncated11 = words.slice(0, 11).join(' ');
  const extra13 = [...words, words[0]].join(' ');
  const truncValid = validateMnemonic(truncated11);
  const extraValid = validateMnemonic(extra13);
  console.log('11 words validation:', truncValid, '| 13 words validation:', extraValid);
  results.lengthValidation = {
    truncatedAccepted: truncValid,
    extraAccepted: extraValid,
    safeRejection: !truncValid && !extraValid,
  };

  // ─── 6. IDENTITY EXPORT / IMPORT ATOMICITY ──────────────────────────────────
  console.log('\n[Test 6] Testing Identity Export & Import...');
  const exportPackage = {
    version: 1,
    fingerprint: fingerprint1,
    publicKey: bytesToHex(keypair1.publicKey),
    seedHex: bytesToHex(seed1),
    mnemonic: mnemonic1,
    createdAt: Date.now(),
  };

  // Validate valid import
  function validateAndImport(pkg) {
    if (!pkg || typeof pkg !== 'object') throw new Error('Invalid export package');
    if (!pkg.fingerprint || !pkg.seedHex) throw new Error('Missing identity fields');
    if (!/^[0-9a-f]{64}$/i.test(pkg.seedHex)) throw new Error('Malformed seedHex');
    const impSeed = hexToBytes(pkg.seedHex);
    const impIdent = createSovereignIdentity({ seed: impSeed });
    if (impIdent.identity.fingerprint !== pkg.fingerprint) {
      throw new Error('Cryptographic fingerprint does not match seed payload');
    }
    return impIdent.identity.fingerprint;
  }

  const importedFp = validateAndImport(exportPackage);
  console.log('Valid export imported successfully, fingerprint:', importedFp);

  // Test corrupted / tampered export
  console.log('\n[Test 6b] Testing corrupted export tampering...');
  const tamperedPackage = {
    ...exportPackage,
    seedHex: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Modified seed
  };
  let tamperedRejected = false;
  try {
    validateAndImport(tamperedPackage);
  } catch (err) {
    tamperedRejected = true;
    console.log('Tampered package rejected safely:', err.message);
  }

  results.exportImport = {
    validImportSuccess: importedFp === fingerprint1,
    tamperedPackageRejected: tamperedRejected,
  };

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  RECOVERY & EXPORT/IMPORT SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('════════════════════════════════════════════════════════════════');
}

runSuite();
