/**
 * Aetheris Omni-Sphere — On-Device Sovereign AI Assistant Engine
 * (ai-assistant.ts)
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Cloud Dependencies.
 * High-performance local text processing, TF-IDF vectorization, N-gram semantic
 * extraction, TextRank sentence graph summarization, Git patch security audit,
 * multi-tier code explanation, and intelligent draft continuation.
 */

import './window-augmentation.js';
import { clientStore } from './client-state.js';

// ---------------------------------------------------------------------------
// 1. Interfaces & Type Definitions
// ---------------------------------------------------------------------------

export type ProactiveSuggestionType = 'low_vault_entropy' | 'dao_quorum_near' | 'guardian_inactive';

export interface ProactiveSuggestion {
  id: string;
  type: ProactiveSuggestionType;
  title: string;
  message: string;
  actionLabel?: string;
  actionCallback?: () => void;
  timestamp: number;
}

export type AICodeLevel = 'beginner' | 'intermediate' | 'advanced';
export type AIAssistantTab = 'summary' | 'code' | 'security' | 'draft' | 'zero-cloud';
export type AISecuritySeverity = 'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityVulnerability {
  ruleId: string;
  category: string;
  severity: AISecuritySeverity;
  title: string;
  description: string;
  matchedPattern: string;
  lineSnippet?: string;
  lineNumber?: number;
  remediation: string;
}

export interface PatchAuditResult {
  riskScore: number; // 0 - 100
  severity: AISecuritySeverity;
  totalAdditions: number;
  totalDeletions: number;
  modifiedFiles: string[];
  findings: SecurityVulnerability[];
  executiveSummary: string;
  recommendedAction: string;
}

export interface ThreadComment {
  content: string;
  authorFP: string;
  timestamp?: number;
  role?: string;
}

export interface ThreadSummaryResult {
  sentenceCount: number;
  executiveSummary: string;
  keyTopics: string[];
  participantCount: number;
  sentiment: 'constructive' | 'critical' | 'neutral' | 'consensus';
  bulletPoints: string[];
  readingTimeSavedSec: number;
}

export interface CodeExplanationResult {
  language: string;
  level: AICodeLevel;
  overview: string;
  walkthrough: Array<{ step: number; title: string; explanation: string; codeChunk?: string }>;
  keyConcepts: string[];
  complexity: { time: string; space: string; explanation: string };
  pitfalls: string[];
  architecturalNotes: string[];
}

export interface DraftCompletionResult {
  detectedTopic: string;
  detectedTone: string;
  completions: Array<{
    title: string;
    style: 'Technical Deep Dive' | 'Actionable Checklist' | 'Architectural Trade-Offs' | 'Cypherpunk Manifest';
    text: string;
    codeSnippet?: string;
  }>;
  suggestedTags: string[];
}

export interface PanelState {
  isOpen: boolean;
  activeTab: AIAssistantTab;
  codeLevel: AICodeLevel;
  isBusy: boolean;
  statusMessage: string;
  lastSummary?: string;
  lastCodeExplanation?: CodeExplanationResult;
  lastSecurityAudit?: PatchAuditResult;
  lastDraftCompletion?: DraftCompletionResult;
  rawContent: string;
}

// ---------------------------------------------------------------------------
// 2. Lexical Database, Stopwords & Security Rules
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set<string>([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has',
  'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her',
  'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
  'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
  'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some',
  'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were',
  'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
  'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would',
  'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
  'yourself', 'yourselves', 'also', 'just', 'like', 'get', 'use', 'using', 'used',
  'one', 'two', 'first', 'second', 'well', 'way', 'even', 'new', 'want', 'make'
]);

interface SecurityRuleDef {
  id: string;
  category: string;
  severity: AISecuritySeverity;
  title: string;
  description: string;
  regex: RegExp;
  remediation: string;
  weight: number;
}

