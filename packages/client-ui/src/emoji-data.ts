/**
 * @file emoji-data.ts
 * @package @aetheris/client-ui
 * @description Comprehensive, categorized Unicode emoji library with shortcodes and search index.
 * Designed to be lazy-loaded on demand to preserve startup bundle performance.
 */

export interface EmojiItem {
  emoji: string;
  name: string;
  shortcode: string;
  category: EmojiCategoryKey;
  keywords?: string[];
}

export type EmojiCategoryKey =
  | 'recent'
  | 'smileys'
  | 'people'
  | 'animals'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';

export interface EmojiCategory {
  key: EmojiCategoryKey;
  label: string;
  icon: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: Array<{ key: EmojiCategoryKey; label: string; icon: string }> = [
  { key: 'recent', label: 'Recently used', icon: '🕒' },
  { key: 'smileys', label: 'Smileys & emotion', icon: '🙂' },
  { key: 'people', label: 'People & body', icon: '👋' },
  { key: 'animals', label: 'Animals & nature', icon: '🐱' },
  { key: 'food', label: 'Food & drink', icon: '🍔' },
  { key: 'activities', label: 'Activities', icon: '⚽' },
  { key: 'travel', label: 'Travel & places', icon: '🚀' },
  { key: 'objects', label: 'Objects', icon: '💡' },
  { key: 'symbols', label: 'Symbols', icon: '❤️' },
  { key: 'flags', label: 'Flags', icon: '🚩' },
];

export const RAW_CATEGORY_EMOJIS: Record<Exclude<EmojiCategoryKey, 'recent'>, string[]> = {
  smileys: [
    '🙂', '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '☺️', '😊', '😇',
    '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨',
    '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
    '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤', '😠', '😡', '🤬', '🤯', '😳',
    '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫',
    '🫠', '🤥', '😶', '😐', '😑', '😬', '🫨', '😯', '😦', '😧', '😮', '😲', '🥱', '😴',
    '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
    '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃'
  ],
  people: [
    '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞',
    '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊',
    '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
    '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️',
    '👅', '👄', '🫦', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵'
  ],
  animals: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸',
    '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉',
    '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲',
    '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠',
    '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐆', '🐅', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
    '🦘', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰'
  ],
  food: [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭',
    '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🥔',
    '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗',
    '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣',
    '🍱', '🥟', '🍤', '🍙', '🍚', '🍨', '🍧', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭',
    '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🫖', '🍵', '🍶', '🍷', '🍸', '🍹', '🍺', '🍻',
    '🥂', '🥃', '🥤', '🧋', '🧃', '🧊'
  ],
  activities: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒',
    '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹',
    '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🧗', '🏇', '🚴', '🚵',
    '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🎨', '🎬', '🎤',
    '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'
  ],
  travel: [
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜',
    '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚂', '🚆', '🚇', '🚊', '🚉', '🚁',
    '🛩️', '✈️', '🛫', '🛬', '🛰️', '🚀', '🛸', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢',
    '⚓', '🛟', '⛽', '🚧', '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡',
    '🎢', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🏕️', '⛺', '🏠', '🏡', '🏢', '🏥', '🏦'
  ],
  objects: [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '💽', '💾', '💿', '📀',
    '📷', '📸', '📹', '🎥', '📽️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '⏱️', '⏰',
    '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '💸', '💵', '💴', '💶',
    '💷', '🪙', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '🛠️', '⛏️', '🔩', '⚙️', '🧱',
    '⛓️', '🧲', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🔮', '🧿', '💈', '⚗️',
    '🔭', '🔬', '🩹', '🩺', '💊', '💉', '🧬', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚿', '🛁',
    '🧼', '🪥', '🪒', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '📦', '🏷️', '✉️', '📩',
    '📨', '📧', '💌', '📜', '📄', '📊', '📈', '📉', '🗒️', '📅', '📆', '📇', '📋', '📁',
    '📂', '🗞️', '📰', '📓', '📕', '📗', '📘', '📚', '📖', '🔖', '🔗', '📎', '📌', '📍',
    '✂️', '🖊️', '🖋️', '📝', '✏️', '🔍', '🔎', '🔒', '🔓', '🔏', '🔐'
  ],
  symbols: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓',
    '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️',
    '☦️', '🛐', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔',
    '⚛️', '✴️', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫',
    '💯', '💢', '♨️', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '⚠️', '🚸', '⚜️',
    '♻️', '✅', '❇️', '✳️', '❎', '🌐', 'Ⓜ️', '💤', '🏧', '♿', '🅿️', '🚹', '🚺', '🚻',
    '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣',
    '▶️', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️',
    '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '🔄', '🎵', '🎶', '➕', '➖', '➗', '✖️',
    '🟰', '♾️', '💲', '™️', '©️', '®️', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵',
    '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔶', '🔷', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪',
    '⬛', '⬜', '🟫', '🔈', '🔉', '🔊', '🔇', '🔔', '🔕'
  ],
  flags: [
    '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇨🇦', '🇦🇺', '🇩🇪', '🇫🇷',
    '🇮🇹', '🇪🇸', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇲🇽', '🇷🇴', '🇺🇦', '🇵🇱', '🇳🇱', '🇸🇪', '🇳🇴',
    '🇩🇰', '🇫🇮', '🇨🇭', '🇦🇹', '🇮🇪', '🇳🇿', '🇿🇦', '🇸🇬', '🇮🇱', '🇹🇷', '🇬🇷', '🇵🇹', '🇪🇺', '🇺🇳'
  ],
};

