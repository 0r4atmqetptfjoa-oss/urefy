import { serviceRegistry, SERVICES } from './service-registry.js';
import type { WindowAugmentation } from './window-augmentation.js';

export interface SandboxOptions {
  timeoutMs?: number;
  allowedGlobals?: string[];
}

export interface SandboxConsoleOutput {
  level: 'log' | 'warn' | 'error' | 'info';
  args: string[];
}

export interface SandboxExecutionResult {
  output: SandboxConsoleOutput[];
  executionTimeMs: number;
  error?: string;
  success: boolean;
  returnValue?: unknown;
}

interface SandboxWorkerInstance {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: any }) => void) | null;
  onerror: ((error: any) => void) | null;
}

export const blobScriptRegistry = new Map<string, string>();
let cachedNodeWorkerClass: any = null;

async function getNodeWorkerClass(): Promise<any> {
  if (cachedNodeWorkerClass) return cachedNodeWorkerClass;
  if (typeof window === 'undefined' && typeof Worker === 'undefined') {
    try {
      const moduleName = 'node:worker_threads';
      const mod = await import(moduleName);
      cachedNodeWorkerClass = mod.Worker;
      return cachedNodeWorkerClass;
    } catch {
      return null;
    }
  }
  return null;
}

export function stripTypeScriptTypes(source: string): string {
  if (!source) return '';
  const strings: string[] = [];
  let masked = source.replace(/(["'`])(?:\\.|(?!\1)[\s\S])*?\1/g, (match) => {
    strings.push(match);
    return `__SANDBOX_STR_${strings.length - 1}__`;
  });

  // Remove interface declarations and type aliases
  masked = masked.replace(/\bexport\s+(?:interface|type)\s+[A-Za-z0-9_$]+[\s\S]*?(?:;|\n|$)/g, '');
  masked = masked.replace(/\binterface\s+[A-Za-z0-9_$]+(?:\s*<[^>]*>)?\s*\{[^}]*\}/g, '');
  masked = masked.replace(/\btype\s+[A-Za-z0-9_$]+(?:\s*<[^>]*>)?\s*=\s*[^;\n]+;?/g, '');

  // Remove access modifiers in class properties/methods
  masked = masked.replace(/\b(?:public|private|protected|readonly)\s+/g, '');

  // Remove "as Type" assertions
  masked = masked.replace(/\s+as\s+(?:const|[A-Za-z0-9_$.<>[\]|&\s]+?)(?=[,);\n\]}])/g, '');

  // Remove generic type arguments on function calls/declarations where unambiguous
  masked = masked.replace(/\b(function\s+[A-Za-z0-9_$]+)\s*<[^>]+>\s*\(/g, '$1(');

  // Remove variable/parameter type annotations (: string, : number[], etc.)
  masked = masked.replace(
    /(\b(?:const|let|var)\s+[A-Za-z0-9_$]+)\s*\??:\s*[A-Za-z0-9_$.<>[\]|&\s]+?(?=\s*=)/g,
    '$1'
  );
  masked = masked.replace(
    /([(\s,][A-Za-z0-9_$]+)\s*\??:\s*[A-Za-z0-9_$.<>[\]|&]+(?=\s*[,)=])/g,
    '$1'
  );

  // Remove function return type annotations ): Type { or ): Type =>
  masked = masked.replace(/\)\s*:\s*[A-Za-z0-9_$.<>[\]|&]+(\s*(?:\{|=>))/g, ')$1');

  return masked.replace(/__SANDBOX_STR_(\d+)__/g, (_, idx) => strings[Number(idx)] || '');
}

