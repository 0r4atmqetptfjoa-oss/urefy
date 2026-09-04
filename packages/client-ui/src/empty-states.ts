/**
 * @file empty-states.ts
 * @package @aetheris/client-ui
 * @description Visual empty states for core platform workspaces:
 * - Pulse Stream (No posts / messages)
 * - Knowledge Vault (No files uploaded)
 * - Vault Releases (No audited releases)
 * - Live Relays (No relays connected or empty channels)
 * Each state provides a clear, friendly message and an actionable primary button.
 */

export interface EmptyStateOptions {
  title?: string;
  description?: string;
  actionText?: string;
  actionId?: string;
  onAction?: string;
  icon?: string;
}

/**
 * 1. Empty state for Pulse Stream when no posts are available
 */
export function renderPulseEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || 'Fluxul de publicații este liniștit';
  const desc = options?.description || 'Nu există nicio publicație disponibilă în acest canal. Fii primul care împărtășește o idee, o știre sau un articol în rețeaua suverană.';
  const actionText = options?.actionText || '✍️ Scrie prima publicație';
  const actionId = options?.actionId || 'btn-empty-pulse-composer';
  const icon = options?.icon || '⚡';

  return `
    <div id="empty-state-pulse" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-3xl text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)] mb-4">
        ${icon}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <button
        type="button"
        id="${actionId}"
        onclick="if(window.__aetheris_open_composer){window.__aetheris_open_composer();}else{const btn=document.getElementById('btn-open-composer');if(btn)btn.click();}"
        class="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
        data-empty-action="pulse"
      >
        <span>${actionText}</span>
      </button>
    </div>
  `;
}

/**
 * 2. Empty state for Knowledge Vault when no files are uploaded
 */
export function renderVaultFilesEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || 'Seiful de fișiere este gol';
  const desc = options?.description || 'Nu ai salvat încă niciun fișier criptat în seiful local sau în rețeaua peer-to-peer. Fișierele tale sunt stocate doar pe dispozitivele tale.';
  const actionText = options?.actionText || '📦 Încarcă primul fișier în Seif';
  const actionId = options?.actionId || 'btn-empty-vault-upload';
  const icon = options?.icon || '🗄️';

  return `
    <div id="empty-state-vault-files" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-3xl text-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.15)] mb-4">
        ${icon}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <button
        type="button"
        id="${actionId}"
        onclick="if(window.__aetheris_open_composer){window.__aetheris_open_composer();}else{const btn=document.getElementById('btn-open-composer');if(btn)btn.click();}"
        class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
        data-empty-action="vault-files"
      >
        <span>${actionText}</span>
      </button>
    </div>
  `;
}

/**
 * 3. Empty state for Vault Releases when no audited releases match
 */
export function renderVaultReleasesEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || 'Fără release-uri auditate în această categorie';
  const desc = options?.description || 'Toate versiunile au fost verificate sau filtrul curent nu a găsit pachete. Poți publica un release verificabil cu semnătură criptografică.';
  const actionText = options?.actionText || '✨ Publică un nou Release auditat';
  const actionId = options?.actionId || 'btn-empty-vault-release';
  const icon = options?.icon || '🚀';

  return `
    <div id="empty-state-vault-releases" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-3xl text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)] mb-4">
        ${icon}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <button
        type="button"
        id="${actionId}"
        onclick="if(window.__aetheris_open_composer){window.__aetheris_open_composer();}else{const btn=document.getElementById('btn-open-composer');if(btn)btn.click();}"
        class="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
        data-empty-action="vault-releases"
      >
        <span>${actionText}</span>
      </button>
    </div>
  `;
}

/**
 * 4. Empty state for Live Relays when no relays are connected or channel has no messages
 */
export function renderRelaysEmptyState(options?: EmptyStateOptions): string {
  const title = options?.title || 'Fără servere conectate sau mesaje';
  const desc = options?.description || 'Nu ești conectat la niciun server live sau acest canal nu conține încă mesaje. Conectează un server sau trimite primul mesaj criptat E2EE.';
  const actionText = options?.actionText || '💬 Trimite primul mesaj în canal';
  const actionId = options?.actionId || 'btn-empty-relays-chat';
  const icon = options?.icon || '📡';

  return `
    <div id="empty-state-relays" class="empty-state-card flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 rounded-2xl border border-dashed border-white/10 bg-surface-base/60 backdrop-blur-none max-w-lg mx-auto select-none animate-in fade-in duration-300">
      <div class="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-3xl text-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.15)] mb-4">
        ${icon}
      </div>
      <h3 class="text-base font-bold text-white mb-2 tracking-wide font-sans">
        ${title}
      </h3>
      <p class="text-xs text-slate-300 leading-relaxed max-w-sm mb-6 font-sans">
        ${desc}
      </p>
      <div class="flex items-center space-x-3 flex-wrap justify-center gap-y-2">
        <button
          type="button"
          id="${actionId}"
          onclick="const inp=document.getElementById('input-message');if(inp){inp.focus();}else{const form=document.getElementById('form-send-message');if(form)form.scrollIntoView();}"
          class="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer flex items-center space-x-2"
          data-empty-action="relays-message"
        >
          <span>${actionText}</span>
        </button>
        <button
          type="button"
          id="btn-empty-add-relay"
          onclick="if(window.__aetheris_open_relay_invite){window.__aetheris_open_relay_invite();}else{const btn=document.getElementById('btn-add-relay-server');if(btn)btn.click();}"
          class="px-4 py-2.5 rounded-xl bg-surface-raised hover:bg-surface-overlay text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer"
          data-empty-action="add-relay"
        >
          <span>🔗 Conectează Server</span>
        </button>
      </div>
    </div>
  `;
}
