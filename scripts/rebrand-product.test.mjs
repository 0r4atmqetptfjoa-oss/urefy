import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rebrandProduct } from './rebrand-product.mjs';

test('renames product text and headings', () => {
  assert.equal(rebrandProduct('<h1>AETHERIS // SOVEREIGN WELCOME</h1>'), '<h1>UREfy // SOVEREIGN WELCOME</h1>');
  assert.equal(rebrandProduct('Welcome to Aetheris Omni-Sphere. Aetheris never holds your keys.'), 'Welcome to UREfy. UREfy never holds your keys.');
  assert.equal(rebrandProduct('Install Aetheris as Native App'), 'Install UREfy as Native App');
  assert.equal(rebrandProduct('Powered by Aetheris.'), 'Powered by UREfy.');
  assert.equal(rebrandProduct('anchor.download = `aetheris-recovery-${date}.txt`'), 'anchor.download = `urefy-recovery-${date}.txt`');
});

test('preserves storage keys, protocol identifiers, package names and infrastructure', () => {
  const text = "aetheris_identity AETHERIS_DOMAIN AetherisClientStore @aetheris/core-crypto aetheris-edge-relay AETHERIS:V1";
  assert.equal(rebrandProduct(text), text);
});

test('is idempotent', () => {
  const renamed = rebrandProduct('Aetheris Omni-Sphere');
  assert.equal(rebrandProduct(renamed), renamed);
});

test('uses the current public domain and existing published contact', () => {
  assert.equal(rebrandProduct('https://aetheris.network/privacy legal@aetheris.network'), 'https://urefy.com/privacy razvan@urefy.com');
});