export function buildWorkerScript(code: string, options: SandboxOptions = {}): string {
  const allowed = new Set(options.allowedGlobals || []);
  const dangerousGlobals = [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'indexedDB',
    'importScripts',
    'Worker',
    'localStorage',
    'sessionStorage',
    'BroadcastChannel',
    'SharedWorker',
    'openDatabase',
    'caches',
  ];
  const globalsToDisable = dangerousGlobals.filter((g) => !allowed.has(g));
  const disableStatements = globalsToDisable
    .map(
      (g) =>
        `try { self.${g} = undefined; } catch(e) {} ` +
        `try { Object.defineProperty(self, '${g}', { value: undefined, configurable: true, writable: true }); } catch(e) {}`
    )
    .join('\n');

  return `
(function() {
  if (typeof self === 'undefined') {
    globalThis.self = globalThis;
  }
  if (typeof parentPort === 'undefined') {
    try {
      const { parentPort: pp } = require('node:worker_threads');
      if (pp) {
        self.postMessage = function(msg) { pp.postMessage(msg); };
        pp.on('message', function(data) {
          if (typeof self.onmessage === 'function') {
            self.onmessage({ data: data });
          }
        });
      }
    } catch(e) {}
  }
  ${disableStatements}
  function safeSerialize(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (typeof arg === 'bigint') return arg.toString() + 'n';
    if (typeof arg === 'symbol') return arg.toString();
    if (typeof arg === 'function') return '[Function: ' + (arg.name || 'anonymous') + ']';
    if (arg instanceof Error) {
      return arg.name + ': ' + arg.message + (arg.stack ? '\\n' + arg.stack : '');
    }
    const seen = new WeakSet();
    try {
      return JSON.stringify(arg, function(key, value) {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        if (typeof value === 'bigint') {
          return value.toString() + 'n';
        }
        if (typeof value === 'function') {
          return '[Function: ' + (value.name || 'anonymous') + ']';
        }
        return value;
      }, 2);
    } catch (e) {
      return String(arg);
    }
  }
  const bufferedOutput = [];
  const logLevels = ['log', 'info', 'warn', 'error'];
  logLevels.forEach(function(level) {
    console[level] = function() {
      const args = Array.prototype.slice.call(arguments);
      const serializedArgs = args.map(safeSerialize);
      bufferedOutput.push({ level: level, args: serializedArgs });
      try {
        self.postMessage({ type: 'console', level: level, args: serializedArgs });
      } catch (err) {
        bufferedOutput.push({ level: 'error', args: ['[Serialization Error: ' + String(err) + ']'] });
      }
    };
  });
  self.onmessage = async function(event) {
    const rawData = event ? event.data : {};
    const userCode = rawData ? rawData.code : '';
    const transpiledCode = rawData && rawData.transpiledCode ? rawData.transpiledCode : userCode;
    const startTime = performance.now();
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      let fn;
      try {
        fn = new AsyncFunction('return (' + userCode + ');');
      } catch (e1) {
        try {
          fn = new AsyncFunction(userCode);
        } catch (e2) {
          try {
            fn = new AsyncFunction('return (' + transpiledCode + ');');
          } catch (e3) {
            fn = new AsyncFunction(transpiledCode);
          }
        }
      }
      const res = await fn();
      const executionTime = performance.now() - startTime;
      self.postMessage({
        type: 'complete',
        success: true,
        output: bufferedOutput,
        executionTimeMs: executionTime,
        returnValue: res !== undefined ? res : undefined
      });
    } catch (runtimeError) {
      const executionTime = performance.now() - startTime;
      const errorMsg = runtimeError instanceof Error
        ? (runtimeError.name + ': ' + runtimeError.message)
        : String(runtimeError);
      self.postMessage({
        type: 'complete',
        success: false,
        output: bufferedOutput,
        executionTimeMs: executionTime,
        error: errorMsg
      });
    }
  };
  self.onerror = function(err) {
    const errorMsg = err && err.message ? err.message : String(err);
    try {
      self.postMessage({
        type: 'complete',
        success: false,
        output: bufferedOutput,
        executionTimeMs: 0,
        error: errorMsg
      });
    } catch(e) {}
  };
})();
`;
}

async function spawnWorkerInstance(
  workerScript: string
): Promise<{ worker: SandboxWorkerInstance; cleanupUrl?: string }> {
  if (
    typeof Worker !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  ) {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    blobScriptRegistry.set(blobUrl, workerScript);
    try {
      const nativeWorker = new Worker(blobUrl);
      const instance: SandboxWorkerInstance = {
        postMessage: (msg: unknown) => nativeWorker.postMessage(msg),
        terminate: () => nativeWorker.terminate(),
        onmessage: null,
        onerror: null,
      };
      nativeWorker.onmessage = (ev) => {
        if (instance.onmessage) instance.onmessage(ev);
      };
      nativeWorker.onerror = (err) => {
        if (instance.onerror) instance.onerror(err);
      };
      return { worker: instance, cleanupUrl: blobUrl };
    } catch {
      blobScriptRegistry.delete(blobUrl);
    }
  }
  const NodeWorkerClass = await getNodeWorkerClass();
  if (NodeWorkerClass) {
    const nw = new NodeWorkerClass(workerScript, { eval: true });
    const instance: SandboxWorkerInstance = {
      postMessage: (msg: unknown) => nw.postMessage(msg),
      terminate: () => {
        nw.terminate().catch(() => {});
      },
      onmessage: null,
      onerror: null,
    };
    nw.on('message', (data: any) => {
      if (instance.onmessage) instance.onmessage({ data });
    });
    nw.on('error', (err: any) => {
      if (instance.onerror) instance.onerror(err);
    });
    return { worker: instance };
  }
  throw new Error('WebWorker execution environment unavailable in current runtime.');
}

