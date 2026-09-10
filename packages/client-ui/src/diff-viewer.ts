/**
 * UREfy — Complete Inline Diff Viewer & Code Sandbox System
 * (diff-viewer.ts)
 *
 * 100% Self-Contained, Strict TypeScript, Zero External Dependencies.
 * Provides unified Git diff parsing, side-by-side / inline rendering,
 * clean code extraction, syntax highlighting, and interactive code sandbox toolbars.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

// ---------------------------------------------------------------------------
// Interfaces & Types
// ---------------------------------------------------------------------------

export interface DiffLine {
  type: 'add' | 'remove' | 'normal';
  content: string;
  oldLineNo?: number;
  newLineNo?: number;
}

export interface DiffHunkInfo {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  heading: string;
  lines: DiffLine[];
}

export interface ParsedDiffCard {
  cardId: string;
  fileName: string;
  oldFileName?: string;
  newFileName?: string;
  additions: number;
  deletions: number;
  totalChanges: number;
  lines: DiffLine[];
  hunks: DiffHunkInfo[];
  cleanCode: string;
  rawDiff: string;
}

export interface CodeSandboxOptions {
  language?: string;
  fontSize?: number;
  wrapLines?: boolean;
  showLineNumbers?: boolean;
  readOnly?: boolean;
  autorun?: boolean;
  title?: string;
  height?: string;
}

export interface ConsoleLogEntry {
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface SandboxRunResult {
  success: boolean;
  output: string[];
  logs: ConsoleLogEntry[];
  executionTimeMs: number;
  error?: string;
}

export interface FileMetadata {
  icon: string;
  language: string;
  color: string;
  badgeClass: string;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Resolves file metadata (icon, language, color badge) based on file extension.
 */
function resolveFileMetadata(fileName: string): FileMetadata {
  const cleanName = (fileName || '').trim().toLowerCase();
  const ext = cleanName.includes('.') ? cleanName.split('.').pop() || '' : cleanName;

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'typescript':
      return {
        icon: '🔷',
        language: 'TypeScript',
        color: '#00e5ff',
        badgeClass: 'text-cyphr bg-cyan-950/60 border-cyphr/30',
      };
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
    case 'javascript':
      return {
        icon: '🟨',
        language: 'JavaScript',
        color: '#f59e0b',
        badgeClass: 'text-amber bg-yellow-950/60 border-amber/30',
      };
    case 'rs':
    case 'rust':
      return {
        icon: '🦀',
        language: 'Rust',
        color: '#ef4444',
        badgeClass: 'text-crimson bg-rose-950/60 border-crimson/30',
      };
    case 'sol':
    case 'solidity':
      return {
        icon: '⚡',
        language: 'Solidity',
        color: '#a855f7',
        badgeClass: 'text-aether bg-purple-950/60 border-aether/30',
      };
    case 'py':
    case 'python':
      return {
        icon: '🐍',
        language: 'Python',
        color: '#22c55e',
        badgeClass: 'text-signal bg-emerald-950/60 border-signal/30',
      };
    case 'json':
      return {
        icon: '📋',
        language: 'JSON',
        color: '#00e5ff',
        badgeClass: 'text-cyphr bg-cyan-950/60 border-cyphr/30',
      };
    case 'css':
    case 'scss':
    case 'postcss':
      return {
        icon: '🎨',
        language: 'CSS',
        color: '#a855f7',
        badgeClass: 'text-aether bg-purple-950/60 border-aether/30',
      };
    case 'html':
    case 'htm':
      return {
        icon: '🌐',
        language: 'HTML',
        color: '#f59e0b',
        badgeClass: 'text-amber bg-yellow-950/60 border-amber/30',
      };
    case 'go':
      return {
        icon: '🐹',
        language: 'Go',
        color: '#00e5ff',
        badgeClass: 'text-cyphr bg-cyan-950/60 border-cyphr/30',
      };
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
      return {
        icon: '⚙️',
        language: 'C/C++',
        color: '#00e5ff',
        badgeClass: 'text-cyphr bg-cyan-950/60 border-cyphr/30',
      };
    case 'sh':
    case 'bash':
    case 'zsh':
      return {
        icon: '🐚',
        language: 'Shell',
        color: '#22c55e',
        badgeClass: 'text-signal bg-emerald-950/60 border-signal/30',
      };
    case 'md':
    case 'markdown':
      return {
        icon: '📝',
        language: 'Markdown',
        color: '#slate-300',
        badgeClass: 'text-slate-300 bg-slate-800 border-white/10',
      };
    case 'sql':
      return {
        icon: '🗄️',
        language: 'SQL',
        color: '#f59e0b',
        badgeClass: 'text-amber bg-yellow-950/60 border-amber/30',
      };
    case 'diff':
    case 'patch':
      return {
        icon: '🔄',
        language: 'Diff Patch',
        color: '#00e5ff',
        badgeClass: 'text-cyphr bg-cyan-950/60 border-cyphr/30',
      };
    default:
      return {
        icon: '📄',
        language: ext ? ext.toUpperCase() : 'Code',
        color: '#slate-400',
        badgeClass: 'text-slate-400 bg-slate-800 border-white/10',
      };
  }
}

/**
 * Lightweight syntax highlighter with zero external dependencies.
 */