// Named shortcodes dictionary for search and autocomplete
export const SHORTCODE_MAP: Record<string, { emoji: string; name: string; category: EmojiCategoryKey; keywords: string[] }> = {
  // Common Top Reactions
  thumbsup: { emoji: '👍', name: 'Thumbs Up', category: 'people', keywords: ['like', 'approve', 'ok', '+1'] },
  heart: { emoji: '❤️', name: 'Red Heart', category: 'symbols', keywords: ['love', 'like'] },
  joy: { emoji: '😂', name: 'Face with Tears of Joy', category: 'smileys', keywords: ['laugh', 'funny', 'haha'] },
  open_mouth: { emoji: '😮', name: 'Face with Open Mouth', category: 'smileys', keywords: ['surprise', 'wow'] },
  cry: { emoji: '😢', name: 'Crying Face', category: 'smileys', keywords: ['sad', 'tear'] },
  rage: { emoji: '😡', name: 'Pouting Face', category: 'smileys', keywords: ['angry', 'mad'] },
  fire: { emoji: '🔥', name: 'Fire', category: 'travel', keywords: ['lit', 'hot', 'burn'] },
  tada: { emoji: '🎉', name: 'Party Popper', category: 'activities', keywords: ['party', 'celebration', 'congrats'] },
  party: { emoji: '🎉', name: 'Party Popper', category: 'activities', keywords: ['tada', 'celebration'] },
  smile: { emoji: '🙂', name: 'Slightly Smiling Face', category: 'smileys', keywords: ['happy', 'smiling'] },
  grin: { emoji: '😀', name: 'Grinning Face', category: 'smileys', keywords: ['happy', 'smile'] },
  laughing: { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys', keywords: ['haha', 'xd'] },
  rofl: { emoji: '🤣', name: 'Rolling on the Floor Laughing', category: 'smileys', keywords: ['lol', 'haha'] },
  wink: { emoji: '😉', name: 'Winking Face', category: 'smileys', keywords: ['flirt'] },
  sunglasses: { emoji: '😎', name: 'Smiling Face with Sunglasses', category: 'smileys', keywords: ['cool', 'rad'] },
  thinking: { emoji: '🤔', name: 'Thinking Face', category: 'smileys', keywords: ['hmm', 'ponder'] },
  eyes: { emoji: '👀', name: 'Eyes', category: 'people', keywords: ['look', 'see', 'watch'] },
  salute: { emoji: '🫡', name: 'Saluting Face', category: 'smileys', keywords: ['respect'] },
  rocket: { emoji: '🚀', name: 'Rocket', category: 'travel', keywords: ['launch', 'fast', 'blast'] },
  gem: { emoji: '💎', name: 'Gem Stone', category: 'objects', keywords: ['diamond', 'vault', 'crypto'] },
  shield: { emoji: '🛡️', name: 'Shield', category: 'objects', keywords: ['security', 'protect', 'safe'] },
  zap: { emoji: '⚡', name: 'High Voltage', category: 'travel', keywords: ['pulse', 'electric', 'lightning', 'energy'] },
  bulb: { emoji: '💡', name: 'Light Bulb', category: 'objects', keywords: ['idea', 'insight'] },
  target: { emoji: '🎯', name: 'Bullseye', category: 'activities', keywords: ['precise', 'goal'] },
  check: { emoji: '✅', name: 'Check Mark Button', category: 'symbols', keywords: ['verify', 'done', 'yes'] },
  cross: { emoji: '❌', name: 'Cross Mark', category: 'symbols', keywords: ['no', 'delete', 'cancel'] },
  sparkles: { emoji: '✨', name: 'Sparkles', category: 'travel', keywords: ['magic', 'star', 'clean'] },
  star: { emoji: '⭐', name: 'Star', category: 'travel', keywords: ['favorite'] },
  wave: { emoji: '👋', name: 'Waving Hand', category: 'people', keywords: ['hello', 'bye', 'hi'] },
  clap: { emoji: '👏', name: 'Clapping Hands', category: 'people', keywords: ['bravo', 'applause'] },
  pray: { emoji: '🙏', name: 'Folded Hands', category: 'people', keywords: ['please', 'thanks', 'hope'] },
  muscle: { emoji: '💪', name: 'Flexed Biceps', category: 'people', keywords: ['strong', 'power'] },
  skull: { emoji: '💀', name: 'Skull', category: 'smileys', keywords: ['dead', 'died', 'danger'] },
  poop: { emoji: '💩', name: 'Pile of Poo', category: 'smileys', keywords: ['crap'] },
  cat: { emoji: '🐱', name: 'Cat Face', category: 'animals', keywords: ['kitten', 'meow'] },
  dog: { emoji: '🐶', name: 'Dog Face', category: 'animals', keywords: ['puppy', 'woof'] },
  coffee: { emoji: '☕', name: 'Hot Beverage', category: 'food', keywords: ['coffee', 'tea'] },
  beer: { emoji: '🍺', name: 'Beer Mug', category: 'food', keywords: ['drink'] },
  pizza: { emoji: '🍕', name: 'Pizza', category: 'food', keywords: ['food'] },
  burger: { emoji: '🍔', name: 'Hamburger', category: 'food', keywords: ['fastfood'] },
  lock: { emoji: '🔒', name: 'Locked', category: 'objects', keywords: ['secure', 'private'] },
  key: { emoji: '🔑', name: 'Key', category: 'objects', keywords: ['password', 'auth'] },
  computer: { emoji: '💻', name: 'Laptop', category: 'objects', keywords: ['pc', 'code', 'dev'] },
  memo: { emoji: '📝', name: 'Memo', category: 'objects', keywords: ['note', 'write', 'document'] },
  link: { emoji: '🔗', name: 'Link', category: 'objects', keywords: ['url', 'attachment'] },
  flag_ro: { emoji: '🇷🇴', name: 'Flag: Romania', category: 'flags', keywords: ['romania'] },
  flag_us: { emoji: '🇺🇸', name: 'Flag: United States', category: 'flags', keywords: ['usa'] },
  flag_eu: { emoji: '🇪🇺', name: 'Flag: European Union', category: 'flags', keywords: ['europe'] },
};

// Storage helper for recently used emojis
const RECENT_STORAGE_KEY = 'urefy_recent_emojis_v1';
const MAX_RECENTS = 24;

export function getRecentEmojis(): string[] {
  if (typeof localStorage === 'undefined') return ['👍', '❤️', '😂', '🔥', '🎉', '🚀', '💡', '⚡'];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return ['👍', '❤️', '😂', '🔥', '🎉', '🚀', '💡', '⚡'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.slice(0, MAX_RECENTS) : ['👍', '❤️', '😂', '🔥', '🎉', '🚀', '💡', '⚡'];
  } catch {
    return ['👍', '❤️', '😂', '🔥', '🎉', '🚀', '💡', '⚡'];
  }
}

export function recordRecentEmoji(emoji: string): void {
  if (typeof localStorage === 'undefined' || !emoji) return;
  try {
    const current = getRecentEmojis().filter(e => e !== emoji);
    current.unshift(emoji);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(current.slice(0, MAX_RECENTS)));
  } catch {}
}

export function searchEmojis(query: string, limit = 40): Array<{ emoji: string; shortcode: string; name: string }> {
  const q = query.trim().toLowerCase().replace(/^:/, '');
  if (!q) return [];

  const results: Array<{ emoji: string; shortcode: string; name: string }> = [];
  const seen = new Set<string>();

  // 1. Direct shortcode / keyword match
  for (const [code, item] of Object.entries(SHORTCODE_MAP)) {
    if (code.includes(q) || item.name.toLowerCase().includes(q) || item.keywords.some(k => k.includes(q))) {
      if (!seen.has(item.emoji)) {
        seen.add(item.emoji);
        results.push({ emoji: item.emoji, shortcode: code, name: item.name });
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}
