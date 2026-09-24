/**
 * @file chat-rich-embed.ts
 * @package @aetheris/client-ui
 * @description Rich Post Embeds and Smart Emoticon Replacement for Chat and Messages.
 *
 * Capabilities:
 * 1. Post link detection: Parses /p/:id and https://urefy.com/p/:id inside chat messages.
 * 2. Rich post card rendering: Clean, calm editorial preview card with community, author, title, media preview, and metrics.
 * 3. Smart emoticon replacement: Converts text smileys (:) -> 🙂, <3 -> ❤️, etc.) while strictly preserving URLs, code spans, and code blocks.
 * 4. Emoji dictionary for colon autocomplete (:fire: -> 🔥, etc.).
 */

import { clientStore, ClientPost } from './client-state.js';
import { sovereignCircleEngine } from './sovereign-circle.js';
import { profileView } from './profile-view.js';
import { renderIcon } from './ui/icons.js';
import { renderAvatar } from './ui/avatar-generator.js';
import { postPath } from './public-urls.js';

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── 1. Smart Emoticon Replacement ──────────────────────────────────────────

export const EMOTICON_MAP: Record<string, string> = {
  ':)': '🙂',
  ':-)': '🙂',
  ':D': '😀',
  ':-D': '😀',
  'XD': '😆',
  'xD': '😆',
  ';)': '😉',
  ';-)': '😉',
  '<3': '❤️',
  ':(': '🙁',
  ':-(': '🙁',
  ":'(": '😢',
  ":'-(": '😢',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ':o': '😮',
  ':-o': '😮',
  ':O': '😮',
  ':-O': '😮',
  ':|': '😐',
  ':-|': '😐',
  ':/': '😕',
  ':-/': '😕',
  'B)': '😎',
  'B-)': '😎',
  'O:)': '😇',
  'o:)': '😇',
  '>:(': '😠',
};

// Sorted by length descending so longer patterns match first (e.g. ':-)' before ':)')
const SORTED_EMOTICONS = Object.entries(EMOTICON_MAP).sort((a, b) => b[0].length - a[0].length);

/**
 * Replaces ASCII emoticons with unicode emojis.
 * Respects inline code (`...`), code blocks (```...```), URLs, email addresses, crypto tokens (0x...), and HTML tags.
 */
