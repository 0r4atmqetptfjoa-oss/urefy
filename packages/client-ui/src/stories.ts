import { serviceRegistry, SERVICES } from './service-registry.js';

export interface StoryItem {
  id: string;
  authorFingerprint: string;
  authorRole: string;
  content: string;
  mediaType: 'text' | 'image' | 'code';
  expiresAt: number;
  viewedBy: Set<string>;
  gradient: string;
}

const STORY_GRADIENTS: string[] = [
  'from-cyan-500/20 via-blue-600/20 to-purple-600/20',
  'from-purple-600/20 via-pink-600/20 to-red-500/20',
  'from-emerald-500/20 via-teal-600/20 to-cyan-600/20',
  'from-amber-500/20 via-orange-600/20 to-rose-600/20',
  'from-indigo-600/20 via-purple-600/20 to-cyan-500/20',
];

export class StoriesEngine {
  public stories: StoryItem[] = [];
  public activeStoryId: string | null = null;
  public isCreatorOpen: boolean = false;
  public creatorMediaType: 'text' | 'image' | 'code' = 'text';
  public creatorGradientIndex: number = 0;

  constructor() {
    this.seedStories();
  }

  public openCreator(): void {
    this.isCreatorOpen = true;
  }

  public closeCreator(): void {
    this.isCreatorOpen = false;
  }

  private seedStories(): void {
    const now = Date.now();
    this.stories = [
      {
        id: 'story-kernel-1',
        authorFingerprint: 'genesis-core',
        authorRole: 'GUARDIAN',
        content: 'Just deployed the new Zero-Copy PipeWire streaming engine & eBPF network filter! 🚀 Latency reduced to 0.4ms across all sovereign mesh relays.',
        mediaType: 'text',
        expiresAt: now + 24 * 3600 * 1000,
        viewedBy: new Set(['genesis-core']),
        gradient: STORY_GRADIENTS[0]
      },
      {
        id: 'story-reversing-2',
        authorFingerprint: 'c3dc28cb705e',
        authorRole: 'ARCHIVIST',
        content: '0x00401000: 55                push ebp\n0x00401001: 89 E5             mov ebp, esp\n0x00401003: 83 EC 20          sub esp, 0x20\n0x00401006: E8 1A 00 00 00    call ZK_RATCHET_INIT\n0x0040100B: 85 C0             test eax, eax\n0x0040100D: 74 0E             jz 0x0040101D\n; Shannon Entropy: 7.99 bits/byte\n; Anti-tamper binary hygiene verified',
        mediaType: 'code',
        expiresAt: now + 18 * 3600 * 1000,
        viewedBy: new Set(),
        gradient: STORY_GRADIENTS[4]
      },
      {
        id: 'story-vault-3',
        authorFingerprint: 'a89104fa2211',
        authorRole: 'MODERATOR',
        content: 'Completed 5TB Cold-Storage indexing in Vault Merkle Swarm. SHA-256 Merkle roots distributed across 128 WebRTC seeders with zero packet loss.',
        mediaType: 'image',
        expiresAt: now + 12 * 3600 * 1000,
        viewedBy: new Set(),
        gradient: STORY_GRADIENTS[2]
      },
      {
        id: 'story-zk-4',
        authorFingerprint: 'f40019bc88a2',
        authorRole: 'OPERATOR',
        content: 'Generated recursive Groth16 zk-SNARK proof for anonymous membership in 38ms on Apple Silicon & AVX-512. Zero identity leakage on-chain! ⚡🛡️',
        mediaType: 'text',
        expiresAt: now + 20 * 3600 * 1000,
        viewedBy: new Set(),
        gradient: STORY_GRADIENTS[1]
      }
    ];
  }