export async function executeInSandbox(
  code: string,
  options: SandboxOptions = {}
): Promise<SandboxExecutionResult> {
  const timeoutMs = options.timeoutMs ?? 2000;
  const startTime = performance.now();
  const output: SandboxConsoleOutput[] = [];
  const transpiledCode = stripTypeScriptTypes(code);
  const workerScript = buildWorkerScript(code, options);
  let workerHandle: SandboxWorkerInstance | null = null;
  let cleanupUrl: string | undefined;

  try {
    const spawned = await spawnWorkerInstance(workerScript);
    workerHandle = spawned.worker;
    cleanupUrl = spawned.cleanupUrl;
  } catch (spawnErr) {
    return {
      output: [],
      executionTimeMs: 0,
      error: spawnErr instanceof Error ? spawnErr.message : String(spawnErr),
      success: false,
    };
  }

  return new Promise<SandboxExecutionResult>((resolve) => {
    let settled = false;
    const cleanup = () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (cleanupUrl) {
        blobScriptRegistry.delete(cleanupUrl);
        try {
          URL.revokeObjectURL(cleanupUrl);
        } catch {}
      }
      if (workerHandle) {
        try {
          workerHandle.terminate();
        } catch {}
      }
    };
    const cleanupTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        output,
        executionTimeMs: timeoutMs,
        error: `Execution timed out: ${timeoutMs}ms limit exceeded`,
        success: false,
      });
    }, timeoutMs);

    workerHandle.onmessage = (event) => {
      const data = event ? event.data : null;
      if (!data) return;
      if (data.type === 'console') {
        output.push({ level: data.level, args: data.args });
      } else if (data.type === 'complete') {
        if (settled) return;
        settled = true;
        cleanup();
        const duration =
          typeof data.executionTimeMs === 'number'
            ? Math.round(data.executionTimeMs * 10) / 10
            : Math.round((performance.now() - startTime) * 10) / 10;
        resolve({
          output:
            data.output && Array.isArray(data.output) && data.output.length > 0 ? data.output : output,
          executionTimeMs: Math.max(0.1, duration),
          error: data.error,
          success: Boolean(data.success),
          returnValue: data.returnValue,
        });
      }
    };

    workerHandle.onerror = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      const errMsg =
        err && (err.message || err.toString()) ? err.message || String(err) : 'Worker execution failure';
      resolve({
        output,
        executionTimeMs: Math.round((performance.now() - startTime) * 10) / 10,
        error: errMsg,
        success: false,
      });
    };

    workerHandle.postMessage({ code, transpiledCode });
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTerminalToken(val: string): string {
  if (val === 'null' || val === 'undefined') {
    return `<span class="text-slate-500 italic font-mono">${escapeHtml(val)}</span>`;
  }
  if (val === 'true' || val === 'false') {
    return `<span class="text-purple-400 font-semibold font-mono">${escapeHtml(val)}</span>`;
  }
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?n?$/i.test(val)) {
    return `<span class="text-amber-400 font-mono">${escapeHtml(val)}</span>`;
  }
  return `<span class="text-emerald-300 font-mono">${escapeHtml(val)}</span>`;
}

