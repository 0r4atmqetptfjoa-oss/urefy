import { describe, it, expect } from 'vitest';
import { InlineDiffViewer, inlineDiffViewer } from '../src/diff-viewer.js';

describe('InlineDiffViewer Engine & Sandbox System', () => {
  const samplePatch = `--- a/kernel.c
+++ b/kernel.c
@@ -1,3 +1,4 @@
 #include <zk.h>
-int old_gate();
+int new_gate();
+void proof_verify();`;

  it('parses standard Unified Diff patch with additions, deletions, and normal context lines', () => {
    const viewer = new InlineDiffViewer();
    const diffLines = viewer.parseUnifiedDiff(samplePatch);

    expect(diffLines).toBeDefined();
    expect(diffLines.length).toBe(4);

    // Line 0: normal
    expect(diffLines[0]).toEqual({
      type: 'normal',
      content: '#include <zk.h>',
      oldLineNo: 1,
      newLineNo: 1,
    });

    // Line 1: remove
    expect(diffLines[1]).toEqual({
      type: 'remove',
      content: 'int old_gate();',
      oldLineNo: 2,
      newLineNo: undefined,
    });

    // Line 2: add
    expect(diffLines[2]).toEqual({
      type: 'add',
      content: 'int new_gate();',
      oldLineNo: undefined,
      newLineNo: 2,
    });

    // Line 3: add
    expect(diffLines[3]).toEqual({
      type: 'add',
      content: 'void proof_verify();',
      oldLineNo: undefined,
      newLineNo: 3,
    });
  });

  it('accurately parses detailed diff metadata, hunks, stats, and extracts clean code', () => {
    const viewer = new InlineDiffViewer();
    const card = viewer.parseDetailedDiff(samplePatch);

    expect(card.fileName).toBe('kernel.c');
    expect(card.oldFileName).toBe('kernel.c');
    expect(card.newFileName).toBe('kernel.c');
    expect(card.additions).toBe(2);
    expect(card.deletions).toBe(1);
    expect(card.totalChanges).toBe(3);
    expect(card.hunks.length).toBe(1);

    const hunk = card.hunks[0];
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldCount).toBe(3);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newCount).toBe(4);
    expect(hunk.lines.length).toBe(4);

    // Extract clean code
    const cleanCode = viewer.extractCleanCode(samplePatch);
    expect(cleanCode).toBe('#include <zk.h>\nint new_gate();\nvoid proof_verify();');
    expect(card.cleanCode).toBe(cleanCode);
  });

  it('renders diff card with appropriate addition and deletion badges and styling', () => {
    const viewer = new InlineDiffViewer();
    const html = viewer.renderDiffCard(samplePatch);

    expect(html).toContain('diff-card-container');
    expect(html).toContain('kernel.c');
    expect(html).toContain('+2');
    expect(html).toContain('-1');
    expect(html).toContain('2 insertions');
    expect(html).toContain('1 deletions');
    expect(html).toContain('btn-copy-clean');
    expect(html).toContain('Copy Clean Code');
    expect(html).toContain('btn-toggle-linenos');
    expect(html).toContain('Toggle Line Numbers');
    expect(html).toContain('Raw Diff');
    expect(html).toContain('bg-emerald-950/40');
    expect(html).toContain('bg-rose-950/40');
  });

  it('renders code sandbox toolbar with all interactive actions', () => {
    const viewer = new InlineDiffViewer();
    const codeSnippet = 'console.log("UREfy Kernel Initialized");';
    const toolbarJs = viewer.renderCodeSandboxToolbar(codeSnippet, 'javascript');

    expect(toolbarJs).toContain('code-sandbox-toolbar');
    expect(toolbarJs).toContain('JavaScript');
    expect(toolbarJs).toContain('data-action="run-sandbox"');
    expect(toolbarJs).toContain('data-action="toggle-wrap"');
    expect(toolbarJs).toContain('data-action="font-size-dec"');
    expect(toolbarJs).toContain('data-action="font-size-inc"');
    expect(toolbarJs).toContain('data-action="copy-snippet"');

    // Non-runnable language (e.g. rust) should not have the Run button in toolbar
    const toolbarRust = viewer.renderCodeSandboxToolbar('fn main() {}', 'rust');
    expect(toolbarRust).toContain('Rust');
    expect(toolbarRust).not.toContain('data-action="run-sandbox"');
  });

  it('renders full code block container and handles code execution correctly', async () => {
    const viewer = new InlineDiffViewer();
    const jsCode = 'const val = 42;\nconsole.log("Result:", val * 2);';
    const blockHtml = viewer.renderCodeBlock(jsCode, 'javascript', { showLineNumbers: true, fontSize: 14 });

    expect(blockHtml).toContain('code-block-wrapper');
    expect(blockHtml).toContain('code-content-container');
    expect(blockHtml).toContain('code-console-panel');
    expect(blockHtml).toContain('font-size: 14px;');

    // Test code execution in sandbox
    const result = await viewer.executeCodeSnippet(jsCode, 'javascript');
    expect(result.success).toBe(true);
    expect(result.output.length).toBeGreaterThan(0);
    expect(result.output[0]).toContain('Result: 84');
    expect(result.logs[0].type).toBe('log');
  });

  it('verifies exported singleton instance inlineDiffViewer', () => {
    expect(inlineDiffViewer).toBeInstanceOf(InlineDiffViewer);
    const lines = inlineDiffViewer.parseUnifiedDiff(samplePatch);
    expect(lines.length).toBe(4);
  });

  it('sanitizes XSS payloads in filenames, diff content, and execution error logs', async () => {
    const viewer = new InlineDiffViewer();
    const maliciousPatch = `--- a/<script>alert("filename_xss")</script>.ts
+++ b/<script>alert("filename_xss")</script>.ts
@@ -1,1 +1,1 @@
-<img src=x onerror=alert(1)>
+<svg onload=alert(2)>`;

    const html = viewer.renderDiffCard(maliciousPatch);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<svg onload=');
    expect(html).toContain('&lt;script&gt;');

    // Test code block sanitization
    const block = viewer.renderCodeBlock('<script>alert("code")</script>', 'typescript');
    expect(block).not.toContain('<script>alert("code")</script>');
    expect(block).toContain('&lt;script&gt;');
  });
});
