// ===========================================================================
// UREfy — SOVEREIGN SYNTAX HIGHLIGHTER & CODE CARDS ENGINE 2027
// 100% XSS-Safe, Zero Dependencies, Accessible & Modular
// ===========================================================================

import { escapeHtml } from './sanitize.js';

const LANGUAGE_LABELS: Record<string, string> = {
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TypeScript JSX',
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JavaScript JSX',
  rs: 'Rust',
  rust: 'Rust',
  py: 'Python',
  python: 'Python',
  sql: 'SQL (Cloudflare D1)',
  json: 'JSON',
  sh: 'Shell / Bash',
  bash: 'Bash',
  css: 'CSS3',
  html: 'HTML5',
  go: 'Go',
  sol: 'Solidity',
};

/**
 * Evidențiază sintaxa pe text deja escapat HTML (100% XSS-safe)
 */
export function highlightSyntaxSafe(rawCode: string, _lang = 'code'): string {
  const escaped = escapeHtml(rawCode);
  const tokens: string[] = [];

  const stash = (html: string): string => {
    const id = `@@TOK_${tokens.length}@@`;
    tokens.push(html);
    return id;
  };

  // 1. Comentarii (//... sau /*...*/ sau #... în Python/Bash/SQL sau --... în SQL)
  let work = escaped.replace(
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|(?:\s|^)#[^\n]*|--[^\n]*)/g,
    (m) => stash(`<span class="sh-comment">${m}</span>`)
  );

  // 2. String-uri (&quot;...&quot;, &#039;...&#039;, `...`)
  work = work.replace(
    /(&quot;(?:\\.|[^&])*?&quot;|&#039;(?:\\.|[^&])*?&#039;|`(?:\\.|[^`])*?`)/g,
    (m) => stash(`<span class="sh-string">${m}</span>`)
  );

  // 3. Cuvinte cheie (TS/JS/Rust/Python/SQL)
  work = work.replace(
    /\b(const|let|var|function|async|await|return|if|else|for|while|switch|case|break|continue|import|export|from|default|class|interface|type|extends|implements|new|try|catch|finally|throw|pub|fn|mut|impl|struct|enum|match|use|crate|def|elif|lambda|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|JOIN|LEFT|INNER|ORDER|BY|LIMIT|GROUP|PRIMARY|KEY|NOT|NULL)\b/g,
    '<span class="sh-keyword">$1</span>'
  );

  // 4. Tipuri & primitive
  work = work.replace(
    /\b(string|number|boolean|void|any|unknown|never|Promise|Record|Array|Map|Set|Uint8Array|Response|Request|true|false|null|undefined|Self|Option|Result|Ok|Err|u8|u16|u32|u64|usize|i32|i64|TEXT|INTEGER|REAL|BLOB)\b/g,
    '<span class="sh-type">$1</span>'
  );

  // 5. Numere & literali hexazecimali
  work = work.replace(
    /\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b/g,
    '<span class="sh-number">$1</span>'
  );

  // 6. Apeluri de funcții
  work = work.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g,
    '<span class="sh-fn">$1</span>'
  );

  // Restaurare tokeni protejați
  tokens.forEach((html, idx) => {
    work = work.replace(`@@TOK_${idx}@@`, html);
  });

  return work;
}

/**
 * Randează un card complet de cod 2027 cu numere de linie, badge de limbaj și buton Copy
 */
export function renderSovereignCodeBlock(code: string, rawLang = 'code'): string {
  const cleanCode = code.replace(/^\n+|\n+$/g, '');
  const langKey = (rawLang || 'code').trim().toLowerCase();
  const langLabel = LANGUAGE_LABELS[langKey] || (langKey ? langKey.toUpperCase() : 'CODE');
  const lines = cleanCode.split('\n');
  const isCollapsible = lines.length > 18;

  const highlightedLines = highlightSyntaxSafe(cleanCode, langKey)
    .split('\n')
    .map(
      (lineHtml, i) => `
      <div class="sh-line">
        <span class="sh-line-num">${i + 1}</span>
        <span class="sh-line-code">${lineHtml || ' '}</span>
      </div>`
    )
    .join('');

  return `
    <div class="sh-card ${isCollapsible ? 'is-collapsible is-collapsed' : ''}" data-lines="${lines.length}">
      <div class="sh-card-header">
        <div class="sh-card-left">
          <span class="sh-traffic-dots"><i></i><i></i><i></i></span>
          <span class="sh-lang-badge">${escapeHtml(langLabel)}</span>
          <span class="sh-lines-meta">${lines.length} linii</span>
        </div>
        <div class="sh-card-actions">
          ${
            isCollapsible
              ? `<button type="button" class="sh-expand-btn" data-action="toggle-expand">Extinde (${lines.length} linii)</button>`
              : ''
          }
          <button type="button" class="sh-copy-btn" data-raw-code="${encodeURIComponent(cleanCode)}">
            📋 Copiază codul
          </button>
        </div>
      </div>
      <div class="sh-code-viewport">
        <pre class="sh-pre"><code>${highlightedLines}</code></pre>
      </div>
    </div>
  `;
}

/**
 * Formatează textul unei postări sau al unui mesaj transformând \`\`\`lang ... \`\`\` în carduri interactive
 */
export function formatContentWithCodeCards(rawContent: string): string {
  const cards: string[] = [];
  const placeholderText = (rawContent || '').replace(
    /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g,
    (_match, lang, code) => {
      const idx = cards.length;
      cards.push(renderSovereignCodeBlock(code, lang));
      return `@@SOVEREIGN_CODE_CARD_${idx}@@`;
    }
  );

  let safe = escapeHtml(placeholderText);
  safe = safe.replace(/`([^`\n]+)`/g, '<code class="sh-inline-code">$1</code>');
  safe = safe.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

  cards.forEach((cardHtml, idx) => {
    safe = safe.replace(`@@SOVEREIGN_CODE_CARD_${idx}@@`, cardHtml);
  });

  return safe;
}

/**
 * Delegare globală de evenimente pentru butoanele Copy și Expand de pe orice Code Card din aplicație
 */
let interactionsInitialized = false;

export function initGlobalCodeCardInteractions(): void {
  if (typeof document === 'undefined' || interactionsInitialized) return;
  interactionsInitialized = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const copyBtn = target.closest<HTMLButtonElement>('.sh-copy-btn');
    if (copyBtn) {
      const encoded = copyBtn.getAttribute('data-raw-code') || '';
      const decoded = decodeURIComponent(encoded);
      navigator.clipboard?.writeText(decoded).catch(() => {});
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Copiat în Clipboard!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.innerHTML = original;
        copyBtn.classList.remove('copied');
      }, 1600);
      return;
    }

    const expandBtn = target.closest<HTMLButtonElement>('.sh-expand-btn');
    if (expandBtn) {
      const card = expandBtn.closest<HTMLElement>('.sh-card');
      if (!card) return;
      const collapsed = card.classList.toggle('is-collapsed');
      const total = card.getAttribute('data-lines') || '';
      expandBtn.textContent = collapsed ? `Extinde (${total} linii)` : 'Restrânge codul';
    }
  });
}