export function renderTerminalOutput(result: SandboxExecutionResult): string {
  const lines: string[] = [];
  if (result.error) {
    lines.push(
      `<div class="sandbox-terminal-line flex items-start space-x-2 py-0.5 text-xs font-mono bg-rose-950/20 border-l-2 border-rose-500 pl-2">` +
        `<span class="sandbox-level-icon shrink-0 text-rose-500 select-none">✖</span>` +
        `<div class="sandbox-line-content flex-1 break-all whitespace-pre-wrap text-rose-400">${escapeHtml(result.error)}</div>` +
      `</div>`
    );
  }
  if (result.output && result.output.length > 0) {
    for (const item of result.output) {
      const iconMap: Record<string, { icon: string; color: string }> = {
        log: { icon: '›', color: 'text-slate-400' },
        info: { icon: 'ℹ', color: 'text-cyan-400' },
        warn: { icon: '⚠', color: 'text-amber-400' },
        error: { icon: '✖', color: 'text-rose-400' },
      };
      const iconInfo = iconMap[item.level] || { icon: '›', color: 'text-slate-400' };
      const formattedArgs = item.args.map((a) => formatTerminalToken(a)).join(' ');
      lines.push(
        `<div class="sandbox-terminal-line flex items-start space-x-2 py-0.5 text-xs font-mono">` +
          `<span class="sandbox-level-icon shrink-0 ${iconInfo.color} select-none font-bold">${iconInfo.icon}</span>` +
          `<div class="sandbox-line-content flex-1 break-all whitespace-pre-wrap">${formattedArgs}</div>` +
        `</div>`
      );
    }
  }
  if (result.returnValue !== undefined && !result.error) {
    const serializedReturn =
      typeof result.returnValue === 'object' && result.returnValue !== null
        ? JSON.stringify(result.returnValue)
        : String(result.returnValue);
    lines.push(
      `<div class="sandbox-terminal-line flex items-start space-x-2 py-0.5 text-xs font-mono text-cyan-300">` +
        `<span class="sandbox-level-icon shrink-0 text-cyan-500 select-none font-bold">◀</span>` +
        `<div class="sandbox-line-content flex-1 break-all whitespace-pre-wrap">${formatTerminalToken(serializedReturn)}</div>` +
      `</div>`
    );
  }
  if (lines.length === 0 && result.success) {
    lines.push(
      `<div class="sandbox-terminal-line text-slate-500 italic text-xs font-mono py-0.5 flex items-center space-x-1.5">` +
        `<span class="text-slate-600 select-none">›</span>` +
        `<span>(Execution completed with no console output)</span>` +
      `</div>`
    );
  }
  return lines.join('');
}