  public addStory(
    content: string,
    mediaType: 'text' | 'image' | 'code' = 'text',
    authorFP: string = 'genesis-node',
    authorRole: string = 'NODE'
  ): StoryItem {
    const id = `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const randomGradient = STORY_GRADIENTS[Math.floor(Math.random() * STORY_GRADIENTS.length)];
    const newStory: StoryItem = {
      id,
      authorFingerprint: authorFP,
      authorRole,
      content,
      mediaType,
      expiresAt: Date.now() + 24 * 3600 * 1000,
      viewedBy: new Set([authorFP]),
      gradient: randomGradient
    };

    this.stories.unshift(newStory);
    return newStory;
  }

  public getActiveStories(): StoryItem[] {
    const now = Date.now();
    return this.stories.filter(s => s.expiresAt > now);
  }

  public getStoryById(storyId: string): StoryItem | undefined {
    return this.stories.find(s => s.id === storyId);
  }

  public markViewed(storyId: string, viewerFP: string): void {
    const story = this.stories.find(s => s.id === storyId);
    if (story && viewerFP) {
      story.viewedBy.add(viewerFP);
    }
  }

  public isViewed(storyId: string, viewerFP: string): boolean {
    const story = this.stories.find(s => s.id === storyId);
    return story ? story.viewedBy.has(viewerFP) : false;
  }

  public openStory(storyId: string): void {
    const story = this.stories.find(s => s.id === storyId);
    if (story) {
      this.activeStoryId = storyId;
    }
  }

  public closeStory(): void {
    this.activeStoryId = null;
  }

  public getPreviousStoryId(currentId: string): string | null {
    const active = this.getActiveStories();
    const index = active.findIndex(s => s.id === currentId);
    if (index > 0) {
      return active[index - 1].id;
    }
    return null;
  }

  public getNextStoryId(currentId: string): string | null {
    const active = this.getActiveStories();
    const index = active.findIndex(s => s.id === currentId);
    if (index >= 0 && index < active.length - 1) {
      return active[index + 1].id;
    }
    return null;
  }

  public deleteStory(storyId: string): boolean {
    const initialLen = this.stories.length;
    this.stories = this.stories.filter(s => s.id !== storyId);
    if (this.activeStoryId === storyId) {
      this.activeStoryId = null;
    }
    return this.stories.length < initialLen;
  }

  public renderStoriesCarousel(myFingerprint: string): string {
    const active = this.getActiveStories();
    let html = '<div class="flex items-center gap-3 overflow-x-auto p-4 border-subtle-b stories-track bg-canvas/30 shrink-0 scrollbar-none select-none">';

    // Add Story Button
    html += `
      <div class="flex flex-col items-center gap-1 shrink-0 story-item cursor-pointer group" id="btn-add-story-trigger">
        <div class="w-14 h-14 rounded-full bg-surface-raised border-2 border-dashed border-cyphr/40 group-hover:border-cyphr flex items-center justify-center text-cyphr text-2xl font-light hover:bg-surface-overlay transition-all shadow-sm">
          +
        </div>
        <span class="text-[9px] font-mono text-slate-400 group-hover:text-cyphr transition-colors mt-0.5">Add Story</span>
      </div>
    `;

    // Active Stories Carousel Items
    for (const story of active) {
      const viewed = this.isViewed(story.id, myFingerprint);
      const initial = story.authorFingerprint.substring(0, 2).toUpperCase();
      const typeBadge = story.mediaType === 'code' ? '💻' : story.mediaType === 'image' ? '🖼️' : '⚡';

      const ringWrapper = viewed
        ? 'p-[2px] rounded-full bg-surface-highlight border border-white/10'
        : 'p-[2.5px] rounded-full bg-gradient-to-tr from-cyphr via-aether to-signal animate-pulse shadow-cyphr-sm';

      const avatarBg = viewed
        ? 'bg-surface-base text-slate-400'
        : 'bg-surface-overlay text-white';

      html += `
        <div class="flex flex-col items-center gap-1 shrink-0 story-item cursor-pointer group btn-open-story" data-story-id="${story.id}">
          <div class="relative ${ringWrapper} transition-all duration-200 group-hover:scale-105">
            <div class="w-13 h-13 rounded-full ${avatarBg} flex items-center justify-center font-mono text-sm font-bold">
              ${initial}
            </div>
            <span class="absolute -bottom-1 -right-1 text-[10px] bg-surface-raised border border-white/10 rounded-full w-4 h-4 flex items-center justify-center leading-none">
              ${typeBadge}
            </span>
          </div>
          <span class="text-[9px] font-mono text-slate-300 group-hover:text-cyphr transition-colors mt-0.5 truncate w-14 text-center">
            id:${this.escapeHtml(story.authorFingerprint.substring(0, 4))}
          </span>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  public renderStoryModal(myFingerprint: string): string {
    if (!this.activeStoryId) return '';

    const story = this.getStoryById(this.activeStoryId);
    if (!story) return '';

    // Automatically mark as viewed by current user
    this.markViewed(story.id, myFingerprint);

    const activeStories = this.getActiveStories();
    const currentIndex = activeStories.findIndex(s => s.id === story.id);
    const prevStoryId = this.getPreviousStoryId(story.id);
    const nextStoryId = this.getNextStoryId(story.id);
    const initial = story.authorFingerprint.substring(0, 2).toUpperCase();

    const roleBadge = story.authorRole === 'GUARDIAN' ? 'text-amber bg-amber/10 border-amber/30' :
                      story.authorRole === 'ARCHIVIST' ? 'text-cyphr bg-cyphr/10 border-cyphr/30' :
                      story.authorRole === 'MODERATOR' ? 'text-signal bg-signal/10 border-signal/30' :
                      'text-slate-400 bg-surface-raised border-white/5';

    // Build timeline indicators for all active stories
    let timelineHtml = '<div class="flex items-center gap-1.5 w-full px-4 pt-3 pb-1">';
    for (let i = 0; i < activeStories.length; i++) {
      if (i < currentIndex) {
        timelineHtml += '<div class="h-1 flex-1 bg-cyphr rounded-full"></div>';
      } else if (i === currentIndex) {
        timelineHtml += `
          <div class="h-1 flex-1 bg-surface-overlay rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyphr to-aether rounded-full w-full animate-[progress_5s_linear]"></div>
          </div>
        `;
      } else {
        timelineHtml += '<div class="h-1 flex-1 bg-white/10 rounded-full"></div>';
      }
    }
    timelineHtml += '</div>';

    // Media Content Rendering
    let contentBody = '';
    if (story.mediaType === 'code') {
      contentBody = this.renderCodeContent(story.content);
    } else if (story.mediaType === 'image') {
      contentBody = this.renderImageContent(story.content, story.gradient);
    } else {
      contentBody = this.renderTextContent(story.content, story.gradient);
    }

    return `
      <div id="story-modal-backdrop" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
        
        <!-- PREV BUTTON -->
        <button id="btn-story-prev" data-story-id="${prevStoryId || ''}" class="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-surface-raised/80 hover:bg-surface-overlay text-white text-xl border border-white/10 transition-all ${!prevStoryId ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'hover:scale-110'} mr-4 shrink-0 shadow-lg" title="Previous Story (Left Arrow)">
          ‹
        </button>

        <!-- STORY CONTAINER CARD -->
        <div class="relative w-full max-w-lg h-[620px] bg-surface-base border border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl bg-gradient-to-b ${story.gradient}">
          
          <!-- TOP BAR: TIMELINE + HEADER -->
          <div class="w-full shrink-0 z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            ${timelineHtml}
            
            <div class="flex items-center justify-between px-4 py-2.5">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-cyphr to-aether flex items-center justify-center font-mono text-xs font-bold text-black shadow-sm">
                  ${initial}
                </div>
                <div class="flex flex-col">
                  <div class="flex items-center space-x-1.5">
                    <span class="font-mono text-xs font-bold text-white">id:${this.escapeHtml(story.authorFingerprint)}</span>
                    <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border ${roleBadge}">${story.authorRole}</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-400">Ephemeral Pulse • 24h Expiry</span>
                </div>
              </div>

              <div class="flex items-center space-x-2">
                <span class="text-[10px] font-mono text-cyphr bg-cyphr/10 border border-cyphr/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ${story.mediaType}
                </span>
                <button id="btn-close-story-modal" class="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors" title="Close (Esc)">
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- STORY MAIN CONTENT AREA -->
          <div class="flex-1 flex flex-col justify-center items-center px-6 py-4 overflow-y-auto z-10">
            ${contentBody}
          </div>

          <!-- BOTTOM ACTION FOOTER -->
          <div class="w-full p-4 shrink-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 border-t border-white/5 flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <span>👁️ ${story.viewedBy.size} Viewers</span>
              <span>•</span>
              <span class="text-signal">● ZK-Verified</span>
            </div>

            <div class="flex items-center space-x-2">
              <button class="btn-story-react px-2.5 py-1 rounded-lg bg-surface-raised/80 hover:bg-surface-overlay text-xs border border-white/10 transition-all hover:scale-105" data-reaction="🔥">
                🔥
              </button>
              <button class="btn-story-react px-2.5 py-1 rounded-lg bg-surface-raised/80 hover:bg-surface-overlay text-xs border border-white/10 transition-all hover:scale-105" data-reaction="⚡">
                ⚡
              </button>
              <button class="btn-story-react px-2.5 py-1 rounded-lg bg-surface-raised/80 hover:bg-surface-overlay text-xs border border-white/10 transition-all hover:scale-105" data-reaction="🛡️">
                🛡️
              </button>
            </div>
          </div>

        </div>

        <!-- NEXT BUTTON -->
        <button id="btn-story-next" data-story-id="${nextStoryId || ''}" class="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-surface-raised/80 hover:bg-surface-overlay text-white text-xl border border-white/10 transition-all ${!nextStoryId ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'hover:scale-110'} ml-4 shrink-0 shadow-lg" title="Next Story (Right Arrow)">
          ›
        </button>

      </div>
    `;
  }

  public renderStoryCreatorModal(authorFingerprint: string): string {
    if (!this.isCreatorOpen) return '';

    return `
      <div id="story-creator-backdrop" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150" data-action="call-global" data-global-method="if" data-global-args='[event.target.id === "story-creator-backdrop") window.__aetheris_close_story_creator && window.__aetheris_close_story_creator(]'>
        <div class="relative w-full max-w-lg bg-surface-base border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          
          <!-- MODAL HEADER -->
          <div class="flex items-center justify-between pb-3 border-subtle-b">
            <div class="flex items-center space-x-2">
              <span class="text-xl">✨</span>
              <div>
                <h3 class="text-sm font-bold text-white font-mono">Create Ephemeral Pulse Story</h3>
                <p class="text-[10px] text-slate-400 font-mono">Disappears automatically in 24 hours · ZK Authenticated</p>
              </div>
            </div>
            <button id="btn-close-story-creator" class="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-overlay text-slate-300 hover:text-white flex items-center justify-center text-sm border border-white/10 transition-colors cursor-pointer" title="Close (Esc)">
              ✕
            </button>
          </div>

          <!-- MEDIA TYPE SWITCHER -->
          <div class="flex items-center space-x-1.5 bg-surface-raised p-1 rounded-xl border border-white/5 text-xs font-mono">
            <button type="button" class="btn-story-type-select flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${this.creatorMediaType === 'text' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" data-story-type="text">
              ⚡ Flash Pulse
            </button>
            <button type="button" class="btn-story-type-select flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${this.creatorMediaType === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" data-story-type="code">
              💻 Code Stream
            </button>
            <button type="button" class="btn-story-type-select flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${this.creatorMediaType === 'image' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" data-story-type="image">
              🖼️ Swarm Media
            </button>
          </div>

          <!-- GRADIENT PALETTE SELECTOR -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Aura Gradient Canvas:</label>
            <div class="flex items-center space-x-2">
              ${STORY_GRADIENTS.map((g, i) => `
                <button type="button" class="btn-story-grad-select w-8 h-8 rounded-xl bg-gradient-to-tr ${g} border-2 transition-all cursor-pointer ${this.creatorGradientIndex === i ? 'border-white scale-110 shadow-md ring-2 ring-indigo-500/50' : 'border-transparent opacity-60 hover:opacity-100'}" data-grad-index="${i}"></button>
              `).join('')}
            </div>
          </div>

          <!-- INPUT FORM -->
          <div class="space-y-2">
            <label class="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              ${this.creatorMediaType === 'code' ? 'Disassembly / Source Code:' : this.creatorMediaType === 'image' ? 'Media Caption & Swarm URL:' : 'Ephemeral Message:'}
            </label>
            <textarea 
              id="story-creator-content" 
              rows="4" 
              placeholder="${this.creatorMediaType === 'code' ? 'Enter ASM, C, Rust or cryptographic proof logic...' : this.creatorMediaType === 'image' ? 'Enter caption for your visual swarm snapshot...' : 'What is your sovereign pulse today?...'}"
              class="w-full bg-surface-raised border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none font-sans"
            ></textarea>
          </div>

          <!-- ACTION FOOTER -->
          <div class="flex items-center justify-between pt-2 border-subtle-t">
            <span class="text-[10px] font-mono text-slate-500">Signing as: @id:${authorFingerprint.substring(0, 8)}</span>
            <button id="btn-submit-story" type="button" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold font-mono transition-all shadow-md flex items-center space-x-1.5 cursor-pointer">
              <span>Broadcast (24h)</span>
              <span>⚡</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  private renderTextContent(text: string, gradient: string): string {
    return `
      <div class="w-full h-full flex flex-col justify-center items-center text-center p-6 rounded-xl bg-surface-raised/40 backdrop-blur-sm border border-white/10 space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyphr to-aether flex items-center justify-center text-2xl shadow-lg shadow-cyphr/20">
          ⚡
        </div>
        <p class="text-base sm:text-lg font-medium text-slate-100 leading-relaxed font-sans select-text">
          ${this.escapeHtml(text)}
        </p>
        <div class="pt-2 flex items-center space-x-2 text-[11px] font-mono text-cyphr">
          <span>● SFrame Ratchet Protected</span>
        </div>
      </div>
    `;
  }

  private renderImageContent(caption: string, gradient: string): string {
    return `
      <div class="w-full h-full flex flex-col justify-between p-4 rounded-xl bg-surface-raised/60 backdrop-blur-sm border border-white/10 space-y-3">
        <div class="flex-1 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-black border border-white/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
          <div class="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-purple-500/10 opacity-70"></div>
          <div class="text-5xl mb-3 animate-bounce">🛡️</div>
          <span class="font-mono text-xs font-bold text-signal tracking-widest uppercase mb-1">Vault Swarm Snapshot</span>
          <span class="font-mono text-[10px] text-slate-400">Merkle Root: 0x7f9a...3b21</span>
        </div>
        <p class="text-xs sm:text-sm font-medium text-slate-200 leading-normal px-2 select-text">
          ${this.escapeHtml(caption)}
        </p>
      </div>
    `;
  }

  private renderCodeContent(codeText: string): string {
    const lines = codeText.split('\n');
    const formattedLines = lines.map((line, idx) => {
      const lineNum = (idx + 1).toString().padStart(2, '0');
      let coloredLine = this.escapeHtml(line);
      
      if (line.startsWith(';')) {
        coloredLine = `<span class="text-slate-500 italic">${coloredLine}</span>`;
      } else if (line.includes(':')) {
        const parts = line.split(':');
        const addr = parts[0];
        const rest = parts.slice(1).join(':');
        coloredLine = `<span class="text-cyphr">${this.escapeHtml(addr)}:</span><span class="text-signal">${this.escapeHtml(rest)}</span>`;
      }

      return `<div class="flex space-x-3"><span class="text-slate-600 select-none">${lineNum}</span><span>${coloredLine}</span></div>`;
    }).join('');

    return `
      <div class="w-full h-full flex flex-col p-3.5 rounded-xl bg-black/80 backdrop-blur-sm border border-white/10 font-mono text-xs overflow-hidden space-y-2">
        <div class="flex items-center justify-between pb-2 border-subtle-b text-[10px] text-slate-400">
          <span class="flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-signal"></span>
            <span class="text-slate-300 font-bold">DISASSEMBLY / CODE STREAM</span>
          </span>
          <span class="text-cyphr">x86_64 ELF</span>
        </div>
        <div class="flex-1 overflow-y-auto space-y-0.5 leading-relaxed select-text p-1">
          ${formattedLines}
        </div>
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const storiesEngine = new StoriesEngine();
serviceRegistry.registerInstance(SERVICES.StoriesEngine, storiesEngine);