export function replaceEmoticons(text: string): string {
  if (!text) return '';

  // Protect code blocks, inline code, URLs, file paths, emails, hexadecimal tokens, and HTML tags
  const protectedSegments: string[] = [];
  const protectedText = text.replace(/(```[\s\S]*?```|`[^`]+`|<[^>]+>|https?:\/\/[^\s]+|ftp:\/\/[^\s]+|[a-zA-Z]:\\[^\s]+|(?:\.{1,2}\/|\/)[a-zA-Z0-9_\-./]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|0x[a-fA-F0-9]+)/g, (match) => {
    protectedSegments.push(match);
    return `__PROTECTED_SEGMENT_${protectedSegments.length - 1}__`;
  });

  let processed = protectedText;
  for (const [emoticon, emoji] of SORTED_EMOTICONS) {
    // Escape regex special chars in emoticon
    const escaped = emoticon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match emoticon with whitespace boundary, line start/end, or trailing punctuation
    const regex = new RegExp(`(^|\\s)${escaped}(?=\\s|$|[.,!?])`, 'g');
    processed = processed.replace(regex, `$1${emoji}`);
  }

  // Restore protected blocks
  return processed.replace(/__PROTECTED_SEGMENT_(\d+)__/g, (_, idx) => {
    return protectedSegments[parseInt(idx, 10)] ?? '';
  });
}

// ─── 2. Emoji Dictionary for Colon Autocomplete ─────────────────────────────

export interface EmojiEntry {
  shortcode: string;
  emoji: string;
  name: string;
  category: string;
}

export const EMOJI_DICTIONARY: EmojiEntry[] = [
  { shortcode: 'smile', emoji: '🙂', name: 'Slightly Smiling Face', category: 'Smileys' },
  { shortcode: 'grin', emoji: '😀', name: 'Grinning Face', category: 'Smileys' },
  { shortcode: 'laughing', emoji: '😆', name: 'Laughing', category: 'Smileys' },
  { shortcode: 'joy', emoji: '😂', name: 'Tears of Joy', category: 'Smileys' },
  { shortcode: 'sweat_smile', emoji: '😅', name: 'Sweat Smile', category: 'Smileys' },
  { shortcode: 'rofl', emoji: '🤣', name: 'Rolling on Floor', category: 'Smileys' },
  { shortcode: 'wink', emoji: '😉', name: 'Winking Face', category: 'Smileys' },
  { shortcode: 'blush', emoji: '😊', name: 'Smiling Face with Smiling Eyes', category: 'Smileys' },
  { shortcode: 'sunglasses', emoji: '😎', name: 'Sunglasses', category: 'Smileys' },
  { shortcode: 'heart_eyes', emoji: '😍', name: 'Heart Eyes', category: 'Smileys' },
  { shortcode: 'thinking', emoji: '🤔', name: 'Thinking Face', category: 'Smileys' },
  { shortcode: 'shrug', emoji: '🤷', name: 'Shrug', category: 'Smileys' },
  { shortcode: 'eyes', emoji: '👀', name: 'Eyes', category: 'Smileys' },
  { shortcode: 'salute', emoji: '🫡', name: 'Saluting Face', category: 'Smileys' },

  { shortcode: 'heart', emoji: '❤️', name: 'Red Heart', category: 'Gestures' },
  { shortcode: 'fire', emoji: '🔥', name: 'Fire', category: 'Objects' },
  { shortcode: 'rocket', emoji: '🚀', name: 'Rocket', category: 'Objects' },
  { shortcode: 'sparkles', emoji: '✨', name: 'Sparkles', category: 'Objects' },
  { shortcode: 'party', emoji: '🎉', name: 'Party Popper', category: 'Objects' },
  { shortcode: 'star', emoji: '⭐', name: 'Star', category: 'Objects' },
  { shortcode: 'check', emoji: '✅', name: 'Check Mark', category: 'Symbols' },
  { shortcode: '100', emoji: '💯', name: 'Hundred Points', category: 'Symbols' },
  { shortcode: 'gem', emoji: '💎', name: 'Gem Stone', category: 'Objects' },
  { shortcode: 'key', emoji: '🔑', name: 'Key', category: 'Objects' },
  { shortcode: 'lock', emoji: '🔒', name: 'Locked', category: 'Objects' },
  { shortcode: 'shield', emoji: '🛡️', name: 'Shield', category: 'Objects' },
  { shortcode: 'bulb', emoji: '💡', name: 'Light Bulb', category: 'Objects' },
  { shortcode: 'book', emoji: '📚', name: 'Books', category: 'Objects' },
  { shortcode: 'warning', emoji: '⚠️', name: 'Warning', category: 'Symbols' },
  { shortcode: 'coffee', emoji: '☕', name: 'Coffee', category: 'Food' },

  { shortcode: 'thumbsup', emoji: '👍', name: 'Thumbs Up', category: 'Gestures' },
  { shortcode: '+1', emoji: '👍', name: 'Thumbs Up', category: 'Gestures' },
  { shortcode: 'thumbsdown', emoji: '👎', name: 'Thumbs Down', category: 'Gestures' },
  { shortcode: '-1', emoji: '👎', name: 'Thumbs Down', category: 'Gestures' },
  { shortcode: 'clap', emoji: '👏', name: 'Clapping Hands', category: 'Gestures' },
  { shortcode: 'wave', emoji: '👋', name: 'Waving Hand', category: 'Gestures' },
  { shortcode: 'pray', emoji: '🙏', name: 'Folded Hands', category: 'Gestures' },
  { shortcode: 'handshake', emoji: '🤝', name: 'Handshake', category: 'Gestures' },
  { shortcode: 'raised_hands', emoji: '🙌', name: 'Raising Hands', category: 'Gestures' },
];

export function searchEmojis(query: string, limit = 8): EmojiEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return EMOJI_DICTIONARY.slice(0, limit);
  return EMOJI_DICTIONARY.filter(e => e.shortcode.includes(q) || e.name.toLowerCase().includes(q)).slice(0, limit);
}

// ─── 3. Post Link Parsing & Rich Embed Card ─────────────────────────────────

const POST_LINK_REGEX = /(?:https?:\/\/[^\s/]+)?\/p\/([a-zA-Z0-9_-]+)/g;

/**
 * Extracts unique post IDs referenced in a message text.
 */
export function extractPostIdsFromText(text: string): string[] {
  if (!text) return [];
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(POST_LINK_REGEX);
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      matches.add(match[1]);
    }
  }
  return Array.from(matches);
}

export const extractPostLinks = extractPostIdsFromText;

/**
 * Renders a rich post preview card to embed inside a chat bubble.
 */
export function renderChatPostEmbed(postId: string): string {
  const post = clientStore.posts.find(p => p.id === postId);
  if (!post) {
    return `
      <div class="chat-post-embed my-2 p-3 rounded-xl bg-surface-base/80 border border-white/10 text-xs flex items-center justify-between gap-2 max-w-sm">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-slate-400 font-mono text-[11px] truncate">Post: ${escapeHtml(postId)}</span>
        </div>
        <a href="/p/${escapeHtml(postId)}" data-public-link class="text-[11px] text-[var(--color-accent,#e59b3c)] font-medium hover:underline shrink-0">
          View Post →
        </a>
      </div>
    `;
  }

  const circle = sovereignCircleEngine.findCircle(post.channelId);
  const circleName = circle ? `c/${circle.name}` : (post.channelId.startsWith('c/') ? post.channelId : 'c/general');
  const profile = profileView.getProfile(post.authorFingerprint);
  const authorName = profile?.name || `@${post.authorFingerprint.substring(0, 8)}`;
  const title = post.title && post.title !== post.content.substring(0, 50) ? post.title : '';
  const excerpt = post.content.slice(0, 120).trim();
  const hasImage = Boolean(post.images && post.images.length > 0);
  const imageUrl = hasImage ? post.images![0] : null;

  return `
    <div 
      class="chat-post-embed my-2.5 rounded-2xl bg-surface-base border border-white/10 hover:border-white/20 transition-all p-3.5 max-w-md cursor-pointer select-none shadow-sm group"
      data-action="open-post-detail"
      data-post-id="${escapeHtml(post.id)}"
      role="button"
      tabindex="0"
      aria-label="Embedded post: ${escapeHtml(title || excerpt)}"
    >
      <!-- Embed Header: Community & Author -->
      <div class="flex items-center justify-between text-xs mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-[11px] font-semibold text-[var(--color-accent,#e59b3c)] truncate">
            ${escapeHtml(circleName)}
          </span>
          <span class="text-slate-500">•</span>
          <div class="flex items-center gap-1 text-slate-300 text-[11px] truncate">
            ${renderAvatar(profile?.avatar, post.authorFingerprint, { size: 14 })}
            <span class="truncate">${escapeHtml(authorName)}</span>
          </div>
        </div>
        <span class="text-[10px] text-slate-400 tabular-nums shrink-0">${post.meritVotes || 0} merits</span>
      </div>

      <!-- Embed Content: Title + Excerpt -->
      <div class="flex gap-3 items-start">
        <div class="flex-1 min-w-0 space-y-1">
          ${title ? `
            <h4 class="text-xs font-bold text-slate-100 group-hover:text-white transition-colors line-clamp-1">
              ${escapeHtml(title)}
            </h4>
          ` : ''}
          <p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            ${escapeHtml(excerpt)}
          </p>
        </div>
        ${imageUrl ? `
          <div class="w-14 h-14 rounded-xl overflow-hidden bg-surface-raised border border-white/5 shrink-0">
            <img src="${escapeHtml(imageUrl)}" alt="Media thumbnail" class="w-full h-full object-cover" loading="lazy" />
          </div>
        ` : ''}
      </div>

      <!-- Embed Footer: Open Link -->
      <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
        <span class="flex items-center gap-1">
          ${renderIcon('messageSquare', { size: 12 })}
          <span>${post.replyCount || 0} replies</span>
        </span>
        <span class="text-[var(--color-accent,#e59b3c)] font-medium group-hover:underline">Open discussion →</span>
      </div>
    </div>
  `;
}

/**
 * Transforms message body into formatted HTML with lightweight markdown (code blocks, bold, italic, spoilers, links)
 * and native embedded post preview cards.
 */
export function processChatMessageContent(rawText: string): string {
  if (!rawText) return '';

  // Extract post IDs before formatting
  const postIds = extractPostIdsFromText(rawText);

  // 1. Separate code blocks before emoticon replacement
  const codeBlocks: string[] = [];
  let text = rawText.replace(/```(?:([a-zA-Z0-9#+_-]+)\n)?([\s\S]*?)```/g, (_, lang, code) => {
    const language = (lang || 'code').trim();
    const cleanCode = code.replace(/^\n+|\n+$/g, '');
    const escapedCode = escapeHtml(cleanCode);
    const escapedAttrCode = cleanCode.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const blockHtml = `
      <div class="my-2 rounded-xl border border-white/10 bg-[#0d0f14]/90 overflow-hidden text-left shadow-sm select-text max-w-xl">
        <div class="flex items-center justify-between px-3 py-1 bg-white/[0.03] border-b border-white/5 text-[10px] font-mono text-slate-400">
          <span class="font-semibold text-slate-300 uppercase tracking-wider">${escapeHtml(language)}</span>
          <button type="button" class="px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors" data-action="copy-code-block" data-code="${escapedAttrCode}">
            <span>📋</span>
            <span>Copy</span>
          </button>
        </div>
        <pre class="p-2.5 overflow-x-auto text-[12.5px] sm:text-[13px] font-mono text-emerald-300/90 leading-relaxed no-scrollbar select-text m-0"><code>${escapedCode}</code></pre>
      </div>
    `;
    codeBlocks.push(blockHtml);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // 2. Separate inline code
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    const inlineHtml = `<code class="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/5 font-mono text-[13px] text-amber-300/90 select-text">${escapeHtml(code)}</code>`;
    inlineCodes.push(inlineHtml);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // 3. Emoticons replacement on remaining text
  text = replaceEmoticons(text);

  // 4. HTML escape remaining text
  let html = escapeHtml(text);

  // 5. Bold & Italic
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em class="italic text-slate-200">$1</em>');

  // 6. Spoilers: ||text||
  html = html.replace(/\|\|([^|\n]+)\|\|/g, '<span class="spoiler-text px-1 rounded bg-slate-700 text-transparent hover:text-white hover:bg-slate-600 transition-all cursor-pointer select-none" onclick="this.classList.toggle(\'text-transparent\')" title="Click to reveal spoiler">$1</span>');

  // 7. Blockquotes (> text)
  html = html.replace(/(?:^|\n)&gt;\s*([^\n]+)/g, '<blockquote class="border-l-2 border-[var(--color-accent,#e59b3c)] pl-3 my-1.5 text-slate-300 italic text-[14px] leading-relaxed">$1</blockquote>');

  // 8. Restore inline code
  html = html.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => inlineCodes[parseInt(idx, 10)] ?? '');

  // 9. Restore code blocks
  html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[parseInt(idx, 10)] ?? '');

  // 10. Links (excluding internal post links which are embedded below)
  html = html.replace(/(https?:\/\/[^\s<]+)(?![^<]*>)/g, (url) => {
    if (url.includes('/p/')) return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent,#e59b3c)] hover:underline">${url}</a>`;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[var(--color-accent,#e59b3c)] hover:underline break-all">${url}</a>`;
  });

  // 11. Append embedded post cards if any
  if (postIds.length > 0) {
    const embeds = postIds.map(id => renderChatPostEmbed(id)).join('');
    html = `${html}\n${embeds}`;
  }

  return html;
}

