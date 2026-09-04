import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportPortableReputationCertificate,
  verifyPortableReputationCertificate,
  PortableReputationCertificate,
} from '@aetheris/core-crypto';
import {
  PortableTrustModal,
  portableTrustModal,
  generateQRCodeSVG,
} from '../src/portable-trust-modal.js';
import {
  onRequestPost as handleVerifyTrustPost,
  onRequestGet as handleVerifyTrustGet,
  onRequestOptions as handleVerifyTrustOptions,
  validateAndVerifyCertificate,
} from '../functions/api/verify-trust.js';

describe('Pillar 2: Portable Trust Score (ZK-RLN as a Service) Suite', () => {
  const testSecretKey = new Uint8Array(32).fill(0x33);
  const testDomain = 'partner-forum.org';

  describe('1. Cryptographic Range Proof Generation & Verification', () => {
    it('should generate a valid Groth16 portable certificate for threshold 50', async () => {
      const cert = await exportPortableReputationCertificate(
        80,
        50,
        testSecretKey,
        testDomain
      );

      expect(cert.version).toBe('1.0');
      expect(cert.threshold).toBe(50);
      expect(cert.domain).toBe(testDomain);
      expect(cert.proof).toBeDefined();
      expect(cert.publicInputs.length).toBe(4);
      expect(cert.issuedAt).toBeGreaterThan(0);
      expect(cert.expiresAt).toBeGreaterThan(cert.issuedAt);

      const isValid = await verifyPortableReputationCertificate(cert, 50, testDomain);
      expect(isValid).toBe(true);
    });

    it('should generate valid certificates for thresholds 75 and 90', async () => {
      const cert75 = await exportPortableReputationCertificate(95, 75, testSecretKey, 'dao-governance.eth');
      expect(cert75.threshold).toBe(75);
      expect(await verifyPortableReputationCertificate(cert75, 75, 'dao-governance.eth')).toBe(true);

      const cert90 = await exportPortableReputationCertificate(98, 90, testSecretKey, 'validator-council.xyz');
      expect(cert90.threshold).toBe(90);
      expect(await verifyPortableReputationCertificate(cert90, 90, 'validator-council.xyz')).toBe(true);
    });

    it('should allow certificate with higher threshold to satisfy lower expected threshold', async () => {
      const cert = await exportPortableReputationCertificate(90, 75, testSecretKey, testDomain);
      // Expected threshold is 50, certificate proves >= 75 -> valid
      const isValid = await verifyPortableReputationCertificate(cert, 50, testDomain);
      expect(isValid).toBe(true);
    });

    it('should reject certificate when certificate threshold is lower than expected threshold', async () => {
      const cert50 = await exportPortableReputationCertificate(60, 50, testSecretKey, testDomain);
      // Expected threshold is 75, but certificate only proves >= 50
      const isValid = await verifyPortableReputationCertificate(cert50, 75, testDomain);
      expect(isValid).toBe(false);
    });

    it('should reject certificate when destination domain does not match (anti-replay)', async () => {
      const cert = await exportPortableReputationCertificate(85, 75, testSecretKey, 'partner-forum.org');
      const isValid = await verifyPortableReputationCertificate(cert, 75, 'attacker-forum.xyz');
      expect(isValid).toBe(false);
    });

    it('should reject expired certificates', async () => {
      const cert = await exportPortableReputationCertificate(85, 75, testSecretKey, testDomain, undefined, -5000);
      const isValid = await verifyPortableReputationCertificate(cert, 75, testDomain);
      expect(isValid).toBe(false);
    });

    it('should reject tampered public inputs or proofs', async () => {
      const cert = await exportPortableReputationCertificate(85, 75, testSecretKey, testDomain);
      const tampered = {
        ...cert,
        publicInputs: [cert.publicInputs[0], '99999999999', cert.publicInputs[2], cert.publicInputs[3]],
      };
      const isValid = await verifyPortableReputationCertificate(tampered, 75, testDomain);
      expect(isValid).toBe(false);
    });
  });

  describe('2. Vector SVG QR Code Synthesis', () => {
    it('should generate valid vector SVG markup with finder and timing patterns', () => {
      const svg = generateQRCodeSVG('https://aetheris.network/verify?test=123', 200);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 29 29"');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('width="200"');
      expect(svg).toContain('height="200"');
      expect(svg).toContain('<rect');
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain('fill="#0f172a"');
    });
  });

  describe('3. PortableTrustModal Component & State Management', () => {
    let modal: PortableTrustModal;

    beforeEach(() => {
      modal = new PortableTrustModal();
    });

    it('should initialize with default state and export tab', () => {
      expect(modal.isOpen).toBe(false);
      expect(modal.activeTab).toBe('export');
      expect(modal.selectedThreshold).toBe(75);
      expect(modal.destinationDomain).toBe('partner-forum.org');
      expect(modal.generatedCertificate).toBeNull();
    });

    it('should handle open, close, and toggle lifecycle', () => {
      expect(modal.isOpen).toBe(false);
      modal.open();
      expect(modal.isOpen).toBe(true);
      expect(modal.activeTab).toBe('export');

      modal.close();
      expect(modal.isOpen).toBe(false);

      modal.toggle('verify');
      expect(modal.isOpen).toBe(true);
      expect(modal.activeTab).toBe('verify');

      modal.toggle();
      expect(modal.isOpen).toBe(false);
    });

    it('should update threshold and domain', () => {
      modal.setThreshold(90);
      expect(modal.selectedThreshold).toBe(90);

      modal.setDestinationDomain('governance.arbitrum.eth');
      expect(modal.destinationDomain).toBe('governance.arbitrum.eth');
    });

    it('should generate proof and create formatted token, SVG QR code, and embed snippets', async () => {
      modal.userScore = 95;
      modal.selectedThreshold = 75;
      modal.destinationDomain = 'dao-voting.eth';

      const cert = await modal.generateProof();
      expect(cert).not.toBeNull();
      expect(cert?.threshold).toBe(75);
      expect(cert?.domain).toBe('dao-voting.eth');
      expect(modal.formattedToken).toContain('"domain": "dao-voting.eth"');
      expect(modal.qrCodeSvg).toContain('<svg');
      expect(modal.embedSnippet).toContain('<iframe src="https://aetheris.network/embed/trust-badge');
      expect(modal.curlSnippet).toContain('curl -X POST https://aetheris.network/api/verify-trust');
    });

    it('should render modal HTML for export tab with all required controls', async () => {
      modal.open('export');
      modal.selectedThreshold = 75;
      modal.destinationDomain = 'partner-forum.org';
      await modal.generateProof();

      const html = modal.renderModalHTML();
      expect(html).toContain('id="portable-trust-backdrop"');
      expect(html).toContain('id="btn-close-portable-trust"');
      expect(html).toContain('id="tab-btn-export-cert"');
      expect(html).toContain('id="tab-btn-verify-cert"');
      expect(html).toContain('id="btn-threshold-50"');
      expect(html).toContain('id="btn-threshold-75"');
      expect(html).toContain('id="btn-threshold-90"');
      expect(html).toContain('id="input-destination-domain"');
      expect(html).toContain('id="btn-generate-zk-proof"');
      expect(html).toContain('id="portable-trust-json-token"');
      expect(html).toContain('id="portable-trust-qr-code"');
      expect(html).toContain('id="portable-trust-embed-snippet"');
      expect(html).toContain('id="portable-trust-curl-snippet"');
    });

    it('should render modal HTML for verify tab and perform instant local verification', async () => {
      const validCert = await exportPortableReputationCertificate(85, 75, testSecretKey, 'partner-forum.org');
      modal.open('verify');
      modal.setPasteInput(JSON.stringify(validCert));

      const verified = await modal.verifyExternalCertificate();
      expect(verified).toBe(true);
      expect(modal.verificationResult?.verified).toBe(true);
      expect(modal.verificationResult?.threshold).toBe(75);
      expect(modal.verificationResult?.domain).toBe('partner-forum.org');

      const html = modal.renderModalHTML();
      expect(html).toContain('id="portable-trust-paste-input"');
      expect(html).toContain('id="btn-verify-external-cert"');
      expect(html).toContain('id="portable-trust-verified-badge"');
      expect(html).toContain('≥ 75');
      expect(html).toContain('partner-forum.org');
    });

    it('should render rejection badge on verification failure', async () => {
      modal.open('verify');
      const verified = await modal.verifyExternalCertificate('{"invalid":"cert"}');
      expect(verified).toBe(false);
      expect(modal.verificationResult?.verified).toBe(false);

      const html = modal.renderModalHTML();
      expect(html).toContain('id="portable-trust-rejected-badge"');
      expect(html).toContain('Verification Failed');
    });

    it('should verify window augmentation', () => {
      expect(portableTrustModal).toBeDefined();
      if (typeof window !== 'undefined') {
        expect(window.portableTrustModal).toBe(portableTrustModal);
        expect(typeof window.__aetheris_open_portable_trust).toBe('function');
        expect(typeof window.__aetheris_close_portable_trust).toBe('function');
      }
    });
  });

  describe('4. Cloudflare Pages Edge Function (/api/verify-trust)', () => {
    it('should successfully verify a valid certificate via POST /api/verify-trust', async () => {
      const cert = await exportPortableReputationCertificate(85, 75, testSecretKey, 'forum.sovereign.eth');

      const request = new Request('https://aetheris.network/api/verify-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate: cert,
          expectedThreshold: 75,
          domain: 'forum.sovereign.eth',
        }),
      });

      const response = await handleVerifyTrustPost({ request });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.verified).toBe(true);
      expect(json.threshold).toBe(75);
      expect(json.domain).toBe('forum.sovereign.eth');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should reject POST verification if expected threshold is not met', async () => {
      const cert = await exportPortableReputationCertificate(60, 50, testSecretKey, testDomain);

      const request = new Request('https://aetheris.network/api/verify-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate: cert,
          expectedThreshold: 90, // Expects 90, cert only 50
          domain: testDomain,
        }),
      });

      const response = await handleVerifyTrustPost({ request });
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.verified).toBe(false);
      expect(json.error).toContain('does not meet required threshold');
    });

    it('should reject POST verification if domain does not match', async () => {
      const cert = await exportPortableReputationCertificate(85, 75, testSecretKey, 'real-domain.com');

      const request = new Request('https://aetheris.network/api/verify-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificate: cert,
          expectedThreshold: 75,
          domain: 'fake-domain.com',
        }),
      });

      const response = await handleVerifyTrustPost({ request });
      expect(response.status).toBe(422);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.verified).toBe(false);
      expect(json.error).toContain('does not match expected domain');
    });

    it('should verify certificate via GET /api/verify-trust?cert=... helper', async () => {
      const cert = await exportPortableReputationCertificate(85, 75, testSecretKey, testDomain);
      const b64Cert = btoa(JSON.stringify(cert));

      const request = new Request(
        `https://aetheris.network/api/verify-trust?cert=${encodeURIComponent(b64Cert)}&domain=${testDomain}&threshold=75`,
        { method: 'GET' }
      );

      const response = await handleVerifyTrustGet({ request });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.verified).toBe(true);
      expect(json.threshold).toBe(75);
    });

    it('should return 400 on GET /api/verify-trust without cert parameter', async () => {
      const request = new Request('https://aetheris.network/api/verify-trust', { method: 'GET' });
      const response = await handleVerifyTrustGet({ request });
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Missing required query parameter: cert');
    });

    it('should handle CORS preflight OPTIONS request', async () => {
      const response = await handleVerifyTrustOptions();
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });
});