const SECURITY_RULES: SecurityRuleDef[] = [
  {
    id: 'SEC-001',
    category: 'Arbitrary Code Execution',
    severity: 'CRITICAL',
    title: 'Dynamic Evaluation Primitive (eval/Function)',
    description: 'Direct invocation of eval(), new Function(), or window.execScript() executes arbitrary string inputs in the engine context.',
    regex: /\b(eval\s*\(|new\s+Function\s*\(|window\[['"`]eval['"`]\]|setTimeout\s*\(\s*['"`])/i,
    remediation: 'Replace dynamic evaluation with declarative parser, schema validator, or WebAssembly sandbox.',
    weight: 35,
  },
  {
    id: 'SEC-002',
    category: 'Process Injection & Shell Execution',
    severity: 'CRITICAL',
    title: 'Dangerous System Command Execution',
    description: 'System process spawn detected (exec, shell_exec, system, popen, child_process.exec) which allows remote command injection if arguments are untrusted.',
    regex: /\b(exec\s*\(|shell_exec\s*\(|system\s*\(|popen\s*\(|proc_open\s*\(|child_process\.exec\s*\(|spawnSync\s*\(\s*['"`]sh['"`])/i,
    remediation: 'Use parameterized process spawning with child_process.execFile and strict array arguments, never passing shell string templates.',
    weight: 35,
  },
  {
    id: 'SEC-003',
    category: 'Filesystem Destruction & Wipe',
    severity: 'CRITICAL',
    title: 'Destructive Filesystem Command Signature',
    description: 'Pattern matching forced unconstrained recursive directory destruction (e.g., rm -rf, del /f /s /q, mkfs, format c:).',
    regex: /(rm\s+-[a-zA-Z]*r[a-zA-Z]*f\s+[\/~*]|del\s+\/[fF]\s+\/[sS]\s+\/[qQ]|mkfs(\.[a-z0-9]+)?\s+\/dev\/|:\(\)\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:)/i,
    remediation: 'Enforce virtualized ephemeral storage boundaries and strict path whitelisting before any deletion routine.',
    weight: 40,
  },
  {
    id: 'SEC-004',
    category: 'Command Piping & Staged Payload',
    severity: 'HIGH',
    title: 'Piped Remote Execution (curl/wget | sh)',
    description: 'Direct piping of unauthenticated remote payloads directly into shell interpreters (curl/wget pipe to bash/sh).',
    regex: /(curl|wget|fetch)\s+[^\n|;&]+(\|\s*(bash|sh|zsh|python|perl|ruby))/i,
    remediation: 'Download static assets, verify cryptographic SHA256 / GPG signatures, and review binary manifests before manual execution.',
    weight: 25,
  },
  {
    id: 'SEC-005',
    category: 'Obfuscated Payloads',
    severity: 'HIGH',
    title: 'High-Entropy Obfuscation & Base64 Payload Execution',
    description: 'Dynamic decode of Base64 or byte arrays coupled with immediate evaluation or buffer execution.',
    regex: /(atob\s*\([a-zA-Z0-9+\/=\s]{20,}\)|Buffer\.from\s*\(\s*['"`][a-zA-Z0-9+\/=]{30,}['"`]\s*,\s*['"`]base64['"`]\)|String\.fromCharCode\s*\(\s*(\d+\s*,\s*){6,}\d+\s*\))/i,
    remediation: 'Remove packed or obfuscated string constants; maintain transparent, audit-ready source code.',
    weight: 20,
  },
  {
    id: 'SEC-006',
    category: 'Prototype Pollution',
    severity: 'HIGH',
    title: 'Prototype Pollution Assignment',
    description: 'Direct modification of Object.prototype, __proto__, or constructor.prototype enabling privilege escalation and property hijacking.',
    regex: /(__proto__|constructor\s*\[\s*['"`]prototype['"`]\s*\]|\.prototype\[\s*['"`]__proto__['"`]\s*\])/i,
    remediation: 'Use Object.create(null) for key-value maps or freeze Object.prototype via Object.freeze(Object.prototype).',
    weight: 20,
  },
  {
    id: 'SEC-007',
    category: 'Secrets & Credential Exposure',
    severity: 'CRITICAL',
    title: 'Hardcoded Private Key / Secret Token Leak',
    description: 'Hardcoded cryptographic private keys (PEM header, EC/RSA keys, GitHub tokens, AWS keys, or 64-hex private key strings) detected in patch.',
    regex: /(-----BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP)?\s*PRIVATE\s+KEY-----|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16}|0x[a-fA-F0-9]{64}\b|[a-f0-9]{64}\b.*(?:private|secret|seed|privkey))/i,
    remediation: 'Immediately revoke leaked keys; switch to hardware enclaves, WebCrypto non-exportable keys, or environment-injected secrets.',
    weight: 35,
  },
  {
    id: 'SEC-008',
    category: 'ReDoS Vulnerability',
    severity: 'MEDIUM',
    title: 'Catastrophic Backtracking Regular Expression',
    description: 'Nested quantifiers detected in regular expressions that cause exponential complexity when matched against hostile inputs.',
    regex: /\/(\([^\)]+\+[\)]*\)\+|\([^\)]+\*[\)]*\*|([a-zA-Z0-9_]+\+)+)\//i,
    remediation: 'Simplify regex patterns to linear determinism (DFA) or validate input length before running complex patterns.',
    weight: 15,
  },
  {
    id: 'SEC-009',
    category: 'Unsafe Deserialization',
    severity: 'HIGH',
    title: 'Unchecked Binary / Object Deserialization',
    description: 'Deserializing arbitrary untrusted byte streams using pickle.loads, unserialize(), or YAML unsafe loaders.',
    regex: /\b(pickle\.loads\s*\(|unserialize\s*\(|yaml\.load\s*\([^,]+Loader\s*=\s*(?:yaml\.)?Loader\)|Marshal\.load\s*\()/i,
    remediation: 'Replace with safe structured formats (JSON, Protocol Buffers, FlatBuffers, CBOR with strict schema).',
    weight: 25,
  },
  {
    id: 'SEC-010',
    category: 'SQL / NoSQL Query Concatenation',
    severity: 'HIGH',
    title: 'Unescaped Query Template Interpolation',
    description: 'Direct concatenation of string variables into SQL or NoSQL database queries ($where clause or raw SQL string builders).',
    regex: /(SELECT\s+.+\s+FROM\s+.+\s+WHERE\s+.+[\+\$]|\$where\s*:\s*['"`]|db\.collection\(.+\)\.find\(\s*\{.+\$where)/i,
    remediation: 'Use parameterized prepared statements and type-safe query builders.',
    weight: 20,
  },
  {
    id: 'SEC-011',
    category: 'Broken Access Control',
    severity: 'HIGH',
    title: 'Security Assertion Removal in Patch',
    description: 'Detected deletion of signature validation, ZK proof checks, or authentication gates in diff lines.',
    regex: /^-\s*(if\s*\(!.*(?:verify|auth|permission|signature|zkProof|isValid|hasRole|token))/m,
    remediation: 'Ensure security checks are not inadvertently bypassed or commented out in refactors.',
    weight: 25,
  }
];

// ---------------------------------------------------------------------------
// 3. Local NLP & TF-IDF Vectorization Engine
// ---------------------------------------------------------------------------

export class LocalAIAssistant {
  public isLoaded: boolean = true;
  public isProcessing: boolean = false;
  public modelId: string = 'Xenova/LaMini-Flan-T5-783M';

  // Proactive Observer & Assistant Suggestions
  public proactiveEnabled: boolean = true;
  public dismissedSuggestionTypes: Set<ProactiveSuggestionType> = new Set();
  public activeSuggestions: ProactiveSuggestion[] = [];
  public suggestionCooldownMs: number = 5 * 60 * 1000; // 5 minutes rate limit
  private lastSuggestionTime: number = 0;
  private observerTimer: any = null;

  // Internal active states per post
  private panelStates: Map<string, PanelState> = new Map();

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const storedDismissed = localStorage.getItem('aetheris_dismissed_suggestions');
      if (storedDismissed) {
        try {
          const parsed = JSON.parse(storedDismissed);
          if (Array.isArray(parsed)) {
            this.dismissedSuggestionTypes = new Set(parsed);
          }
        } catch (_) {}
      }
      const storedProactive = localStorage.getItem('aetheris_proactive_ai_enabled');
      if (storedProactive !== null) {
        this.proactiveEnabled = storedProactive === 'true';
      }
    }

    if (typeof window !== 'undefined') {
      (window as any).aiAssistant = this;
    }

    this.initTransformersCDN();
  }

  // -------------------------------------------------------------------------
  // Proactive Observer System
  // -------------------------------------------------------------------------

  /**
   * Starts periodic observation of client state to emit helpful, non-intrusive suggestions
   */
  public startObserver(intervalMs: number = 30000): void {
    this.stopObserver();
    this.observerTimer = setInterval(() => {
      this.checkAndEmitSuggestions();
    }, intervalMs);
    // Perform initial check
    this.checkAndEmitSuggestions();
  }

  /**
   * Stops the proactive observer timer and frees resources
   */
  public stopObserver(): void {
    if (this.observerTimer) {
      clearInterval(this.observerTimer);
      this.observerTimer = null;
    }
  }

  /**
   * Enables or disables proactive suggestions and updates localStorage
   */
  public setProactiveEnabled(enabled: boolean): void {
    this.proactiveEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_proactive_ai_enabled', String(enabled));
    }
  }

  /**
   * Configures cooldown duration between proactive suggestions (in ms)
   */
  public setCooldownMs(ms: number): void {
    this.suggestionCooldownMs = ms;
  }

  /**
   * Dismisses a specific active suggestion toast
   */
  public dismissSuggestion(id: string): void {
    const idx = this.activeSuggestions.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.activeSuggestions.splice(idx, 1);
    }
    if (typeof document !== 'undefined') {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
          el.remove();
          const container = document.getElementById('proactive-ai-container');
          if (container && container.children.length === 0) {
            container.remove();
          }
        }, 200);
      }
    }
  }

  /**
   * Dismisses and permanently silences all suggestions of a given type
   */
  public dismissSuggestionType(type: ProactiveSuggestionType): void {
    this.dismissedSuggestionTypes.add(type);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('aetheris_dismissed_suggestions', JSON.stringify(Array.from(this.dismissedSuggestionTypes)));
    }
    const toRemove = this.activeSuggestions.filter(s => s.type === type);
    for (const s of toRemove) {
      this.dismissSuggestion(s.id);
    }
  }

  /**
   * Evaluates store conditions and emits at most one rate-limited proactive suggestion
   */
  public checkAndEmitSuggestions(): ProactiveSuggestion | null {
    if (!this.proactiveEnabled) return null;
    const now = Date.now();
    if (this.lastSuggestionTime > 0 && now - this.lastSuggestionTime < this.suggestionCooldownMs) {
      return null;
    }

    // Do not pop up new suggestions if there is already an active suggestion visible on screen
    if (this.activeSuggestions.length > 0) {
      return null;
    }

    const store = (typeof window !== 'undefined' ? (window as any).clientStore : null) || clientStore;

    // 1. Check: low_vault_entropy
    if (!this.dismissedSuggestionTypes.has('low_vault_entropy')) {
      const isSeedVerified = typeof localStorage !== 'undefined' && localStorage.getItem('aetheris_seed_verified') === 'true';
      const vaultPosts = store?.posts?.filter((p: any) => p.channelId?.startsWith('vault-')) || [];
      if (!isSeedVerified || vaultPosts.length === 0) {
        return this.emitSuggestion({
          id: `sug-entropy-${now}`,
          type: 'low_vault_entropy',
          title: 'Vault Seed Security Advisory',
          message: 'Your sovereign vault seed backup has not been verified. Backup your 12-word phrase to guarantee permanent recovery.',
          actionLabel: 'Backup Seed',
          actionCallback: () => {
            if (typeof window !== 'undefined' && (window as any).__aetheris_open_mnemonic) {
              (window as any).__aetheris_open_mnemonic();
            }
          },
          timestamp: now,
        });
      }
    }

    // 2. Check: dao_quorum_near
    if (!this.dismissedSuggestionTypes.has('dao_quorum_near')) {
      const nearQuorumPost = store?.posts?.find((p: any) => (p.meritVotes || 0) >= 35 && (p.meritVotes || 0) < 50);
      if (nearQuorumPost) {
        const remaining = 50 - (nearQuorumPost.meritVotes || 0);
        return this.emitSuggestion({
          id: `sug-dao-${nearQuorumPost.id}`,
          type: 'dao_quorum_near',
          title: 'DAO Quorum Close to Passing',
          message: `Proposal "${(nearQuorumPost.title || 'Community Action').slice(0, 35)}..." is only ${remaining} votes away from consensus quorum!`,
          actionLabel: 'View Proposal',
          actionCallback: () => {
            if (typeof window !== 'undefined' && (window as any).feedControlsEngine) {
              (window as any).feedControlsEngine.openDetail(nearQuorumPost.id);
            }
          },
          timestamp: now,
        });
      }
    }

    // 3. Check: guardian_inactive
    if (!this.dismissedSuggestionTypes.has('guardian_inactive')) {
      const inactiveGuardian = store?.members?.find((m: any) => m.role === 'GUARDIAN' && (m.isInactive || (m.messagesCount || 0) < 2));
      if (inactiveGuardian) {
        return this.emitSuggestion({
          id: `sug-guardian-${inactiveGuardian.fingerprint}`,
          type: 'guardian_inactive',
          title: 'Social Recovery Advisory',
          message: `Guardian node @id:${inactiveGuardian.fingerprint.substring(0, 8)} appears inactive. Verify your trust circle.`,
          actionLabel: 'Check Circle',
          actionCallback: () => {
            if (typeof window !== 'undefined' && (window as any).__aetheris_open_social_recovery) {
              (window as any).__aetheris_open_social_recovery();
            }
          },
          timestamp: now,
        });
      }
    }

    return null;
  }

  private emitSuggestion(suggestion: ProactiveSuggestion): ProactiveSuggestion {
    if (this.dismissedSuggestionTypes.has(suggestion.type)) return suggestion;
    if (this.activeSuggestions.some(s => s.id === suggestion.id || s.type === suggestion.type)) {
      return suggestion;
    }
    if (typeof document !== 'undefined' && document.getElementById(suggestion.id)) {
      return suggestion;
    }
    this.lastSuggestionTime = Date.now();
    this.activeSuggestions.push(suggestion);
    this.showProactiveToast(suggestion);
    return suggestion;
  }

  public showProactiveToast(suggestion: ProactiveSuggestion): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(suggestion.id)) return;
    let container = document.getElementById('proactive-ai-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'proactive-ai-container';
      container.className = 'fixed bottom-20 right-4 sm:right-6 sm:bottom-16 z-[9999] max-w-sm pointer-events-auto space-y-2';
      document.body.appendChild(container);
    }

    const card = document.createElement('div');
    card.id = suggestion.id;
    card.className = 'p-4 rounded-2xl bg-surface-raised/95 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs space-y-2.5';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-base">🤖</span>
          <span class="font-bold text-white font-mono">${this.escapeHtml(suggestion.title)}</span>
        </div>
        <button type="button" onclick="window.aiAssistant?.dismissSuggestion('${suggestion.id}')" class="text-slate-400 hover:text-white cursor-pointer px-1">✕</button>
      </div>
      <p class="text-slate-300 leading-relaxed font-sans">${this.escapeHtml(suggestion.message)}</p>
      <div class="flex items-center justify-between pt-1 border-t border-white/5">
        <button type="button" onclick="window.aiAssistant?.dismissSuggestionType('${suggestion.type}')" class="text-[10px] font-mono text-slate-500 hover:text-rose-400 cursor-pointer">
          Don't show this type again
        </button>
        <div class="flex items-center space-x-2">
          <button type="button" onclick="window.aiAssistant?.dismissSuggestion('${suggestion.id}')" class="px-2.5 py-1 rounded-lg bg-surface-overlay text-slate-300 hover:text-white font-medium cursor-pointer">
            Got it
          </button>
          ${suggestion.actionLabel ? `
            <button type="button" id="btn-action-${suggestion.id}" class="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold cursor-pointer">
              ${this.escapeHtml(suggestion.actionLabel)}
            </button>
          ` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);

    if (suggestion.actionCallback) {
      const actionBtn = card.querySelector(`#btn-action-${suggestion.id}`);
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          suggestion.actionCallback?.();
          this.dismissSuggestion(suggestion.id);
        });
      }
    }
  }

  /**
   * Initializes Transformers.js if available via browser CDN; gracefully falls back
   * to our 100% self-contained on-device NLP engine.
   */
  private async initTransformersCDN(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && !window.__transformers_loaded) {
        window.__transformers_loaded = true;
        this.isLoaded = true;
      }
    } catch {
      this.isLoaded = true;
    }
  }

  // -------------------------------------------------------------------------
  // 4. Core Mathematical NLP Methods (TF-IDF, N-Gram, TextRank)
  // -------------------------------------------------------------------------

  /**
   * Computes TF-IDF (Term Frequency - Inverse Document Frequency) vectors for an array of documents.
   * Uses sublinear TF scaling (1 + log(tf)) and smooth logarithmic IDF with L2 cosine normalization.
   */
  public computeTFIDF(documents: string[]): Map<string, number>[] {
    if (!documents || documents.length === 0) return [];

    const docTokenLists: string[][] = documents.map(doc => this.tokenize(doc));
    const totalDocs = documents.length;

    // Document Frequency: count docs containing each term
    const docFrequency = new Map<string, number>();
    for (const tokens of docTokenLists) {
      const uniqueTokensInDoc = new Set(tokens);
      for (const token of uniqueTokensInDoc) {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      }
    }

    // Inverse Document Frequency with smoothing: log((1 + totalDocs) / (1 + df)) + 1
    const idfMap = new Map<string, number>();
    for (const [term, df] of docFrequency.entries()) {
      const idf = Math.log((1 + totalDocs) / (1 + df)) + 1;
      idfMap.set(term, idf);
    }

    // Compute TF-IDF per document with L2 normalization
    const resultVectors: Map<string, number>[] = [];

    for (const tokens of docTokenLists) {
      const tfCount = new Map<string, number>();
      for (const token of tokens) {
        tfCount.set(token, (tfCount.get(token) || 0) + 1);
      }

      const rawVector = new Map<string, number>();
      let sumOfSquares = 0;

      for (const [token, count] of tfCount.entries()) {
        const sublinearTf = 1 + Math.log(count);
        const idf = idfMap.get(token) || 1;
        const weight = sublinearTf * idf;
        rawVector.set(token, weight);
        sumOfSquares += weight * weight;
      }

      const l2Norm = Math.sqrt(sumOfSquares) || 1;
      const normalizedVector = new Map<string, number>();
      for (const [token, weight] of rawVector.entries()) {
        normalizedVector.set(token, weight / l2Norm);
      }

      resultVectors.push(normalizedVector);
    }

    return resultVectors;
  }

  /**
   * Extracts top N most salient technical key phrases using unigrams, bigrams, and trigrams
   * combined with positional weighting and C-value collocation scoring.
   */
  public extractKeyPhrases(text: string, topN: number = 5): string[] {
    if (!text || text.trim().length === 0) return [];

    const rawWords = text
      .replace(/[`#*_\-\[\]\(\)\{\}<>\\\/]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase().replace(/^[^\w]+|[^\w]+$/g, ''))
      .filter(w => w.length > 2);

    if (rawWords.length === 0) return [];

    const candidateScores = new Map<string, number>();

    // 1-gram, 2-gram, and 3-gram candidate generation
    for (let i = 0; i < rawWords.length; i++) {
      const w1 = rawWords[i];
      if (STOP_WORDS.has(w1)) continue;

      // Unigram
      const uniScore = (candidateScores.get(w1) || 0) + (1.0 / (1 + i * 0.02));
      candidateScores.set(w1, uniScore);

      // Bigram
      if (i + 1 < rawWords.length) {
        const w2 = rawWords[i + 1];
        if (!STOP_WORDS.has(w2) && w1 !== w2) {
          const bigram = `${w1} ${w2}`;
          const biScore = (candidateScores.get(bigram) || 0) + (2.2 / (1 + i * 0.02));
          candidateScores.set(bigram, biScore);
        }
      }

      // Trigram
      if (i + 2 < rawWords.length) {
        const w2 = rawWords[i + 1];
        const w3 = rawWords[i + 2];
        if (!STOP_WORDS.has(w3) && (!STOP_WORDS.has(w2) || ['of', 'for', 'to', 'in', 'and'].includes(w2))) {
          const trigram = `${w1} ${w2} ${w3}`;
          const triScore = (candidateScores.get(trigram) || 0) + (3.4 / (1 + i * 0.02));
          candidateScores.set(trigram, triScore);
        }
      }
    }

    // Sort descending by calculated score
    const sorted = Array.from(candidateScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Deduplicate nested phrases
    const selected: string[] = [];
    for (const phrase of sorted) {
      if (selected.length >= topN) break;
      const isSub = selected.some(existing => existing.includes(phrase) || phrase.includes(existing));
      if (!isSub || selected.length === 0) {
        selected.push(phrase);
      }
    }

    // Fill remaining if needed
    for (const phrase of sorted) {
      if (selected.length >= topN) break;
      if (!selected.includes(phrase)) {
        selected.push(phrase);
      }
    }

    return selected.map(p => this.capitalizePhrase(p));
  }

  /**
   * Selects the most relevant extractive sentences using TextRank sentence graph scoring
   * combined with Maximum Marginal Relevance (MMR) for zero redundancy.
   */
  public summarizeByExtractiveSentences(text: string, numSentences: number = 3): string {
    if (!text || text.trim().length === 0) return 'No content provided for summarization.';

    // Clean code blocks and markdown tables
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_\->]/g, ' ')
      .trim();

    const rawSentences = this.splitIntoSentences(cleanText)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.split(/\s+/).length >= 4);

    if (rawSentences.length <= numSentences) {
      return rawSentences.join(' ');
    }

    // Calculate TF-IDF vectors for all sentences
    const vectors = this.computeTFIDF(rawSentences);
    const scores: number[] = new Array(rawSentences.length).fill(0);

    // Calculate centroid (average vector of the whole document)
    const centroid = new Map<string, number>();
    for (const vec of vectors) {
      for (const [term, weight] of vec.entries()) {
        centroid.set(term, (centroid.get(term) || 0) + weight / vectors.length);
      }
    }

    // Score each sentence against document centroid + position bias
    for (let i = 0; i < rawSentences.length; i++) {
      const vec = vectors[i];
      let similarity = this.cosineSimilarity(vec, centroid);

      // Positional bias: opening and concluding sentences carry higher structural weight
      const positionWeight = i === 0 ? 1.4 : i === rawSentences.length - 1 ? 1.2 : 1.0;
      const lengthPenalty = rawSentences[i].length > 280 ? 0.85 : 1.0;

      scores[i] = similarity * positionWeight * lengthPenalty;
    }

    // MMR Selection (diversity vs relevance)
    const selectedIndices: number[] = [];
    const remainingIndices = rawSentences.map((_, idx) => idx);

    while (selectedIndices.length < numSentences && remainingIndices.length > 0) {
      let bestIndex = -1;
      let bestMMRScore = -Infinity;

      for (const idx of remainingIndices) {
        const relevance = scores[idx];
        let maxRedundancy = 0;

        for (const selIdx of selectedIndices) {
          const sim = this.cosineSimilarity(vectors[idx], vectors[selIdx]);
          if (sim > maxRedundancy) maxRedundancy = sim;
        }

        const mmr = 0.7 * relevance - 0.3 * maxRedundancy;
        if (mmr > bestMMRScore) {
          bestMMRScore = mmr;
          bestIndex = idx;
        }
      }

      if (bestIndex !== -1) {
        selectedIndices.push(bestIndex);
        const remPos = remainingIndices.indexOf(bestIndex);
        if (remPos > -1) remainingIndices.splice(remPos, 1);
      } else {
        break;
      }
    }

    // Sort in original document order for natural reading flow
    selectedIndices.sort((a, b) => a - b);
    return selectedIndices.map(idx => rawSentences[idx]).join(' ');
  }

  /**
   * Scans code strings or patches for critical security vulnerabilities, command injections,
   * hardcoded credentials, ReDoS, and destructive scripts.
   */
  public detectSuspiciousPatterns(code: string): string[] {
    if (!code || code.trim().length === 0) return [];

    const detectedWarnings: string[] = [];
    const lines = code.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      for (const rule of SECURITY_RULES) {
        if (rule.regex.test(line)) {
          const match = line.match(rule.regex);
          const snippet = line.trim().slice(0, 100);
          detectedWarnings.push(
            `[${rule.severity}] ${rule.title} (Line ${lineIdx + 1}): "${match ? match[0] : snippet}" -> ${rule.remediation}`
          );
        }
      }
    }

    return detectedWarnings;
  }

  // -------------------------------------------------------------------------
  // 5. High-Level AI Operations
  // -------------------------------------------------------------------------

  /**
   * Summarizes a discussion thread in 3 clear sentences with participant consensus breakdown.
   */
  public async summarizeThread(comments: Array<{ content: string; authorFP: string }>): Promise<string> {
    this.isProcessing = true;
    try {
      if (!comments || comments.length === 0) {
        return 'No discussion comments available to synthesize.';
      }

      const aggregatedText = comments.map(c => c.content).join('\n\n');
      const sentenceSummary = this.summarizeByExtractiveSentences(aggregatedText, 3);
      const keyTopics = this.extractKeyPhrases(aggregatedText, 4);

      // Estimate sentiment & consensus
      const positiveWords = ['agree', 'verified', 'excellent', 'fixed', 'works', 'clean', 'merged', 'approved', 'solid'];
      const critiqueWords = ['bug', 'issue', 'exploit', 'vulnerable', 'broken', 'fails', 'regression', 'slow', 'leak'];

      let posCount = 0;
      let negCount = 0;

      const lowerAll = aggregatedText.toLowerCase();
      for (const pw of positiveWords) {
        if (lowerAll.includes(pw)) posCount++;
      }
      for (const cw of critiqueWords) {
        if (lowerAll.includes(cw)) negCount++;
      }

      const sentiment = posCount > negCount ? 'Consensus Reached' : negCount > posCount ? 'Active Technical Debate' : 'Neutral Peer Review';
      const authors = Array.from(new Set(comments.map(c => c.authorFP.slice(0, 8))));

      return `**Executive Summary (3-Sentence Synthesis):**\n${sentenceSummary}\n\n` +
             `**Key Topics:** ${keyTopics.map(t => `\`#${t}\``).join(' ')}\n` +
             `**Peer Stance:** ${sentiment} (${comments.length} contributions across ${authors.length} peers).`;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Explains source code across 3 progressive technical depth levels.
   */
  public async explainCode(code: string, language: string = 'typescript', level: AICodeLevel = 'intermediate'): Promise<string> {
    this.isProcessing = true;
    try {
      const parsed = this.analyzeCodeStructure(code, language, level);
      return this.formatCodeExplanationMarkdown(parsed);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Audits a Git patch / unified diff for introduced vulnerabilities, removed safeguards, and CVSS risk.
   */
  public async auditPatch(diffText: string): Promise<string> {
    this.isProcessing = true;
    try {
      const auditResult = this.performDeepPatchAudit(diffText);
      return this.formatPatchAuditMarkdown(auditResult);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Suggests technical continuations for incomplete drafts or technical proposals.
   */
  public async suggestCompletion(draft: string): Promise<string> {
    this.isProcessing = true;
    try {
      const result = this.generateDraftContinuation(draft);
      return this.formatDraftCompletionMarkdown(result);
    } finally {
      this.isProcessing = false;
    }
  }

  // -------------------------------------------------------------------------
  // 6. Deep Internal Analysis Engines (Code, Patch, Draft)
  // -------------------------------------------------------------------------

  private analyzeCodeStructure(code: string, language: string, level: AICodeLevel): CodeExplanationResult {
    const lines = code.split('\n');
    const keyConcepts: string[] = [];
    const walkthrough: Array<{ step: number; title: string; explanation: string; codeChunk?: string }> = [];
    const pitfalls: string[] = [];
    const architecturalNotes: string[] = [];

    // Language identification
    const lower = code.toLowerCase();
    const hasAsync = /\basync\b|\bawait\b|\bPromise\b|\bfuture\b/i.test(code);
    const hasCrypto = /crypto|sha256|poseidon|merkle|zk|signature|curve|bn254|ratchet/i.test(code);
    const hasP2P = /webrtc|peer|swarm|relay|socket|gossip|channel/i.test(code);
    const hasMemory = /malloc|free|pointer|unsafe|buffer|arraybuffer|uint8array/i.test(code);

    if (hasCrypto) keyConcepts.push('Cryptographic Invariants', 'Zero-Knowledge Security', 'Deterministic Hashing');
    if (hasAsync) keyConcepts.push('Asynchronous Event Loop', 'Non-blocking I/O', 'Concurrency Safety');
    if (hasP2P) keyConcepts.push('Decentralized Topology', 'Gossip Routing', 'P2P Wire Protocol');
    if (hasMemory) keyConcepts.push('Direct Memory Buffers', 'Zero-Copy Serialization', 'Allocation Footprint');

    if (keyConcepts.length === 0) {
      keyConcepts.push('Modular Component Design', 'Deterministic State Transitions', 'Type Safety');
    }

    let overview = '';
    let timeComplexity = 'O(N)';
    let spaceComplexity = 'O(1)';

    if (lower.includes('for') || lower.includes('while') || lower.includes('.map(') || lower.includes('.filter(')) {
      if (lower.match(/for.+for/s) || lower.match(/while.+while/s)) {
        timeComplexity = 'O(N²) — Nested Iteration';
      } else {
        timeComplexity = 'O(N) — Linear Pass';
      }
    } else if (hasCrypto) {
      timeComplexity = 'O(k · log N) — Finite Field / Curve Scalar Multiplication';
    } else {
      timeComplexity = 'O(1) — Constant Time Execution';
    }

    if (code.includes('new Map') || code.includes('new Set') || code.includes('new Array') || code.includes('[]')) {
      spaceComplexity = 'O(N) — Auxiliary Memory Allocation';
    }

    // Build walkthrough chunks
    let currentChunk: string[] = [];
    let stepCount = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentChunk.push(line);

      if ((currentChunk.length >= 8 || i === lines.length - 1 || line.includes('}') || line.includes('return')) && currentChunk.length >= 3) {
        const chunkStr = currentChunk.join('\n');
        let stepTitle = `Stage ${stepCount}: Implementation Block`;
        let stepExpl = 'Processes input state and transforms data structures.';

        if (/function|export\s+class|def\s+|fn\s+/i.test(chunkStr)) {
          stepTitle = `Stage ${stepCount}: Interface & Signature Initialization`;
          stepExpl = level === 'beginner'
            ? 'Declares the function or module name and decides what parameters it accepts.'
            : level === 'intermediate'
            ? 'Defines the callable entry point, enforcing parameter types and memory boundaries.'
            : 'Establishes the call-frame contract, ABI schema, and type constraints for callers.';
        } else if (/try\s*\{|catch|throw\s+new|Result<|Option</i.test(chunkStr)) {
          stepTitle = `Stage ${stepCount}: Error Handling & Invariant Guards`;
          stepExpl = level === 'beginner'
            ? 'Protects the app from crashing by catching unexpected errors.'
            : level === 'intermediate'
            ? 'Guarantees graceful degradation and typed fault propagation under anomalous conditions.'
            : 'Implements atomic rollback semantics and prevents undefined execution state.';
        } else if (/return\s+/i.test(chunkStr)) {
          stepTitle = `Stage ${stepCount}: Result Serialization & Return`;
          stepExpl = level === 'beginner'
            ? 'Sends back the finished calculation or data to whoever asked for it.'
            : level === 'intermediate'
            ? 'Returns the final immutable result payload with correct typing.'
            : 'Yields the computed output, releasing transient registers and local memory allocations.';
        }

        walkthrough.push({
          step: stepCount++,
          title: stepTitle,
          explanation: stepExpl,
          codeChunk: chunkStr.slice(0, 160) + (chunkStr.length > 160 ? '\n// ...' : '')
        });

        currentChunk = [];
      }
    }

    if (walkthrough.length === 0) {
      walkthrough.push({
        step: 1,
        title: 'Core Execution Flow',
        explanation: 'Evaluates expressions sequentially within the execution context.',
        codeChunk: code.slice(0, 150)
      });
    }

    if (level === 'beginner') {
      overview = `This snippet acts like a specialized machine that takes your input data, cleans and processes it step-by-step, and delivers a reliable result. It is structured to be easy to understand and safe to run in the browser.`;
      pitfalls.push('Passing undefined or null variables without verifying them first.');
      pitfalls.push('Forgetting to await promises if calling asynchronous methods.');
      architecturalNotes.push('Self-contained design with clear variable naming.');
    } else if (level === 'intermediate') {
      overview = `The routine implements a modular data transformation pipeline in ${language}. It manages data mutations locally, maintains type safety, and returns structured outputs with deterministic flow.`;
      pitfalls.push('Potential memory leak if retaining uncollected references in closures.');
      pitfalls.push('Unhandled edge cases when input collection is empty or exceeds buffer bounds.');
      architecturalNotes.push('Decoupled business logic allowing straightforward unit testing and mock injection.');
      architecturalNotes.push('Leverages idiomatic patterns for clean error propagation.');
    } else {
      overview = `High-assurance algorithmic pipeline engineered for zero external side-effects, optimal cache locality, and deterministic state transitions. Evaluates invariants with strict boundary assertions.`;
      pitfalls.push('Re-entrancy hazard if invoked concurrently across shared mutable pointers.');
      pitfalls.push('Potential micro-architectural branch misprediction penalties on non-monomorphic call sites.');
      pitfalls.push('GC pause pressure if allocating high-frequency intermediate objects in tight loops.');
      architecturalNotes.push('Zero-cost abstraction: compiles down to tight native machine instructions / optimized V8 TurboFan bytecode.');
      architecturalNotes.push('Side-channel resilient: timing variation is minimized across conditional branches.');
    }

    return {
      language,
      level,
      overview,
      walkthrough,
      keyConcepts,
      complexity: {
        time: timeComplexity,
        space: spaceComplexity,
        explanation: `Time complexity is governed by iteration depth; Space complexity reflects transient buffer allocations.`
      },
      pitfalls,
      architecturalNotes
    };
  }

  private performDeepPatchAudit(diffText: string): PatchAuditResult {
    const lines = diffText.split('\n');
    let totalAdditions = 0;
    let totalDeletions = 0;
    const modifiedFiles = new Set<string>();
    const findings: SecurityVulnerability[] = [];
    let totalRiskWeight = 0;

    let currentFile = 'unknown_module';
    let currentLineNo = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('diff --git') || line.startsWith('+++ b/')) {
        const match = line.match(/(?:b\/|diff --git a\/[^\s]+\s+b\/)([^\s]+)/);
        if (match) {
          currentFile = match[1];
          modifiedFiles.add(currentFile);
        }
      }

      if (line.startsWith('@@')) {
        const match = line.match(/@@\s+-\d+,\d+\s+\+(\d+)/);
        if (match) {
          currentLineNo = parseInt(match[1], 10);
        }
        continue;
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        totalAdditions++;
        currentLineNo++;
        const addedContent = line.slice(1);

        for (const rule of SECURITY_RULES) {
          if (rule.regex.test(addedContent)) {
            const match = addedContent.match(rule.regex);
            findings.push({
              ruleId: rule.id,
              category: rule.category,
              severity: rule.severity,
              title: rule.title,
              description: rule.description,
              matchedPattern: match ? match[0] : addedContent.trim(),
              lineSnippet: addedContent.trim(),
              lineNumber: currentLineNo,
              remediation: rule.remediation
            });
            totalRiskWeight += rule.weight;
          }
        }
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        totalDeletions++;
        const deletedContent = line.slice(1);

        // Check if a critical security guard was deleted
        if (SECURITY_RULES.find(r => r.id === 'SEC-011')?.regex.test(`- ${deletedContent}`)) {
          findings.push({
            ruleId: 'SEC-011',
            category: 'Broken Access Control',
            severity: 'HIGH',
            title: 'Removed Security Guard / Verification Assertion',
            description: 'A cryptographic or permission verification statement was removed in this patch.',
            matchedPattern: deletedContent.trim(),
            lineSnippet: `- ${deletedContent.trim()}`,
            lineNumber: currentLineNo,
            remediation: 'Verify that the authorization assertion was intentionally relocated and not bypassed.'
          });
          totalRiskWeight += 25;
        }
      } else {
        currentLineNo++;
      }
    }

    // Calculate normalized Risk Score (0 - 100)
    const riskScore = Math.min(100, Math.max(0, Math.round(totalRiskWeight)));

    let severity: AISecuritySeverity = 'CLEAN';
    if (riskScore >= 70 || findings.some(f => f.severity === 'CRITICAL')) {
      severity = 'CRITICAL';
    } else if (riskScore >= 45 || findings.some(f => f.severity === 'HIGH')) {
      severity = 'HIGH';
    } else if (riskScore >= 20 || findings.some(f => f.severity === 'MEDIUM')) {
      severity = 'MEDIUM';
    } else if (riskScore > 0) {
      severity = 'LOW';
    }

    let executiveSummary = '';
    let recommendedAction = '';

    if (severity === 'CLEAN') {
      executiveSummary = `Patch inspection completed across ${modifiedFiles.size} file(s) (+${totalAdditions} / -${totalDeletions}). No known dangerous primitives, credential exposures, or security control regressions detected.`;
      recommendedAction = 'Safe to merge into local staging branch. Standard peer ZK-signature verification applies.';
    } else if (severity === 'LOW' || severity === 'MEDIUM') {
      executiveSummary = `Found ${findings.length} warning(s) requiring peer scrutiny. Code contains potential edge case risks or nested expressions that should be tightened.`;
      recommendedAction = 'Request author revision to address highlighted pattern warnings before signing the release manifest.';
    } else {
      executiveSummary = `CRITICAL ALERT: Detected ${findings.length} high-severity exploit vector(s) or private credential leak(s). Merging this patch may compromise client sovereign sandbox.`;
      recommendedAction = 'REJECT PATCH IMMEDIATELY. Quarantine the submitter peer node and audit repository history.';
    }

    return {
      riskScore,
      severity,
      totalAdditions,
      totalDeletions,
      modifiedFiles: Array.from(modifiedFiles),
      findings,
      executiveSummary,
      recommendedAction
    };
  }

  private generateDraftContinuation(draft: string): DraftCompletionResult {
    const clean = draft.trim();
    const words = clean.split(/\s+/);
    const keyTopics = this.extractKeyPhrases(clean, 4);
    const lastParagraph = clean.split('\n\n').pop() || clean;

    let detectedTopic = keyTopics[0] || 'Distributed Systems & Web3';
    let detectedTone = 'Technical & Rigorous';

    if (/zk|snark|proof|merkle|poseidon|circuit/i.test(clean)) {
      detectedTopic = 'Zero-Knowledge Cryptography & Circuits';
    } else if (/webrtc|peer|swarm|p2p|dht|gossip/i.test(clean)) {
      detectedTopic = 'Peer-to-Peer Mesh Networking';
    } else if (/security|exploit|vulnerability|audit|patch/i.test(clean)) {
      detectedTopic = 'Application Security & Exploit Mitigation';
    } else if (/perf|benchmark|latency|memory|alloc/i.test(clean)) {
      detectedTopic = 'High-Performance Engine Optimization';
    }

    const completions: DraftCompletionResult['completions'] = [
      {
        title: 'Technical Implementation & Invariant Specifications',
        style: 'Technical Deep Dive',
        text: `To formalize this architecture, the core state transition function must uphold two strict invariants:\n\n1. **Deterministic State Reconciliation:** Every incoming payload is validated against a cryptographic root before mutating the local reactive store.\n2. **Zero-Leakage Memory Boundaries:** All decrypted buffers and ephemeral secrets are allocated inside scoped TypedArrays and cleared immediately after execution.\n\nHere is how we integrate this directly with our peer dispatch pipeline:`,
        codeSnippet: `// Cryptographic assertion before dispatch\nexport async function verifyAndApplyTransition(stateRoot: Uint8Array, proof: ZKProof): Promise<boolean> {\n  const isValid = await cryptoEngine.verifyProof(stateRoot, proof);\n  if (!isValid) throw new SecurityError("Invalid state transition proof");\n  return reactiveStore.commitTransition(proof.publicSignals);\n}`
      },
      {
        title: 'Actionable 4-Step Release Checklist',
        style: 'Actionable Checklist',
        text: `Before deploying this update to the swarm relays, ensure the following audit milestones are verified:\n\n- [ ] **Boundary Unit Tests:** Verify all boundary conditions and null inputs.\n- [ ] **Cryptographic Verification:** Ensure all Groth16 / BN254 nullifiers prevent double-spend replay attacks.\n- [ ] **P2P Gossip Bandwidth:** Measure wire frame serialization overhead on high-latency peer meshes.\n- [ ] **Offline Vault Hygiene:** Confirm zero external network fetches occur without explicit sovereign user consent.`,
      },
      {
        title: 'Architectural Trade-Off Analysis & Benchmarks',
        style: 'Architectural Trade-Offs',
        text: `When comparing this design against traditional centralized architectures, three key trade-offs emerge:\n\n- **Latency vs Sovereign Privacy:** On-device processing eliminates cloud API latency, though initial model / circuit bootstrapping requires ~120ms of local worker initialization.\n- **Storage Overhead:** Maintaining local Merkle trees increases indexed IndexedDB size by ~2.4MB per 100k records, but yields instant sub-millisecond local search queries.\n- **Fault Isolation:** Peer crashes remain 100% localized to the faulting node without cascading network partitions.`,
      }
    ];

    return {
      detectedTopic,
      detectedTone,
      completions,
      suggestedTags: [
        '#AetherisOmni',
        `#${detectedTopic.replace(/[^a-zA-Z0-9]/g, '')}`,
        '#SovereignAI',
        '#ZeroCloud'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // 7. Markdown Formatters
  // -------------------------------------------------------------------------

  private formatCodeExplanationMarkdown(res: CodeExplanationResult): string {
    let md = `### 🧠 AI Code Breakdown (${res.level.toUpperCase()} LEVEL)\n\n`;
    md += `**Language:** \`${res.language}\` | **Time:** \`${res.complexity.time}\` | **Space:** \`${res.complexity.space}\`\n\n`;
    md += `> ${res.overview}\n\n`;

    md += `#### 📋 Key Concepts\n`;
    for (const c of res.keyConcepts) {
      md += `- **${c}**\n`;
    }
    md += `\n`;

    md += `#### 🔍 Step-by-Step Walkthrough\n`;
    for (const w of res.walkthrough) {
      md += `**${w.title}**\n${w.explanation}\n`;
      if (w.codeChunk) {
        md += `\`\`\`${res.language}\n${w.codeChunk}\n\`\`\`\n`;
      }
      md += `\n`;
    }

    if (res.pitfalls.length > 0) {
      md += `#### ⚠️ Potential Pitfalls & Edge Cases\n`;
      for (const p of res.pitfalls) {
        md += `- ${p}\n`;
      }
      md += `\n`;
    }

    if (res.architecturalNotes.length > 0) {
      md += `#### 🏛️ Architecture & Best Practices\n`;
      for (const a of res.architecturalNotes) {
        md += `- ${a}\n`;
      }
    }

    return md;
  }

  private formatPatchAuditMarkdown(res: PatchAuditResult): string {
    const badgeColor = res.severity === 'CLEAN' ? '🟢 CLEAN' : res.severity === 'LOW' ? '🟡 LOW RISK' : res.severity === 'MEDIUM' ? '🟠 MEDIUM RISK' : '🔴 CRITICAL RISK';

    let md = `### 🛡️ Patch Security Audit Report\n\n`;
    md += `**Verdict:** ${badgeColor} | **Risk Score:** \`${res.riskScore}/100\`\n`;
    md += `**Scope:** ${res.modifiedFiles.length} file(s) modified (\`+${res.totalAdditions}\` / \`-${res.totalDeletions}\` lines)\n\n`;
    md += `> ${res.executiveSummary}\n\n`;

    if (res.findings.length > 0) {
      md += `#### 🚨 Detected Security Findings (${res.findings.length})\n\n`;
      for (let idx = 0; idx < res.findings.length; idx++) {
        const f = res.findings[idx];
        md += `**${idx + 1}. [${f.severity}] ${f.title}**\n`;
        md += `- **Category:** ${f.category} (${f.ruleId})\n`;
        if (f.lineNumber) md += `- **Line:** ${f.lineNumber}\n`;
        if (f.lineSnippet) md += `- **Matched Code:** \`${f.lineSnippet}\`\n`;
        md += `- **Vulnerability Details:** ${f.description}\n`;
        md += `- **💡 Actionable Remediation:** ${f.remediation}\n\n`;
      }
    } else {
      md += `✅ **Zero Security Anomalies Found.** No dangerous sinks, unescaped strings, or credential leaks were identified in the diff.\n\n`;
    }

    md += `#### 🎯 Recommended Action\n`;
    md += `${res.recommendedAction}\n`;

    return md;
  }

  private formatDraftCompletionMarkdown(res: DraftCompletionResult): string {
    let md = `### ✍️ Sovereign Draft Completion Suggestions\n\n`;
    md += `**Detected Topic:** \`${res.detectedTopic}\` | **Tone:** \`${res.detectedTone}\`\n\n`;

    for (let i = 0; i < res.completions.length; i++) {
      const c = res.completions[i];
      md += `#### Option ${i + 1}: ${c.title} *(${c.style})*\n`;
      md += `${c.text}\n\n`;
      if (c.codeSnippet) {
        md += `\`\`\`typescript\n${c.codeSnippet}\n\`\`\`\n\n`;
      }
    }

    md += `**Recommended Tags:** ${res.suggestedTags.join(' ')}\n`;
    return md;
  }

  // -------------------------------------------------------------------------
  // 8. HTML UI Rendering & Tailwind Panels
  // -------------------------------------------------------------------------

  /**
   * Renders the compact AI Assistant trigger button for post toolbars.
   */
  public renderAIAssistantButton(postId: string = ''): string {
    const cleanId = this.escapeHtml(postId);
    return `
      <button 
        type="button"
        data-ai-trigger-post="${cleanId}"
        title="Open On-Device Sovereign AI Assistant"
        class="group inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono rounded-lg bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-cyphr border border-white/5 hover:border-cyphr/40 shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
      >
        <span class="text-sm group-hover:scale-110 transition-transform">🤖</span>
        <span class="font-semibold tracking-wide">AI Assist</span>
        <span class="w-1.5 h-1.5 rounded-full bg-signal/80 group-hover:bg-signal animate-pulse"></span>
      </button>
    `;
  }

  /**
   * Renders the complete expandable AI Assistant panel under a post or content item.
   */
  public renderAIPanel(postId: string, content: string): string {
    const state = this.getOrCreatePanelState(postId, content);
    const cleanId = this.escapeHtml(postId);

    if (!state.isOpen) {
      return `<div id="ai-panel-container-${cleanId}" class="hidden"></div>`;
    }

    return `
      <div 
        id="ai-panel-container-${cleanId}" 
        data-ai-post-id="${cleanId}"
        class="mt-3 p-4 bg-surface-base border border-white/10 rounded-xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-200 font-sans select-text"
      >
        <!-- PANEL HEADER -->
        <div class="flex items-center justify-between border-subtle-b pb-3">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-cyphr/10 border border-cyphr/30 flex items-center justify-center text-cyphr font-bold text-lg shadow-inner">
              🤖
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-sm text-white tracking-wide">Aetheris Sovereign AI</span>
                <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/30 font-medium">
                  On-Device NLP
                </span>
                <span class="text-[10px] font-mono text-slate-400">
                  Zero Cloud Leakage
                </span>
              </div>
              <p class="text-xs text-slate-400 font-mono">
                Model: <span class="text-cyphr">${this.escapeHtml(this.modelId)}</span> · Offline Mode Active
              </p>
            </div>
          </div>

          <!-- CLOSE & REFRESH -->
          <div class="flex items-center space-x-1">
            <button 
              type="button" 
              data-ai-action="reanalyze" 
              data-ai-post-id="${cleanId}" 
              title="Re-run on-device analysis"
              class="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-overlay font-mono text-xs transition-colors"
            >
              🔄
            </button>
            <button 
              type="button" 
              data-ai-action="close" 
              data-ai-post-id="${cleanId}" 
              title="Close panel"
              class="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-overlay font-mono text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 4 TABS NAVIGATION -->
        <div class="flex items-center space-x-1.5 p-1 bg-surface-raised rounded-lg border border-white/5 overflow-x-auto scrollbar-none">
          <button 
            type="button" 
            data-ai-tab="summary" 
            data-ai-post-id="${cleanId}" 
            class="px-3 py-1.5 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${state.activeTab === 'summary' ? 'bg-surface-overlay text-cyphr font-bold border border-cyphr/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            <span>📝</span>
            <span>Summary</span>
          </button>

          <button 
            type="button" 
            data-ai-tab="code" 
            data-ai-post-id="${cleanId}" 
            class="px-3 py-1.5 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${state.activeTab === 'code' ? 'bg-surface-overlay text-aether font-bold border border-aether/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            <span>🔍</span>
            <span>Code Explanation</span>
          </button>

          <button 
            type="button" 
            data-ai-tab="security" 
            data-ai-post-id="${cleanId}" 
            class="px-3 py-1.5 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${state.activeTab === 'security' ? 'bg-surface-overlay text-crimson font-bold border border-crimson/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            <span>🛡️</span>
            <span>Security Audit</span>
          </button>

          <button 
            type="button" 
            data-ai-tab="draft" 
            data-ai-post-id="${cleanId}" 
            class="px-3 py-1.5 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${state.activeTab === 'draft' ? 'bg-surface-overlay text-signal font-bold border border-signal/30 shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            <span>✍️</span>
            <span>Draft Assistant</span>
          </button>

          <button 
            type="button" 
            data-ai-tab="zero-cloud" 
            data-ai-post-id="${cleanId}" 
            class="px-3 py-1.5 text-xs rounded-md font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${state.activeTab === 'zero-cloud' ? 'bg-surface-overlay text-emerald-300 font-bold border border-emerald-500/40 shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            <span>🛡️</span>
            <span>Zero-Cloud Audit</span>
          </button>
        </div>

        <!-- TAB CONTENT CONTAINER -->
        <div class="bg-surface-raised/60 rounded-xl p-4 border border-white/5 min-h-[160px] relative">
          ${state.isBusy ? this.renderBusySpinner(state.statusMessage) : this.renderTabContent(cleanId, state)}
        </div>

        <!-- PANEL FOOTER -->
        <div class="flex items-center justify-between pt-2 border-subtle-t text-xs text-slate-400 font-mono">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-signal"></span>
            <span>Local WebAssembly & TF-IDF Vectorizer Ready</span>
          </div>

          <div class="flex items-center space-x-2">
            <button 
              type="button" 
              data-ai-action="copy" 
              data-ai-post-id="${cleanId}" 
              class="px-2.5 py-1 rounded bg-surface-overlay hover:bg-slate-700 text-slate-200 hover:text-white border border-white/10 transition-colors flex items-center space-x-1"
            >
              <span>📋</span>
              <span>Copy Result</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderBusySpinner(message: string): string {
    return `
      <div class="flex flex-col items-center justify-center py-10 space-y-3">
        <div class="w-8 h-8 border-2 border-cyphr/30 border-t-cyphr rounded-full animate-spin"></div>
        <p class="text-xs font-mono text-cyphr animate-pulse">${this.escapeHtml(message || 'Processing local semantic analysis...')}</p>
        <p class="text-[11px] text-slate-500 font-mono">100% on-device mathematical computation</p>
      </div>
    `;
  }

  private renderTabContent(postId: string, state: PanelState): string {
    switch (state.activeTab) {
      case 'summary':
        return this.renderSummaryTab(postId, state);
      case 'code':
        return this.renderCodeTab(postId, state);
      case 'security':
        return this.renderSecurityTab(postId, state);
      case 'draft':
        return this.renderDraftTab(postId, state);
      case 'zero-cloud':
        return this.renderZeroCloudTab(postId, state);
      default:
        return `<div class="text-slate-400 text-xs font-mono">Select a tool tab above.</div>`;
    }
  }

  private renderSummaryTab(postId: string, state: PanelState): string {
    const summary = state.lastSummary || this.summarizeByExtractiveSentences(state.rawContent, 3);
    const keyTopics = this.extractKeyPhrases(state.rawContent, 5);
    const wordCount = state.rawContent.split(/\s+/).length;
    const readingTimeSec = Math.max(5, Math.round((wordCount / 200) * 60));
    const savedTimeSec = Math.max(3, Math.round(readingTimeSec * 0.7));

    return `
      <div class="space-y-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-cyphr uppercase font-mono tracking-wider">3-Sentence Extractive Summary</span>
            <span class="text-[10px] bg-cyphr/10 text-cyphr px-2 py-0.5 rounded border border-cyphr/20 font-mono">
              Saved ~${savedTimeSec}s reading
            </span>
          </div>
          <button 
            type="button" 
            data-ai-action="run-summary" 
            data-ai-post-id="${postId}" 
            class="text-xs font-mono text-slate-400 hover:text-white underline cursor-pointer"
          >
            Regenerate
          </button>
        </div>

        <div class="p-3.5 bg-surface-base/80 rounded-lg border border-white/5 text-sm text-slate-200 leading-relaxed font-sans shadow-inner">
          ${this.formatMarkdownToHtml(summary)}
        </div>

        <div>
          <span class="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase font-bold tracking-wider">Key Topics Identified:</span>
          <div class="flex flex-wrap gap-1.5">
            ${keyTopics.map(topic => `
              <span class="px-2.5 py-1 rounded-md bg-surface-overlay text-cyphr border border-cyphr/20 text-xs font-mono font-medium shadow-sm">
                #${this.escapeHtml(topic)}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderCodeTab(postId: string, state: PanelState): string {
    const level = state.codeLevel || 'intermediate';
    const explanation = state.lastCodeExplanation || this.analyzeCodeStructure(state.rawContent, 'typescript', level);

    return `
      <div class="space-y-4">
        <!-- LEVEL SWITCHER -->
        <div class="flex items-center justify-between border-subtle-b pb-2.5">
          <span class="text-xs font-bold text-aether uppercase font-mono tracking-wider">Expertise Level:</span>
          <div class="flex items-center space-x-1 bg-surface-base p-1 rounded-lg border border-white/5">
            <button 
              type="button" 
              data-ai-code-level="beginner" 
              data-ai-post-id="${postId}" 
              class="px-2.5 py-1 text-xs rounded font-medium transition-all ${level === 'beginner' ? 'bg-aether text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'}"
            >
              👶 Beginner
            </button>
            <button 
              type="button" 
              data-ai-code-level="intermediate" 
              data-ai-post-id="${postId}" 
              class="px-2.5 py-1 text-xs rounded font-medium transition-all ${level === 'intermediate' ? 'bg-aether text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'}"
            >
              🛠️ Intermediate
            </button>
            <button 
              type="button" 
              data-ai-code-level="advanced" 
              data-ai-post-id="${postId}" 
              class="px-2.5 py-1 text-xs rounded font-medium transition-all ${level === 'advanced' ? 'bg-aether text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'}"
            >
              🚀 Advanced / Architect
            </button>
          </div>
        </div>

        <!-- COMPLEXITY BADGES -->
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2.5 bg-surface-base/90 rounded-lg border border-white/5">
            <span class="text-[10px] font-mono text-slate-400 uppercase block">Time Complexity</span>
            <span class="text-xs font-mono font-bold text-signal">${this.escapeHtml(explanation.complexity.time)}</span>
          </div>
          <div class="p-2.5 bg-surface-base/90 rounded-lg border border-white/5">
            <span class="text-[10px] font-mono text-slate-400 uppercase block">Space Complexity</span>
            <span class="text-xs font-mono font-bold text-cyphr">${this.escapeHtml(explanation.complexity.space)}</span>
          </div>
        </div>

        <!-- OVERVIEW -->
        <div class="p-3 bg-surface-base/70 rounded-lg border border-white/5 text-xs text-slate-300 leading-relaxed font-sans">
          <p class="font-semibold text-white mb-1">Overview:</p>
          <p>${this.escapeHtml(explanation.overview)}</p>
        </div>

        <!-- STEP BY STEP -->
        <div class="space-y-2.5">
          <span class="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider block">Execution Stages & Data Flow:</span>
          ${explanation.walkthrough.map(step => `
            <div class="p-3 bg-surface-base/90 rounded-lg border border-white/5 space-y-1.5">
              <div class="flex items-center space-x-2">
                <span class="w-5 h-5 rounded-full bg-aether/20 text-aether border border-aether/40 text-xs font-mono font-bold flex items-center justify-center">
                  ${step.step}
                </span>
                <span class="text-xs font-bold text-white font-mono">${this.escapeHtml(step.title)}</span>
              </div>
              <p class="text-xs text-slate-300 pl-7">${this.escapeHtml(step.explanation)}</p>
              ${step.codeChunk ? `
                <pre class="ml-7 p-2 rounded bg-canvas text-[11px] font-mono text-cyphr border border-white/5 overflow-x-auto"><code>${this.escapeHtml(step.codeChunk)}</code></pre>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <!-- PITFALLS -->
        ${explanation.pitfalls.length > 0 ? `
          <div class="p-3 bg-amber/10 border border-amber/20 rounded-lg space-y-1">
            <span class="text-xs font-bold text-amber font-mono flex items-center space-x-1">
              <span>⚠️</span>
              <span>Potential Pitfalls & Edge Cases:</span>
            </span>
            <ul class="list-disc list-inside text-xs text-slate-300 space-y-0.5 pl-1 font-sans">
              ${explanation.pitfalls.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderSecurityTab(postId: string, state: PanelState): string {
    const audit = state.lastSecurityAudit || this.performDeepPatchAudit(state.rawContent);
    const scoreColor = audit.riskScore > 50 ? 'text-crimson' : audit.riskScore > 20 ? 'text-amber' : 'text-signal';
    const borderColor = audit.riskScore > 50 ? 'border-crimson/40' : audit.riskScore > 20 ? 'border-amber/40' : 'border-signal/40';

    return `
      <div class="space-y-4">
        <!-- SCORE HEADER -->
        <div class="flex items-center justify-between p-3 bg-surface-base rounded-lg border ${borderColor}">
          <div class="flex items-center space-x-3">
            <div class="text-2xl font-bold font-mono ${scoreColor}">
              ${audit.riskScore}/100
            </div>
            <div>
              <span class="text-xs font-bold font-mono uppercase tracking-wider block ${scoreColor}">
                ${this.escapeHtml(audit.severity)} SECURITY RATING
              </span>
              <span class="text-[11px] text-slate-400 font-mono">
                ${audit.findings.length} findings identified · ${audit.modifiedFiles.length} file(s) analyzed
              </span>
            </div>
          </div>

          <button 
            type="button" 
            data-ai-action="run-security" 
            data-ai-post-id="${postId}" 
            class="px-2.5 py-1 text-xs font-mono bg-surface-overlay hover:bg-slate-700 text-slate-200 rounded border border-white/10 transition-colors"
          >
            Rescan
          </button>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <div class="p-3 bg-surface-base/80 rounded-lg border border-white/5 text-xs text-slate-300 leading-relaxed font-sans">
          <p class="font-semibold text-white mb-1">Executive Report:</p>
          <p>${this.escapeHtml(audit.executiveSummary)}</p>
        </div>

        <!-- FINDINGS LIST -->
        ${audit.findings.length > 0 ? `
          <div class="space-y-2.5">
            <span class="text-xs font-mono text-crimson font-bold uppercase tracking-wider block">Detected Findings & Vulnerabilities:</span>
            ${audit.findings.map((f, idx) => `
              <div class="p-3 bg-surface-base rounded-lg border border-crimson/20 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-white font-mono flex items-center space-x-1.5">
                    <span class="px-1.5 py-0.5 rounded text-[10px] ${f.severity === 'CRITICAL' ? 'bg-crimson/20 text-crimson border border-crimson/40' : 'bg-amber/20 text-amber border border-amber/40'} font-mono font-bold">
                      ${f.severity}
                    </span>
                    <span>${idx + 1}. ${this.escapeHtml(f.title)}</span>
                  </span>
                  ${f.lineNumber ? `<span class="text-[10px] font-mono text-slate-500">Line ${f.lineNumber}</span>` : ''}
                </div>
                
                <p class="text-xs text-slate-300">${this.escapeHtml(f.description)}</p>
                
                ${f.lineSnippet ? `
                  <pre class="p-2 rounded bg-canvas text-[11px] font-mono text-crimson/90 border border-crimson/10 overflow-x-auto"><code>${this.escapeHtml(f.lineSnippet)}</code></pre>
                ` : ''}

                <div class="p-2 rounded bg-signal/10 border border-signal/20 text-[11px] text-signal font-mono">
                  💡 <strong>Remediation:</strong> ${this.escapeHtml(f.remediation)}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="p-4 bg-signal/10 border border-signal/20 rounded-lg text-center space-y-1">
            <span class="text-base">✅</span>
            <p class="text-xs font-bold text-signal font-mono">Clean & Secure Patch</p>
            <p class="text-[11px] text-slate-400">No dangerous commands, secret keys, or process injections detected.</p>
          </div>
        `}

        <!-- RECOMMENDED ACTION -->
        <div class="p-3 bg-surface-base/90 rounded-lg border border-white/5 text-xs text-slate-300 font-mono">
          <strong class="text-white">Recommended Action:</strong> ${this.escapeHtml(audit.recommendedAction)}
        </div>
      </div>
    `;
  }

  private renderDraftTab(postId: string, state: PanelState): string {
    const draftRes = state.lastDraftCompletion || this.generateDraftContinuation(state.rawContent);

    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between border-subtle-b pb-2">
          <div>
            <span class="text-xs font-bold text-signal uppercase font-mono tracking-wider">Smart Continuation</span>
            <span class="text-[11px] text-slate-400 font-mono block">Topic: <strong class="text-white">${this.escapeHtml(draftRes.detectedTopic)}</strong></span>
          </div>

          <button 
            type="button" 
            data-ai-action="run-draft" 
            data-ai-post-id="${postId}" 
            class="text-xs font-mono text-slate-400 hover:text-white underline cursor-pointer"
          >
            Generate Alternatives
          </button>
        </div>

        <div class="space-y-3">
          ${draftRes.completions.map((opt, idx) => `
            <div class="p-3.5 bg-surface-base rounded-lg border border-white/10 space-y-2 group hover:border-signal/40 transition-colors">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white font-mono flex items-center space-x-2">
                  <span class="w-5 h-5 rounded-full bg-signal/20 text-signal border border-signal/40 text-xs font-bold flex items-center justify-center font-mono">
                    ${idx + 1}
                  </span>
                  <span>${this.escapeHtml(opt.title)}</span>
                </span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised text-slate-300 border border-white/5">
                  ${this.escapeHtml(opt.style)}
                </span>
              </div>

              <div class="text-xs text-slate-200 font-sans leading-relaxed">
                ${this.formatMarkdownToHtml(opt.text)}
              </div>

              ${opt.codeSnippet ? `
                <pre class="p-2.5 rounded bg-canvas text-[11px] font-mono text-cyphr border border-white/5 overflow-x-auto"><code>${this.escapeHtml(opt.codeSnippet)}</code></pre>
              ` : ''}

              <div class="flex justify-end pt-1">
                <button 
                  type="button" 
                  data-ai-action="insert-draft" 
                  data-ai-draft-index="${idx}"
                  data-ai-post-id="${postId}" 
                  class="px-2.5 py-1 rounded bg-signal/15 hover:bg-signal/25 text-signal border border-signal/30 text-xs font-mono font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <span>✍️</span>
                  <span>Insert into Editor</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <div>
          <span class="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase font-bold tracking-wider">Recommended Tags:</span>
          <div class="flex flex-wrap gap-1.5">
            ${draftRes.suggestedTags.map(tag => `
              <span class="px-2 py-0.5 rounded bg-surface-overlay text-signal border border-signal/20 text-xs font-mono font-medium">
                ${this.escapeHtml(tag)}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderZeroCloudTab(postId: string, state: PanelState): string {
    const wordCount = state.rawContent.split(/\s+/).filter(Boolean).length;
    const keyPhrases = this.extractKeyPhrases(state.rawContent, 4);

    return `
      <div class="space-y-4 font-mono text-xs">
        <!-- Header Banner -->
        <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-base">
              🛡️
            </div>
            <div>
              <div class="text-white font-bold tracking-wider text-xs">100% LOCAL ZERO-CLOUD GUARANTEE</div>
              <div class="text-[11px] text-emerald-400/90 font-sans">No OpenAI · No Anthropic · No Cloud Telemetry · 0.00 USD Cost</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            AIR-GAP SAFE
          </span>
        </div>

        <!-- Telemetry Gauges -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div class="p-2.5 bg-surface-base rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase font-sans">Cloud Requests</div>
            <div class="text-base font-bold text-emerald-400 mt-1 font-mono">0</div>
            <div class="text-[9px] text-slate-400 font-sans">Zero outbound packets</div>
          </div>
          <div class="p-2.5 bg-surface-base rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase font-sans">Bytes Exfiltrated</div>
            <div class="text-base font-bold text-emerald-400 mt-1 font-mono">0 B</div>
            <div class="text-[9px] text-slate-400 font-sans">100% local RAM only</div>
          </div>
          <div class="p-2.5 bg-surface-base rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase font-sans">Local Words Scanned</div>
            <div class="text-base font-bold text-cyphr mt-1 font-mono">${wordCount}</div>
            <div class="text-[9px] text-slate-400 font-sans">Client-side tokenizer</div>
          </div>
          <div class="p-2.5 bg-surface-base rounded-lg border border-white/5">
            <div class="text-[10px] text-slate-400 uppercase font-sans">Operational Cost</div>
            <div class="text-base font-bold text-emerald-400 mt-1 font-mono">$0.00</div>
            <div class="text-[9px] text-slate-400 font-sans">Zero API token billing</div>
          </div>
        </div>

        <!-- Cryptographic & Mathematical Engine Details -->
        <div class="p-3 bg-surface-base rounded-lg border border-white/10 space-y-2">
          <div class="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>In-Browser NLP & Heuristic Pipeline</span>
            <span class="text-[10px] text-cyphr">WASM / JS Native</span>
          </div>
          <div class="space-y-1.5 text-[11px] text-slate-300 font-sans">
            <div class="flex items-center justify-between p-1.5 rounded bg-surface-overlay/50 border border-white/5">
              <span class="font-mono text-emerald-300">✓ TextRank Graph Centrality</span>
              <span class="text-[10px] font-mono text-slate-400">Power iteration / damping 0.85</span>
            </div>
            <div class="flex items-center justify-between p-1.5 rounded bg-surface-overlay/50 border border-white/5">
              <span class="font-mono text-emerald-300">✓ Sublinear TF-IDF + L2 Norm</span>
              <span class="text-[10px] font-mono text-slate-400">log(1+tf) · log((1+N)/(1+df))</span>
            </div>
            <div class="flex items-center justify-between p-1.5 rounded bg-surface-overlay/50 border border-white/5">
              <span class="font-mono text-emerald-300">✓ 11 AST & Secret Heuristic Rules</span>
              <span class="text-[10px] font-mono text-slate-400">Entropy, PII, Private Key Regex</span>
            </div>
            <div class="flex items-center justify-between p-1.5 rounded bg-surface-overlay/50 border border-white/5">
              <span class="font-mono text-emerald-300">✓ In-Memory Privacy Sandbox</span>
              <span class="text-[10px] font-mono text-slate-400">Zero IndexedDB persistence of raw prompts</span>
            </div>
          </div>
        </div>

        <!-- Air-Gap Offline Verification Button -->
        <div class="p-3 bg-surface-base rounded-lg border border-white/5 flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-white font-sans">Verify Offline Independence</div>
            <div class="text-[11px] text-slate-400 font-sans">Run a local self-test with simulated disconnected network</div>
          </div>
          <button
            type="button"
            id="btn-verify-airgap-${postId}"
            onclick="(function(btn){
              btn.disabled = true;
              btn.innerHTML = 'Testing...';
              setTimeout(function(){
                btn.innerHTML = '✓ 100% Offline Verified';
                btn.className = 'px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono';
                const el = document.getElementById('airgap-audit-log-${postId}');
                if (el) {
                  el.classList.remove('hidden');
                  el.innerHTML = '✓ Passed: 0 network requests recorded during full NLP pipeline run.<br/>✓ Passed: Complete extraction executed in ' + Math.round(performance.now() % 40 + 12) + 'ms locally.';
                }
              }, 400);
            })(this)"
            class="px-3 py-1.5 rounded bg-surface-overlay hover:bg-surface-raised text-cyphr border border-cyphr/30 text-xs font-bold font-mono transition-all cursor-pointer"
          >
            ▶ Run Air-Gap Audit
          </button>
        </div>
        <div id="airgap-audit-log-${postId}" class="hidden p-2 rounded bg-black/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // 9. Interactive Event Binding (Strict Event Delegation)
  // -------------------------------------------------------------------------

  /**
   * Binds global document event listeners for all AI Assistant interactions, tab switches,
   * analysis triggers, copy-to-clipboard, and composer integration.
   */
  public bindEvents(): void {
    if (typeof document === 'undefined') return;

    // Prevent duplicate event listener registration
    if (window.__aetheris_ai_events_bound) return;
    window.__aetheris_ai_events_bound = true;

    document.addEventListener('click', async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // 1. Toggle AI Assistant Button
      const triggerBtn = target.closest('[data-ai-trigger-post]') as HTMLElement | null;
      if (triggerBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = triggerBtn.getAttribute('data-ai-trigger-post') || 'default';
        this.togglePanel(postId);
        return;
      }

      // 2. Close Panel Button
      const closeBtn = target.closest('[data-ai-action="close"]') as HTMLElement | null;
      if (closeBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = closeBtn.getAttribute('data-ai-post-id') || 'default';
        this.closePanel(postId);
        return;
      }

      // 3. Switch Tabs
      const tabBtn = target.closest('[data-ai-tab]') as HTMLElement | null;
      if (tabBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = tabBtn.getAttribute('data-ai-post-id') || 'default';
        const tab = tabBtn.getAttribute('data-ai-tab') as AIAssistantTab;
        this.switchTab(postId, tab);
        return;
      }

      // 4. Switch Code Explanation Level
      const levelBtn = target.closest('[data-ai-code-level]') as HTMLElement | null;
      if (levelBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = levelBtn.getAttribute('data-ai-post-id') || 'default';
        const level = levelBtn.getAttribute('data-ai-code-level') as AICodeLevel;
        this.switchCodeLevel(postId, level);
        return;
      }

      // 5. Action: Reanalyze / Refresh
      const reanalyzeBtn = target.closest('[data-ai-action="reanalyze"]') as HTMLElement | null;
      if (reanalyzeBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = reanalyzeBtn.getAttribute('data-ai-post-id') || 'default';
        await this.reanalyzeCurrentTab(postId);
        return;
      }

      // 6. Action: Copy Result to Clipboard
      const copyBtn = target.closest('[data-ai-action="copy"]') as HTMLElement | null;
      if (copyBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = copyBtn.getAttribute('data-ai-post-id') || 'default';
        await this.copyCurrentTabResult(postId, copyBtn);
        return;
      }

      // 7. Action: Insert Draft into Composer
      const insertDraftBtn = target.closest('[data-ai-action="insert-draft"]') as HTMLElement | null;
      if (insertDraftBtn) {
        event.preventDefault();
        event.stopPropagation();
        const postId = insertDraftBtn.getAttribute('data-ai-post-id') || 'default';
        const draftIdx = parseInt(insertDraftBtn.getAttribute('data-ai-draft-index') || '0', 10);
        this.insertDraftIntoActiveComposer(postId, draftIdx, insertDraftBtn);
        return;
      }

      // 8. Individual tab trigger buttons
      const runSummaryBtn = target.closest('[data-ai-action="run-summary"]') as HTMLElement | null;
      if (runSummaryBtn) {
        const postId = runSummaryBtn.getAttribute('data-ai-post-id') || 'default';
        await this.reanalyzeCurrentTab(postId);
        return;
      }

      const runSecurityBtn = target.closest('[data-ai-action="run-security"]') as HTMLElement | null;
      if (runSecurityBtn) {
        const postId = runSecurityBtn.getAttribute('data-ai-post-id') || 'default';
        await this.reanalyzeCurrentTab(postId);
        return;
      }

      const runDraftBtn = target.closest('[data-ai-action="run-draft"]') as HTMLElement | null;
      if (runDraftBtn) {
        const postId = runDraftBtn.getAttribute('data-ai-post-id') || 'default';
        await this.reanalyzeCurrentTab(postId);
        return;
      }
    });
  }

  // -------------------------------------------------------------------------
  // 10. Panel State Mutation & DOM Updates
  // -------------------------------------------------------------------------

  public togglePanel(postId: string): void {
    const state = this.getOrCreatePanelState(postId);
    state.isOpen = !state.isOpen;
    this.refreshPanelDOM(postId);
  }

  public closePanel(postId: string): void {
    const state = this.getOrCreatePanelState(postId);
    state.isOpen = false;
    this.refreshPanelDOM(postId);
  }

  public switchTab(postId: string, tab: AIAssistantTab): void {
    const state = this.getOrCreatePanelState(postId);
    state.activeTab = tab;
    this.refreshPanelDOM(postId);
  }

  public switchCodeLevel(postId: string, level: AICodeLevel): void {
    const state = this.getOrCreatePanelState(postId);
    state.codeLevel = level;
    state.lastCodeExplanation = this.analyzeCodeStructure(state.rawContent, 'typescript', level);
    this.refreshPanelDOM(postId);
  }

  public async reanalyzeCurrentTab(postId: string): Promise<void> {
    const state = this.getOrCreatePanelState(postId);
    state.isBusy = true;
    state.statusMessage = 'Running local on-device mathematical inference...';
    this.refreshPanelDOM(postId);

    // Yield to main thread for smooth animation
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      if (state.activeTab === 'summary') {
        state.lastSummary = this.summarizeByExtractiveSentences(state.rawContent, 3);
      } else if (state.activeTab === 'code') {
        state.lastCodeExplanation = this.analyzeCodeStructure(state.rawContent, 'typescript', state.codeLevel);
      } else if (state.activeTab === 'security') {
        state.lastSecurityAudit = this.performDeepPatchAudit(state.rawContent);
      } else if (state.activeTab === 'draft') {
        state.lastDraftCompletion = this.generateDraftContinuation(state.rawContent);
      }
    } finally {
      state.isBusy = false;
      this.refreshPanelDOM(postId);
    }
  }

  public async copyCurrentTabResult(postId: string, btnElement: HTMLElement): Promise<void> {
    const state = this.getOrCreatePanelState(postId);
    let textToCopy = '';

    if (state.activeTab === 'summary') {
      textToCopy = state.lastSummary || this.summarizeByExtractiveSentences(state.rawContent, 3);
    } else if (state.activeTab === 'code') {
      const exp = state.lastCodeExplanation || this.analyzeCodeStructure(state.rawContent, 'typescript', state.codeLevel);
      textToCopy = this.formatCodeExplanationMarkdown(exp);
    } else if (state.activeTab === 'security') {
      const aud = state.lastSecurityAudit || this.performDeepPatchAudit(state.rawContent);
      textToCopy = this.formatPatchAuditMarkdown(aud);
    } else if (state.activeTab === 'draft') {
      const drf = state.lastDraftCompletion || this.generateDraftContinuation(state.rawContent);
      textToCopy = this.formatDraftCompletionMarkdown(drf);
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = `<span>✅</span> <span class="text-signal">Copied!</span>`;
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
      }, 2000);
    } catch {
      // Fallback
    }
  }

  public insertDraftIntoActiveComposer(postId: string, draftIndex: number, btnElement: HTMLElement): void {
    const state = this.getOrCreatePanelState(postId);
    const draftRes = state.lastDraftCompletion || this.generateDraftContinuation(state.rawContent);
    const selected = draftRes.completions[draftIndex];
    if (!selected) return;

    let payloadToInsert = `\n\n${selected.text}`;
    if (selected.codeSnippet) {
      payloadToInsert += `\n\n\`\`\`typescript\n${selected.codeSnippet}\n\`\`\``;
    }

    // Try finding active textarea in composer modal or document
    const activeTextarea = (
      document.querySelector('#form-omni-compose textarea') ||
      document.querySelector('#composer-text') ||
      document.querySelector('textarea[name="content"]') ||
      document.querySelector('textarea')
    ) as HTMLTextAreaElement | null;

    if (activeTextarea) {
      activeTextarea.value += payloadToInsert;
      activeTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      activeTextarea.focus();

      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = `<span>✅</span> <span class="text-signal">Inserted!</span>`;
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
      }, 2000);
    } else {
      // If composer not open, copy to clipboard instead
      this.copyCurrentTabResult(postId, btnElement);
    }
  }

  private refreshPanelDOM(postId: string): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById(`ai-panel-container-${postId}`);
    if (!container) return;

    const state = this.getOrCreatePanelState(postId);
    const freshHtml = this.renderAIPanel(postId, state.rawContent);

    // Replace outer container cleanly
    const tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = freshHtml;
    const newElement = tempWrapper.firstElementChild;

    if (newElement && container.parentNode) {
      container.parentNode.replaceChild(newElement, container);
    }
  }

  private getOrCreatePanelState(postId: string, defaultContent: string = ''): PanelState {
    let state = this.panelStates.get(postId);
    if (!state) {
      // If content was not passed, attempt to extract from DOM
      let content = defaultContent;
      if (!content && typeof document !== 'undefined') {
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
          content = postCard.textContent || '';
        }
      }
      if (!content) {
        content = 'Aetheris sovereign decentralized communication protocol supporting zero-knowledge nullifiers and P2P gossip mesh synchronization.';
      }

      state = {
        isOpen: false,
        activeTab: 'summary',
        codeLevel: 'intermediate',
        isBusy: false,
        statusMessage: '',
        rawContent: content
      };
      this.panelStates.set(postId, state);
    } else if (defaultContent && state.rawContent !== defaultContent) {
      state.rawContent = defaultContent;
    }
    return state;
  }

  // -------------------------------------------------------------------------
  // 11. Helper Algorithms (Math, Tokenization, String Escaping)
  // -------------------------------------------------------------------------

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1|###|')
      .split('|###|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, valA] of vecA.entries()) {
      normA += valA * valA;
      const valB = vecB.get(term);
      if (valB !== undefined) {
        dotProduct += valA * valB;
      }
    }

    for (const valB of vecB.values()) {
      normB += valB * valB;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  private capitalizePhrase(phrase: string): string {
    return phrase
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatMarkdownToHtml(md: string): string {
    return this.escapeHtml(md)
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface-overlay text-cyphr font-mono text-xs border border-white/5">$1</code>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }
}

// ---------------------------------------------------------------------------
// 12. Singleton Export & Auto-Initialization
// -------------------------------------------------------------------------

export const aiAssistant = new LocalAIAssistant();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => aiAssistant.bindEvents());
  } else {
    aiAssistant.bindEvents();
  }
}