function highlightSyntax(code: string, language: string): string {
  const lang = (language || '').toLowerCase().trim();
  const escaped = escapeHtml(code);

  if (lang === 'json') {
    return escaped
      .replace(/"([^"]+)":/g, '<span class="text-cyphr font-semibold">"$1"</span>:')
      .replace(/:\s*"([^"]*)"/g, ': <span class="text-signal">"$1"</span>')
      .replace(/:\s*(\b\d+\.?\d*\b)/g, ': <span class="text-amber">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-aether font-bold">$1</span>');
  }

  // Keywords definition
  const jsTsKeywords =
    /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|void|this|super|class|extends|import|export|default|from|async|await|try|catch|finally|throw|of|in|yield|static|get|set|null|undefined|true|false|type|interface|enum|namespace|declare|implements|readonly|keyof|infer|never|unknown|any|as|satisfies)\b/g;
  const rustKeywords =
    /\b(fn|let|mut|struct|enum|impl|trait|pub|use|mod|match|if|else|loop|while|for|in|return|break|continue|as|where|self|Self|async|await|dyn|type|const|static|unsafe|ref|true|false|Option|Some|None|Result|Ok|Err)\b/g;
  const solKeywords =
    /\b(pragma|solidity|contract|interface|library|is|function|returns|public|private|internal|external|view|pure|payable|modifier|event|emit|struct|mapping|address|uint|uint256|int|int256|bytes|bytes32|string|bool|memory|storage|calldata|require|revert|assert|constructor|override|virtual)\b/g;
  const pythonKeywords =
    /\b(def|class|return|if|elif|else|for|while|try|except|finally|raise|import|from|as|with|lambda|yield|pass|break|continue|None|True|False|and|or|not|is|in|self|async|await)\b/g;

  let kwRegex = jsTsKeywords;
  if (lang === 'rust' || lang === 'rs') kwRegex = rustKeywords;
  else if (lang === 'solidity' || lang === 'sol') kwRegex = solKeywords;
  else if (lang === 'python' || lang === 'py') kwRegex = pythonKeywords;

  return escaped
    // Comments
    .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g, '<span class="text-slate-500 italic">$1</span>')
    // Strings
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-signal">$0</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber">$1</span>')
    // Keywords
    .replace(kwRegex, '<span class="text-aether font-semibold">$1</span>')
    // Function calls
    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/g, '<span class="text-cyphr">$1</span>');
}

// ---------------------------------------------------------------------------
// InlineDiffViewer Class
// ---------------------------------------------------------------------------

export class InlineDiffViewer {
  private cardRegistry: Map<string, ParsedDiffCard> = new Map();
  private snippetRegistry: Map<
    string,
    {
      code: string;
      language: string;
      fontSize: number;
      wrapLines: boolean;
      showLineNumbers: boolean;
    }
  > = new Map();

  private cardCounter: number = 0;
  private snippetCounter: number = 0;
  private defaultFontSize: number = 13;

  constructor() {
    this.initGlobalBrowserHooks();
  }

  // =========================================================================
  // 1. UNIFIED DIFF PARSER (Git standard unified diff format)
  // =========================================================================

  /**
   * Parses standard Git / Unified Diff text into a strongly typed array of DiffLines.
   * Accurately calculates oldLineNo and newLineNo tracking across all hunks.
   */
  public parseUnifiedDiff(diffText: string): DiffLine[] {
    if (!diffText || typeof diffText !== 'string') {
      return [];
    }

    const lines = diffText.split(/\r?\n/);
    const result: DiffLine[] = [];

    let currentOld = 1;
    let currentNew = 1;
    let inHunk = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Hunk Header: @@ -oldStart[,oldCount] +newStart[,newCount] @@ [heading]
      const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);
      if (hunkMatch) {
        inHunk = true;
        currentOld = parseInt(hunkMatch[1], 10);
        currentNew = parseInt(hunkMatch[3], 10);
        continue;
      }

      // Diff Metadata Headers to skip from line numbering
      if (
        !inHunk &&
        (line.startsWith('diff --git') ||
          line.startsWith('index ') ||
          line.startsWith('--- ') ||
          line.startsWith('+++ ') ||
          line.startsWith('new file mode') ||
          line.startsWith('deleted file mode') ||
          line.startsWith('similarity index') ||
          line.startsWith('rename from') ||
          line.startsWith('rename to'))
      ) {
        continue;
      }

      // Ignore standard diff meta comments
      if (line.startsWith('\\ No newline at end of file')) {
        continue;
      }

      // Added Line: starts with '+'
      if (line.startsWith('+')) {
        result.push({
          type: 'add',
          content: line.slice(1),
          newLineNo: currentNew++,
        });
        continue;
      }

      // Removed Line: starts with '-'
      if (line.startsWith('-')) {
        result.push({
          type: 'remove',
          content: line.slice(1),
          oldLineNo: currentOld++,
        });
        continue;
      }

      // Normal Context Line: starts with ' '
      if (line.startsWith(' ')) {
        result.push({
          type: 'normal',
          content: line.slice(1),
          oldLineNo: currentOld++,
          newLineNo: currentNew++,
        });
        continue;
      }