export function attachSandboxRunnersToDOM(
  container: HTMLElement = typeof document !== 'undefined' ? document.body : (undefined as any)
): void {
  if (!container || typeof container.querySelectorAll !== 'function') return;
  const codeElements = Array.from(container.querySelectorAll<HTMLElement>('pre code'));
  for (const codeEl of codeElements) {
    if (codeEl.getAttribute('data-sandbox-attached') === 'true') continue;
    const classNames = (codeEl.className || codeEl.getAttribute('class') || '').toLowerCase();
    const isSupported = /\b(?:language|syntax)-(?:javascript|typescript|js|ts)\b/i.test(classNames);
    if (!isSupported) continue;
    codeEl.setAttribute('data-sandbox-attached', 'true');

    const preEl = (codeEl.closest ? codeEl.closest('pre') : codeEl.parentElement) as HTMLElement | null;
    const cardContainer = (preEl?.closest ? preEl.closest('.code-terminal-card') : preEl) as HTMLElement | null;
    const targetParent = cardContainer || preEl;
    if (!targetParent || !targetParent.parentNode) continue;

    const toolbar = document.createElement('div');
    toolbar.className =
      'sandbox-runner-toolbar flex items-center justify-between px-3 py-1.5 bg-surface-overlay/90 border-t border-white/5 text-[11px] font-mono select-none';
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'flex items-center space-x-2';
    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className =
      'btn-run-sandbox inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/50 shadow-sm transition-all duration-150 cursor-pointer active:scale-95 group';
    const runIcon = document.createElement('span');
    runIcon.className = 'sandbox-run-icon inline-block transition-transform duration-200 group-hover:scale-110';
    runIcon.textContent = '▶';
    const runLabel = document.createElement('span');
    runLabel.className = 'sandbox-run-label';
    runLabel.textContent = 'Run in Sovereign Sandbox';
    runBtn.appendChild(runIcon);
    runBtn.appendChild(runLabel);
    btnWrapper.appendChild(runBtn);
    toolbar.appendChild(btnWrapper);

    const badge = document.createElement('span');
    badge.className = 'text-[10px] text-slate-500 tracking-wider uppercase font-semibold font-mono';
    badge.textContent = 'SOVEREIGN SANDBOX';
    toolbar.appendChild(badge);

    if (cardContainer) {
      cardContainer.appendChild(toolbar);
    } else if (preEl && preEl.parentNode) {
      preEl.parentNode.insertBefore(toolbar, preEl.nextSibling);
    }

    runBtn.addEventListener('click', async () => {
      runIcon.textContent = '⏳';
      runLabel.textContent = 'Executing...';
      runBtn.disabled = true;

      const rawEncoded = targetParent.querySelector('[data-code-raw]')?.getAttribute('data-code-raw');
      const rawCode = rawEncoded ? decodeURIComponent(rawEncoded) : codeEl.textContent || '';
      const result = await executeInSandbox(rawCode);

      runIcon.textContent = '▶';
      runLabel.textContent = 'Run in Sovereign Sandbox';
      runBtn.disabled = false;

      const doc = typeof document !== 'undefined' ? document : (globalThis as any).document;
      if (!doc) return;

      let terminal = targetParent.querySelector<HTMLElement>('.sandbox-terminal');
      if (!terminal) {
        terminal = doc.createElement('div') as HTMLElement;
        terminal.className =
          'sandbox-terminal mt-2 rounded-lg border border-white/10 bg-[#0c1017] overflow-hidden shadow-2xl text-xs font-mono transition-all duration-200';
        targetParent.appendChild(terminal);
      }
      if (!terminal) return;
      terminal.innerHTML = '';

      const header = doc.createElement('div');
      header.className =
        'sandbox-terminal-header flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/5 select-none';
      const headerLeft = doc.createElement('div');
      headerLeft.className = 'flex items-center space-x-2';
      const statusSpan = doc.createElement('span');
      statusSpan.className = `sandbox-status font-bold ${result.success ? 'text-emerald-400' : 'text-rose-400'}`;
      statusSpan.textContent = result.success ? '✓ Success' : '✗ Error';
      const timeSpan = doc.createElement('span');
      timeSpan.className = 'sandbox-time text-slate-400 text-[11px] font-mono';
      timeSpan.textContent = `(${result.executionTimeMs.toFixed(1)}ms)`;
      headerLeft.appendChild(statusSpan);
      headerLeft.appendChild(timeSpan);

      const headerRight = doc.createElement('div');
      headerRight.className = 'flex items-center space-x-2';
      const collapseBtn = doc.createElement('button');
      collapseBtn.type = 'button';
      collapseBtn.className =
        'btn-sandbox-collapse text-[10px] text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded cursor-pointer transition-colors';
      collapseBtn.textContent = 'Collapse';
      const clearBtn = doc.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className =
        'btn-sandbox-clear text-[10px] text-slate-400 hover:text-rose-300 bg-white/5 hover:bg-rose-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors';
      clearBtn.textContent = 'Clear';
      headerRight.appendChild(collapseBtn);
      headerRight.appendChild(clearBtn);
      header.appendChild(headerLeft);
      header.appendChild(headerRight);

      const terminalBody = doc.createElement('div');
      terminalBody.className = 'sandbox-terminal-body p-3 overflow-x-auto max-h-64 space-y-1 bg-[#080c12]';
      terminalBody.innerHTML = renderTerminalOutput(result);
      terminal.appendChild(header);
      terminal.appendChild(terminalBody);

      clearBtn.addEventListener('click', () => {
        terminal?.remove();
      });
      collapseBtn.addEventListener('click', () => {
        const isCollapsed = terminalBody.style.display === 'none';
        terminalBody.style.display = isCollapsed ? 'block' : 'none';
        collapseBtn.textContent = isCollapsed ? 'Collapse' : 'Expand';
      });
    });
  }
}

export class CodeSandbox {
  public executeInSandbox(code: string, options?: SandboxOptions): Promise<SandboxExecutionResult> {
    return executeInSandbox(code, options);
  }
  public attachSandboxRunnersToDOM(
    container: HTMLElement = typeof document !== 'undefined' ? document.body : (undefined as any)
  ): void {
    return attachSandboxRunnersToDOM(container);
  }
}

export const codeSandbox = new CodeSandbox();
serviceRegistry.registerInstance(SERVICES.CodeSandbox || 'CodeSandbox', codeSandbox);
if (typeof window !== 'undefined') {
  (window as unknown as WindowAugmentation).codeSandbox = codeSandbox;
}
export default codeSandbox;