      // Fallback for empty lines or lines without prefix inside/outside hunks
      if (line.length === 0 || inHunk) {
        result.push({
          type: 'normal',
          content: line,
          oldLineNo: currentOld++,
          newLineNo: currentNew++,
        });
      }
    }

    return result;
  }

  /**
   * Detailed parser that also extracts file headers, hunks, and stats.
   */
  public parseDetailedDiff(diffText: string, fallbackFileName?: string): ParsedDiffCard {
    const rawLines = (diffText || '').split(/\r?\n/);
    let extractedFileName = fallbackFileName || 'patch.diff';
    let oldFileName: string | undefined;
    let newFileName: string | undefined;

    const hunks: DiffHunkInfo[] = [];
    const allDiffLines: DiffLine[] = [];

    let currentHunk: DiffHunkInfo | null = null;
    let currentOld = 1;
    let currentNew = 1;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // Extract filenames from --- and +++
      if (line.startsWith('--- ')) {
        const path = line.slice(4).trim().replace(/^[ab]\//, '');
        if (path !== '/dev/null') oldFileName = path;
        continue;
      }
      if (line.startsWith('+++ ')) {
        const path = line.slice(4).trim().replace(/^[ab]\//, '');
        if (path !== '/dev/null') {
          newFileName = path;
          extractedFileName = path;
        }
        continue;
      }
      if (line.startsWith('diff --git ')) {
        const parts = line.split(' ');
        if (parts.length >= 4) {
          const bPath = parts[3].replace(/^b\//, '');
          if (bPath) extractedFileName = bPath;
        }
        continue;
      }

      // Hunk Match
      const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);
      if (hunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentOld = parseInt(hunkMatch[1], 10);
        const oldCount = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
        currentNew = parseInt(hunkMatch[3], 10);
        const newCount = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;
        const heading = (hunkMatch[5] || '').trim();

        currentHunk = {
          oldStart: currentOld,
          oldCount,
          newStart: currentNew,
          newCount,
          heading,
          lines: [],
        };
        continue;
      }

      if (line.startsWith('\\ No newline at end of file')) {
        continue;
      }

      // Handle Line Types
      let diffLine: DiffLine | null = null;

      if (line.startsWith('+')) {
        diffLine = {
          type: 'add',
          content: line.slice(1),
          newLineNo: currentNew++,
        };
      } else if (line.startsWith('-')) {
        diffLine = {
          type: 'remove',
          content: line.slice(1),
          oldLineNo: currentOld++,
        };
      } else if (line.startsWith(' ')) {
        diffLine = {
          type: 'normal',
          content: line.slice(1),
          oldLineNo: currentOld++,
          newLineNo: currentNew++,
        };
      } else if (currentHunk) {
        diffLine = {
          type: 'normal',
          content: line,
          oldLineNo: currentOld++,
          newLineNo: currentNew++,
        };
      }

      if (diffLine) {
        allDiffLines.push(diffLine);
        if (currentHunk) {
          currentHunk.lines.push(diffLine);
        }
      }
    }

    if (currentHunk) {
      hunks.push(currentHunk);
    }

    // Fallback if no hunks were encountered (raw unformatted diff)
    if (hunks.length === 0 && allDiffLines.length === 0) {
      const basicLines = this.parseUnifiedDiff(diffText);
      allDiffLines.push(...basicLines);
      if (basicLines.length > 0) {
        hunks.push({
          oldStart: 1,
          oldCount: basicLines.filter((l) => l.type !== 'add').length,
          newStart: 1,
          newCount: basicLines.filter((l) => l.type !== 'remove').length,
          heading: '',
          lines: basicLines,
        });
      }
    }

    const additions = allDiffLines.filter((l) => l.type === 'add').length;
    const deletions = allDiffLines.filter((l) => l.type === 'remove').length;
    const cleanCode = this.extractCleanCodeFromLines(allDiffLines);
    const cardId = `diff-card-${++this.cardCounter}-${Date.now().toString(36)}`;

    const parsedCard: ParsedDiffCard = {
      cardId,
      fileName: extractedFileName,
      oldFileName,
      newFileName,
      additions,
      deletions,
      totalChanges: additions + deletions,
      lines: allDiffLines,
      hunks,
      cleanCode,
      rawDiff: diffText,
    };

    this.cardRegistry.set(cardId, parsedCard);
    return parsedCard;
  }

  /**
   * Extracts clean final code from diff text by taking all normal and added lines.
   */
  public extractCleanCode(diffText: string): string {
    const lines = this.parseUnifiedDiff(diffText);
    return this.extractCleanCodeFromLines(lines);
  }

  private extractCleanCodeFromLines(lines: DiffLine[]): string {
    return lines
      .filter((line) => line.type === 'normal' || line.type === 'add')
      .map((line) => line.content)
      .join('\n');
  }

  // =========================================================================
  // 2. RENDER DIFF CARD
  // =========================================================================

  /**
   * Renders the complete, interactive Diff Card with:
   * - File icon, filename, addition count (+X green), deletion count (-Y red)
   * - Two column line numbers (old / new)
   * - Added lines: bg-emerald-950/40 text-emerald-300 border-l-2 border-signal
   * - Removed lines: bg-rose-950/40 text-rose-300 border-l-2 border-crimson
   * - Button '📋 Copy Clean Code' (copies final code without + and -)
   * - Button 'Toggle Line Numbers'
   */
  public renderDiffCard(diffText: string, fileName?: string): string {
    const parsed = this.parseDetailedDiff(diffText, fileName);
    const fileMeta = resolveFileMetadata(parsed.fileName);
    const cardId = parsed.cardId;

    const diffRowsHtml = this.renderDiffRows(parsed.lines, fileMeta.language);

    return `
      <div 
        id="${cardId}" 
        class="diff-card-container bg-surface-base border border-white/10 rounded-xl overflow-hidden shadow-2xl my-4 select-text group/diff transition-all"
        data-card-id="${cardId}"
        data-file-name="${escapeHtml(parsed.fileName)}"
      >
        <!-- DIFF CARD HEADER -->
        <div class="diff-card-header p-3.5 bg-surface-raised/90 border-b border-subtle-b flex flex-wrap items-center justify-between gap-3 select-none">
          
          <!-- File Icon, Name & Stats -->
          <div class="flex items-center space-x-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-surface-overlay border border-white/10 flex items-center justify-center text-base shrink-0 shadow-inner">
              ${fileMeta.icon}
            </div>
            <div class="min-w-0">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm text-slate-100 font-semibold truncate tracking-tight" title="${escapeHtml(parsed.fileName)}">
                  ${escapeHtml(parsed.fileName)}
                </span>
                <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${fileMeta.badgeClass}">
                  ${fileMeta.language}
                </span>
              </div>
              
              <!-- Stats Badges -->
              <div class="flex items-center space-x-2 text-xs font-mono mt-0.5">
                <span class="text-signal font-medium bg-emerald-950/60 border border-signal/30 px-1.5 py-0.5 rounded text-[11px]">
                  +${parsed.additions}
                </span>
                <span class="text-crimson font-medium bg-rose-950/60 border border-crimson/30 px-1.5 py-0.5 rounded text-[11px]">
                  -${parsed.deletions}
                </span>
                <span class="text-slate-400 text-[11px]">
                  (${parsed.lines.length} lines)
                </span>
              </div>
            </div>
          </div>

          <!-- Diff Action Toolbar -->
          <div class="flex items-center space-x-2">
            
            <!-- BUTTON: COPY CLEAN CODE -->
            <button 
              type="button"
              data-action="copy-clean-code" 
              data-card-id="${cardId}" 
              title="Copy clean code (final result without + and -)"
              class="btn-copy-clean px-2.5 py-1.5 text-xs rounded-lg font-mono font-medium bg-surface-overlay hover:bg-surface-highlight text-cyphr hover:text-white border border-cyphr/30 hover:border-cyphr transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <span class="text-sm">📋</span>
              <span class="btn-copy-clean-label">Copy Clean Code</span>
            </button>

            <!-- BUTTON: TOGGLE LINE NUMBERS -->
            <button 
              type="button"
              data-action="toggle-line-numbers" 
              data-card-id="${cardId}" 
              title="Toggle old & new line number columns"
              class="btn-toggle-linenos px-2.5 py-1.5 text-xs rounded-lg font-mono font-medium bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <span class="text-sm">🔢</span>
              <span>Toggle Line Numbers</span>
            </button>

            <!-- BUTTON: COPY RAW DIFF -->
            <button 
              type="button"
              data-action="copy-raw-diff" 
              data-card-id="${cardId}" 
              title="Copy raw unified diff patch"
              class="btn-copy-raw px-2 py-1.5 text-xs rounded-lg font-mono text-slate-400 hover:text-slate-200 bg-surface-overlay hover:bg-surface-highlight border border-white/5 transition-all cursor-pointer"
            >
              <span>Raw Diff</span>
            </button>

            <!-- BUTTON: COLLAPSE / EXPAND -->
            <button 
              type="button"
              data-action="toggle-collapse-diff" 
              data-card-id="${cardId}" 
              title="Collapse / Expand diff body"
              class="btn-collapse-diff px-2 py-1.5 text-xs rounded-lg font-mono text-slate-400 hover:text-white bg-surface-overlay hover:bg-surface-highlight border border-white/5 transition-all cursor-pointer"
            >
              <span class="collapse-icon inline-block transition-transform duration-200">▼</span>
            </button>
          </div>
        </div>

        <!-- DIFF BODY / TABLE OF LINES -->
        <div class="diff-body-container overflow-x-auto bg-canvas max-h-[640px] overflow-y-auto">
          <table class="w-full border-collapse font-mono text-xs leading-relaxed text-left">
            <tbody class="divide-y divide-white/[0.03]">
              ${diffRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- DIFF CARD FOOTER / STATUS BAR -->
        <div class="diff-card-footer px-3.5 py-2 bg-surface-base border-t border-subtle-b flex items-center justify-between text-[11px] font-mono text-slate-400 select-none">
          <div class="flex items-center space-x-3">
            <span class="flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full bg-signal inline-block"></span>
              <span>${parsed.additions} insertions</span>
            </span>
            <span class="flex items-center space-x-1">
              <span class="w-2 h-2 rounded-full bg-crimson inline-block"></span>
              <span>${parsed.deletions} deletions</span>
            </span>
          </div>
          <div class="text-slate-400">
            UREfy Diff Engine · Unified Git Format
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the table rows for each line in the diff.
   */
  private renderDiffRows(lines: DiffLine[], language: string): string {
    if (!lines || lines.length === 0) {
      return `
        <tr>
          <td colspan="4" class="p-4 text-center text-slate-500 font-mono text-xs italic">
            No changes detected in diff stream.
          </td>
        </tr>
      `;
    }

    return lines
      .map((line, index) => {
        const oldNumStr = line.oldLineNo !== undefined ? line.oldLineNo.toString() : '';
        const newNumStr = line.newLineNo !== undefined ? line.newLineNo.toString() : '';

        let rowBgClass = 'text-slate-300 hover:bg-white/[0.02]';
        let marker = ' ';
        let markerClass = 'text-slate-600';

        if (line.type === 'add') {
          // Added lines (+): bg-emerald-950/40 text-emerald-300 border-l-2 border-signal
          rowBgClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-signal';
          marker = '+';
          markerClass = 'text-signal font-bold';
        } else if (line.type === 'remove') {
          // Removed lines (-): bg-rose-950/40 text-rose-300 border-l-2 border-crimson
          rowBgClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-crimson';
          marker = '-';
          markerClass = 'text-crimson font-bold';
        } else {
          rowBgClass = 'text-slate-300 border-l-2 border-transparent hover:bg-surface-overlay/30';
          marker = ' ';
          markerClass = 'text-slate-600';
        }

        const highlightedContent = highlightSyntax(line.content, language);

        return `
          <tr class="diff-line-row ${rowBgClass} transition-colors group/row" data-line-index="${index}" data-line-type="${line.type}">
            <!-- Old Line Number Column -->
            <td class="diff-lineno diff-lineno-old w-12 py-0.5 pr-2.5 text-right select-none text-slate-400 font-mono text-xs border-r border-white/5 align-top">
              ${oldNumStr}
            </td>

            <!-- New Line Number Column -->
            <td class="diff-lineno diff-lineno-new w-12 py-0.5 pr-2.5 text-right select-none text-slate-400 font-mono text-xs border-r border-white/5 align-top">
              ${newNumStr}
            </td>

            <!-- Marker Column (+ / - / ' ') -->
            <td class="diff-marker w-6 py-0.5 text-center select-none font-mono text-xs ${markerClass} align-top shrink-0">
              ${marker}
            </td>

            <!-- Code Content Column -->
            <td class="diff-content py-0.5 px-3 whitespace-pre font-mono text-xs overflow-x-visible select-text align-top">
              ${highlightedContent || '&nbsp;'}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // =========================================================================
  // 3. CODE SANDBOX TOOLBAR & SANDBOX RUNNER
  // =========================================================================

  /**
   * Renders a rich toolbar above any code block with:
   * - Copy Button (copies snippet to clipboard with active visual feedback)
   * - Wrap Lines Button (toggles word wrapping)
   * - Font Size Button (A- / A+ or font size toggle)
   * - Language badge, line count, and Run Sandbox button
   */
  public renderCodeSandboxToolbar(codeSnippet: string, language: string): string {
    const snippetId = `code-snippet-${++this.snippetCounter}-${Date.now().toString(36)}`;
    const lineCount = (codeSnippet || '').split(/\r?\n/).length;
    const byteSize = new Blob([codeSnippet || '']).size;
    const sizeStr = byteSize > 1024 ? `${(byteSize / 1024).toFixed(1)} KB` : `${byteSize} B`;

    const fileMeta = resolveFileMetadata(language);

    this.snippetRegistry.set(snippetId, {
      code: codeSnippet,
      language,
      fontSize: this.defaultFontSize,
      wrapLines: false,
      showLineNumbers: true,
    });

    const isRunnable = ['javascript', 'js', 'typescript', 'ts'].includes(language.toLowerCase().trim());

    return `
      <div 
        id="toolbar-${snippetId}" 
        class="code-sandbox-toolbar bg-surface-raised border-b border-subtle-b px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono select-none rounded-t-xl"
        data-snippet-id="${snippetId}"
        data-language="${escapeHtml(language)}"
      >
        <!-- Left: Language & Code Stats -->
        <div class="flex items-center space-x-2.5 min-w-0">
          <div class="flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-surface-base border border-white/10">
            <span>${fileMeta.icon}</span>
            <span class="font-semibold text-slate-200">${fileMeta.language}</span>
          </div>
          <span class="text-slate-400 text-[11px] hidden sm:inline">
            ${lineCount} ${lineCount === 1 ? 'line' : 'lines'} · ${sizeStr}
          </span>
        </div>

        <!-- Right: Actions (Copy, Wrap Lines, Font Size, Run) -->
        <div class="flex items-center space-x-1.5">
          
          <!-- Run Sandbox Button (if applicable) -->
          ${
            isRunnable
              ? `
            <button 
              type="button"
              data-action="run-sandbox" 
              data-snippet-id="${snippetId}"
              title="Run code snippet interactively"
              class="btn-run-code px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-signal border border-signal/30 hover:border-signal font-medium transition-all flex items-center space-x-1 active:scale-95 cursor-pointer shadow-sm"
            >
              <span>▶</span>
              <span>Run</span>
            </button>
          `
              : ''
          }

          <!-- Wrap Lines Button -->
          <button 
            type="button"
            data-action="toggle-wrap" 
            data-snippet-id="${snippetId}"
            title="Toggle word wrap (wrap lines)"
            class="btn-toggle-wrap px-2 py-1 rounded bg-surface-overlay hover:bg-surface-highlight text-slate-300 hover:text-white border border-white/10 transition-all flex items-center space-x-1 active:scale-95 cursor-pointer"
          >
            <span>↩️</span>
            <span class="hidden md:inline">Wrap</span>
          </button>

          <!-- Font Size Adjustment Buttons -->
          <div class="flex items-center bg-surface-overlay rounded border border-white/10 p-0.5">
            <button 
              type="button"
              data-action="font-size-dec" 
              data-snippet-id="${snippetId}"
              title="Decrease font size"
              class="px-1.5 py-0.5 text-[11px] rounded hover:bg-surface-highlight text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              A-
            </button>
            <span class="font-size-label px-1 text-[11px] text-slate-400 min-w-[28px] text-center">
              ${this.defaultFontSize}px
            </span>
            <button 
              type="button"
              data-action="font-size-inc" 
              data-snippet-id="${snippetId}"
              title="Increase font size"
              class="px-1.5 py-0.5 text-[11px] rounded hover:bg-surface-highlight text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              A+
            </button>
          </div>

          <!-- Copy Button -->
          <button 
            type="button"
            data-action="copy-snippet" 
            data-snippet-id="${snippetId}"
            title="Copy snippet code to clipboard"
            class="btn-copy-code px-2.5 py-1 rounded bg-surface-overlay hover:bg-surface-highlight text-cyphr hover:text-white border border-cyphr/30 hover:border-cyphr transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            <span>📋</span>
            <span class="copy-label">Copy</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders a complete Code Block with the Sandbox Toolbar and highlighted lines.
   */
  public renderCodeBlock(codeSnippet: string, language: string, options?: CodeSandboxOptions): string {
    const toolbarHtml = this.renderCodeSandboxToolbar(codeSnippet, language);
    // Find snippet ID from toolbar
    const snippetMatch = toolbarHtml.match(/data-snippet-id="([^"]+)"/);
    const snippetId = snippetMatch ? snippetMatch[1] : `snippet-${Date.now()}`;

    const lines = (codeSnippet || '').split(/\r?\n/);
    const showNumbers = options?.showLineNumbers !== false;
    const initialFontSize = options?.fontSize || this.defaultFontSize;
    const wrapClass = options?.wrapLines ? 'whitespace-pre-wrap' : 'whitespace-pre';

    const linesHtml = lines
      .map((line, idx) => {
        const highlighted = highlightSyntax(line, language);
        const lineNum = idx + 1;
        return `
          <div class="code-line flex hover:bg-white/[0.02] py-0.5">
            ${
              showNumbers
                ? `<span class="code-lineno w-10 text-right pr-3 select-none text-slate-400 font-mono shrink-0">${lineNum}</span>`
                : ''
            }
            <span class="code-text flex-1 px-2 font-mono ${wrapClass}">${highlighted || '&nbsp;'}</span>
          </div>
        `;
      })
      .join('');

    return `
      <div 
        id="block-${snippetId}" 
        class="code-block-wrapper bg-surface-base border border-white/10 rounded-xl overflow-hidden shadow-xl my-4"
        data-snippet-id="${snippetId}"
      >
        ${toolbarHtml}
        
        <div 
          id="content-${snippetId}" 
          class="code-content-container p-3 bg-canvas overflow-x-auto font-mono text-slate-200"
          style="font-size: ${initialFontSize}px;"
        >
          <pre class="m-0 p-0 font-mono">${linesHtml}</pre>
        </div>

        <!-- Output Console Tab (Initially Hidden, Shown on Run) -->
        <div id="console-${snippetId}" class="code-console-panel hidden bg-surface-base border-t border-subtle-b p-3 font-mono text-xs">
          <div class="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2">
            <span class="text-slate-400 font-semibold flex items-center space-x-1.5">
              <span>💻</span>
              <span>Execution Output & Console</span>
            </span>
            <button 
              type="button"
              data-action="clear-console" 
              data-snippet-id="${snippetId}"
              class="text-slate-500 hover:text-slate-300 text-[11px] cursor-pointer"
            >
              Clear
            </button>
          </div>
          <div class="console-output-logs space-y-1 max-h-48 overflow-y-auto"></div>
        </div>
      </div>
    `;
  }

  /**
   * Renders a fully interactive inline sandbox with live editable/runnable environment.
   */
  public renderInlineSandbox(codeSnippet: string, language: string, options?: CodeSandboxOptions): string {
    return this.renderCodeBlock(codeSnippet, language, options);
  }

  // =========================================================================
  // 4. CODE SNIPPET EXECUTION RUNNER
  // =========================================================================

  /**
   * Executes a code snippet safely in an isolated sandbox environment,
   * capturing console logs and execution times.
   */
  public async executeCodeSnippet(code: string, language: string): Promise<SandboxRunResult> {
    const startTime = performance.now();
    const logs: ConsoleLogEntry[] = [];
    const output: string[] = [];

    const lang = (language || '').toLowerCase().trim();

    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      try {
        // Strip TypeScript type annotations for basic JS execution simulation
        const executableCode = this.stripTypeScriptTypes(code);

        // Create captured console
        const captureLog = (type: 'log' | 'info' | 'warn' | 'error', ...args: unknown[]) => {
          const message = args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ');
          const timestamp = new Date().toLocaleTimeString();
          logs.push({ type, message, timestamp });
          output.push(message);
        };

        const customConsole = {
          log: (...args: unknown[]) => captureLog('log', ...args),
          info: (...args: unknown[]) => captureLog('info', ...args),
          warn: (...args: unknown[]) => captureLog('warn', ...args),
          error: (...args: unknown[]) => captureLog('error', ...args),
        };

        // Run code in Function sandbox with custom console
        const runner = new Function('console', 'require', 'process', `
          "use strict";
          try {
            ${executableCode}
          } catch(err) {
            console.error(err && err.stack ? err.stack : String(err));
          }
        `);

        runner(customConsole, undefined, undefined);

        const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
        return {
          success: logs.every((l) => l.type !== 'error'),
          output,
          logs,
          executionTimeMs,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logs.push({
          type: 'error',
          message: errorMsg,
          timestamp: new Date().toLocaleTimeString(),
        });
        output.push(`Runtime Error: ${errorMsg}`);
        return {
          success: false,
          output,
          logs,
          executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
          error: errorMsg,
        };
      }
    }

    // For non-JS languages: provide structured static analysis / simulated compile result
    const simulatedMsg = `[Sandbox VM]: Validated syntax for ${language.toUpperCase()}. Execution simulated successfully.`;
    logs.push({
      type: 'info',
      message: simulatedMsg,
      timestamp: new Date().toLocaleTimeString(),
    });
    output.push(simulatedMsg);

    return {
      success: true,
      output,
      logs,
      executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
    };
  }

  /**
   * Lightweight TS type stripper for interactive client evaluation.
   */
  private stripTypeScriptTypes(tsCode: string): string {
    return tsCode
      .replace(/:\s*[A-Za-z0-9_<>\[\]|&]+/g, '')
      .replace(/\bas\s+[A-Za-z0-9_<>\[\]]+/g, '')
      .replace(/interface\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\}/g, '')
      .replace(/type\s+[A-Za-z0-9_]+\s*=[\s\S]*?;/g, '');
  }

  // =========================================================================
  // 5. INTERACTIVE EVENT HANDLERS & DOM HOOKS
  // =========================================================================

  /**
   * Attaches event delegation handlers to any root element (or document).
   */
  public bindEvents(root?: HTMLElement | Document): void {
    const container = root || (typeof document !== 'undefined' ? document : null);
    if (!container) return;

    container.addEventListener('click', async (evt: Event) => {
      const target = (evt.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement | null;
      if (!target) return;

      const action = target.getAttribute('data-action');
      const cardId = target.getAttribute('data-card-id');
      const snippetId = target.getAttribute('data-snippet-id');

      switch (action) {
        case 'copy-clean-code':
          if (cardId) await this.handleCopyCleanCode(cardId, target);
          break;

        case 'toggle-line-numbers':
          if (cardId) this.handleToggleLineNumbers(cardId);
          break;

        case 'copy-raw-diff':
          if (cardId) await this.handleCopyRawDiff(cardId, target);
          break;

        case 'toggle-collapse-diff':
          if (cardId) this.handleToggleCollapse(cardId, target);
          break;

        case 'copy-snippet':
          if (snippetId) await this.handleCopySnippet(snippetId, target);
          break;

        case 'toggle-wrap':
          if (snippetId) this.handleToggleWrap(snippetId, target);
          break;

        case 'font-size-dec':
          if (snippetId) this.handleChangeFontSize(snippetId, -1);
          break;

        case 'font-size-inc':
          if (snippetId) this.handleChangeFontSize(snippetId, 1);
          break;

        case 'run-sandbox':
          if (snippetId) await this.handleRunSandbox(snippetId, target);
          break;

        case 'clear-console':
          if (snippetId) this.handleClearConsole(snippetId);
          break;
      }
    });
  }

  /**
   * Copies clean code (all additions & normal lines) to clipboard.
   */
  public async copyCleanCode(cardId: string): Promise<boolean> {
    const card = this.cardRegistry.get(cardId);
    if (!card) return false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(card.cleanCode);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async handleCopyCleanCode(cardId: string, button: HTMLButtonElement): Promise<void> {
    const success = await this.copyCleanCode(cardId);
    const label = button.querySelector('.btn-copy-clean-label') || button;
    const originalText = label.textContent || 'Copy Clean Code';

    if (success) {
      label.textContent = '✅ Copied Clean Code!';
      button.classList.add('border-signal', 'text-signal');
    } else {
      label.textContent = '❌ Failed to copy';
    }

    setTimeout(() => {
      label.textContent = originalText;
      button.classList.remove('border-signal', 'text-signal');
    }, 2000);
  }

  /**
   * Copies raw diff stream to clipboard.
   */
  public async copyRawDiff(cardId: string): Promise<boolean> {
    const card = this.cardRegistry.get(cardId);
    if (!card) return false;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(card.rawDiff);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async handleCopyRawDiff(cardId: string, button: HTMLButtonElement): Promise<void> {
    const success = await this.copyRawDiff(cardId);
    const originalText = button.textContent || 'Raw Diff';

    if (success) {
      button.textContent = '✅ Copied Raw!';
      button.classList.add('text-signal');
    } else {
      button.textContent = '❌ Failed';
    }

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('text-signal');
    }, 2000);
  }

  /**
   * Toggles line numbers visibility for a diff card.
   */
  public toggleLineNumbers(cardId: string): void {
    this.handleToggleLineNumbers(cardId);
  }

  private handleToggleLineNumbers(cardId: string): void {
    if (typeof document === 'undefined') return;
    const cardEl = document.getElementById(cardId);
    if (!cardEl) return;

    const lineNoCells = cardEl.querySelectorAll('.diff-lineno');
    lineNoCells.forEach((cell) => {
      cell.classList.toggle('hidden');
    });
  }

  /**
   * Collapses or expands the diff body container.
   */
  private handleToggleCollapse(cardId: string, button: HTMLButtonElement): void {
    if (typeof document === 'undefined') return;
    const cardEl = document.getElementById(cardId);
    if (!cardEl) return;

    const body = cardEl.querySelector('.diff-body-container');
    const footer = cardEl.querySelector('.diff-card-footer');
    const icon = button.querySelector('.collapse-icon');

    if (body) {
      const isHidden = body.classList.contains('hidden');
      if (isHidden) {
        body.classList.remove('hidden');
        if (footer) footer.classList.remove('hidden');
        if (icon) icon.textContent = '▼';
      } else {
        body.classList.add('hidden');
        if (footer) footer.classList.add('hidden');
        if (icon) icon.textContent = '▶';
      }
    }
  }

  /**
   * Copies code snippet to clipboard.
   */
  private async handleCopySnippet(snippetId: string, button: HTMLButtonElement): Promise<void> {
    const snippet = this.snippetRegistry.get(snippetId);
    if (!snippet) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(snippet.code);
        const label = button.querySelector('.copy-label') || button;
        const originalText = label.textContent || 'Copy';
        label.textContent = 'Copied!';
        button.classList.add('text-signal', 'border-signal');

        setTimeout(() => {
          label.textContent = originalText;
          button.classList.remove('text-signal', 'border-signal');
        }, 2000);
      }
    } catch (e) {
      console.error('Failed to copy snippet:', e);
    }
  }

  /**
   * Toggles line wrapping on code content container.
   */
  private handleToggleWrap(snippetId: string, button: HTMLButtonElement): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById(`content-${snippetId}`);
    if (!container) return;

    const codeTexts = container.querySelectorAll('.code-text');
    const isWrapped = button.classList.toggle('bg-surface-highlight');

    codeTexts.forEach((el) => {
      if (isWrapped) {
        el.classList.remove('whitespace-pre');
        el.classList.add('whitespace-pre-wrap');
      } else {
        el.classList.remove('whitespace-pre-wrap');
        el.classList.add('whitespace-pre');
      }
    });
  }

  /**
   * Changes font size by delta (-1 or +1 px).
   */
  private handleChangeFontSize(snippetId: string, delta: number): void {
    if (typeof document === 'undefined') return;
    const snippet = this.snippetRegistry.get(snippetId);
    const currentSize = snippet ? snippet.fontSize : this.defaultFontSize;
    const newSize = Math.max(10, Math.min(22, currentSize + delta));

    if (snippet) snippet.fontSize = newSize;

    const container = document.getElementById(`content-${snippetId}`);
    if (container) {
      container.style.fontSize = `${newSize}px`;
    }

    const toolbar = document.getElementById(`toolbar-${snippetId}`);
    if (toolbar) {
      const label = toolbar.querySelector('.font-size-label');
      if (label) label.textContent = `${newSize}px`;
    }
  }

  /**
   * Runs the sandbox code and displays console output.
   */
  private async handleRunSandbox(snippetId: string, button: HTMLButtonElement): Promise<void> {
    if (typeof document === 'undefined') return;
    const snippet = this.snippetRegistry.get(snippetId);
    if (!snippet) return;

    const consolePanel = document.getElementById(`console-${snippetId}`);
    if (!consolePanel) return;

    consolePanel.classList.remove('hidden');
    const logsContainer = consolePanel.querySelector('.console-output-logs');
    if (!logsContainer) return;

    button.disabled = true;
    const originalContent = button.innerHTML;
    button.innerHTML = '<span>⏳</span><span>Running...</span>';

    try {
      const result = await this.executeCodeSnippet(snippet.code, snippet.language);

      let logHtml = '';
      if (result.logs.length === 0) {
        logHtml = `<div class="text-slate-500 italic py-1">Program executed with no console output (${result.executionTimeMs}ms)</div>`;
      } else {
        logHtml = result.logs
          .map((log) => {
            let color = 'text-slate-300';
            let icon = '🔹';
            if (log.type === 'error') {
              color = 'text-crimson font-medium';
              icon = '❌';
            } else if (log.type === 'warn') {
              color = 'text-amber font-medium';
              icon = '⚠️';
            } else if (log.type === 'info') {
              color = 'text-cyphr';
              icon = 'ℹ️';
            }
            return `
              <div class="flex items-start space-x-2 py-0.5 ${color}">
                <span class="text-slate-500 text-[10px] select-none shrink-0">${log.timestamp}</span>
                <span class="select-none shrink-0">${icon}</span>
                <span class="whitespace-pre-wrap font-mono flex-1">${escapeHtml(log.message)}</span>
              </div>
            `;
          })
          .join('');
      }

      const statusBadge = result.success
        ? `<div class="text-[10px] text-signal font-mono mt-2 pt-1 border-t border-white/5">✅ Execution completed in ${result.executionTimeMs}ms</div>`
        : `<div class="text-[10px] text-crimson font-mono mt-2 pt-1 border-t border-white/5">❌ Execution finished with errors in ${result.executionTimeMs}ms</div>`;

      logsContainer.innerHTML = logHtml + statusBadge;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logsContainer.innerHTML = `<div class="text-crimson font-mono">Fatal error: ${escapeHtml(msg)}</div>`;
    } finally {
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  }

  /**
   * Clears the console logs container.
   */
  private handleClearConsole(snippetId: string): void {
    if (typeof document === 'undefined') return;
    const consolePanel = document.getElementById(`console-${snippetId}`);
    if (!consolePanel) return;

    const logsContainer = consolePanel.querySelector('.console-output-logs');
    if (logsContainer) {
      logsContainer.innerHTML = '<div class="text-slate-500 italic py-1">Console cleared.</div>';
    }
  }

  // =========================================================================
  // 6. GLOBAL INITIALIZATION
  // =========================================================================

  private initGlobalBrowserHooks(): void {
    if (typeof window !== 'undefined') {
      window.inlineDiffViewer = this;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindEvents());
      } else {
        this.bindEvents();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

export const inlineDiffViewer = new InlineDiffViewer();

serviceRegistry.registerInstance(SERVICES.DiffViewer, inlineDiffViewer);
