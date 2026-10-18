import { describe, it, expect } from 'vitest';
import {
  highlightSyntaxSafe,
  renderSovereignCodeBlock,
  formatContentWithCodeCards,
} from '../src/code-highlighter.js';
import {
  encodeVoiceNoteMessage,
  parseVoiceNoteMessage,
  renderVoiceNoteBubble,
  bindVoiceNotePlayers,
} from '../src/dm-voice-notes.js';
import { parseServerSearchQuery } from '../functions/api/search.js';

describe('Sovereign Syntax Highlighter & Code Cards 2027', () => {
  it('highlights syntax safely without XSS vulnerability', () => {
    const raw = '<script>alert("xss")</script>\nconst x: number = 42; // test comment';
    const highlighted = highlightSyntaxSafe(raw, 'ts');

    expect(highlighted).not.toContain('<script>');
    expect(highlighted).toContain('&lt;script&gt;');
    expect(highlighted).toContain('<span class="sh-keyword">const</span>');
    expect(highlighted).toContain('<span class="sh-type">number</span>');
    expect(highlighted).toContain('<span class="sh-number">42</span>');
    expect(highlighted).toContain('<span class="sh-comment">// test comment</span>');
  });

  it('renders a full code card with lines and copy button', () => {
    const code = 'const hello = "world";\nconsole.log(hello);';
    const card = renderSovereignCodeBlock(code, 'typescript');

    expect(card).toContain('class="sh-card');
    expect(card).toContain('TypeScript');
    expect(card).toContain('2 linii');
    expect(card).toContain('class="sh-copy-btn"');
    expect(card).toContain('class="sh-line-num">1</span>');
    expect(card).toContain('class="sh-line-num">2</span>');
  });

  it('formats posts containing backtick code blocks into interactive code cards', () => {
    const post = 'Here is some code:\n```rust\nfn main() {\n  println!("Hello");\n}\n```\nAnd `inline code` plus **bold**.';
    const html = formatContentWithCodeCards(post);

    expect(html).toContain('class="sh-card');
    expect(html).toContain('Rust');
    expect(html).toContain('class="sh-inline-code">inline code</code>');
    expect(html).toContain('<strong>bold</strong>');
  });
});

describe('E2EE Opus Voice Notes 2027', () => {
  const samplePayload = {
    durationSec: 14,
    mimeType: 'audio/webm;codecs=opus',
    peaks: [20, 45, 80, 60, 30, 90],
    audioBase64: 'GkXfo59ChoEBQveBAULygQ8=',
  };

  it('encodes and parses voice note messages deterministically', () => {
    const encoded = encodeVoiceNoteMessage(samplePayload);
    expect(encoded.startsWith('>>> [VOICE_E2EE_V1:')).toBe(true);
    expect(encoded.endsWith(']')).toBe(true);

    const parsed = parseVoiceNoteMessage(encoded);
    expect(parsed).not.toBeNull();
    expect(parsed?.durationSec).toBe(14);
    expect(parsed?.peaks).toEqual(samplePayload.peaks);
    expect(parsed?.audioBase64).toBe(samplePayload.audioBase64);
  });

  it('rejects invalid or tampered voice note strings safely', () => {
    expect(parseVoiceNoteMessage('')).toBeNull();
    expect(parseVoiceNoteMessage('random message')).toBeNull();
    expect(parseVoiceNoteMessage('>>> [VOICE_E2EE_V1:invalid json]')).toBeNull();
  });

  it('renders interactive waveform bubble with timer and tags', () => {
    const bubble = renderVoiceNoteBubble(samplePayload, 'vn-test-123');

    expect(bubble).toContain('class="nx-voice-player"');
    expect(bubble).toContain('data-voice-id="vn-test-123"');
    expect(bubble).toContain('0:14');
    expect(bubble).toContain('E2EE OPUS PQC');
    expect(bubble).toContain('class="nx-voice-speed-btn"');
    expect(bubble).toContain('class="nx-wave-bar"');
  });

  it('binds audio players and controls speed cycle (1x -> 1.5x -> 2x)', () => {
    let speedHandler: (() => void) | null = null;
    const mockSpeedBtn: any = {
      dataset: { speed: '1' },
      textContent: '1x',
      addEventListener: (evt: string, cb: () => void) => {
        if (evt === 'click') speedHandler = cb;
      },
    };
    const mockPlayer: any = {
      dataset: {},
      getAttribute: (k: string) => (k === 'data-b64' ? samplePayload.audioBase64 : 'audio/webm'),
      querySelector: (sel: string) => {
        if (sel === '.nx-voice-speed-btn') return mockSpeedBtn;
        return null;
      },
      querySelectorAll: () => [],
    };
    const mockContainer: any = {
      querySelectorAll: (sel: string) => {
        if (sel === '.nx-voice-player') return [mockPlayer];
        return [];
      },
    };

    bindVoiceNotePlayers(mockContainer);

    expect(mockPlayer.dataset.bound).toBe('1');
    expect(speedHandler).not.toBeNull();

    // 1x -> 1.5x
    speedHandler!();
    expect(mockSpeedBtn.dataset.speed).toBe('1.5');
    expect(mockSpeedBtn.textContent).toBe('1.5x');

    // 1.5x -> 2x
    speedHandler!();
    expect(mockSpeedBtn.dataset.speed).toBe('2');
    expect(mockSpeedBtn.textContent).toBe('2x');

    // 2x -> 1x
    speedHandler!();
    expect(mockSpeedBtn.dataset.speed).toBe('1');
    expect(mockSpeedBtn.textContent).toBe('1x');
  });
});

describe('Advanced Search Query Parser (/api/search)', () => {
  it('extracts operators channel:, flair:, author:, has:code, merit:>', () => {
    const query = 'channel:crypto flair:release author:alice has:code merit:>25 post-quantum encryption';
    const parsed = parseServerSearchQuery(query);

    expect(parsed.channel).toBe('crypto');
    expect(parsed.flair).toBe('release');
    expect(parsed.author).toBe('alice');
    expect(parsed.onlyCode).toBe(true);
    expect(parsed.minMerit).toBe(25);
    expect(parsed.terms).toEqual(['post-quantum', 'encryption']);
  });

  it('handles query with only free terms', () => {
    const parsed = parseServerSearchQuery('sovereign distributed mesh');
    expect(parsed.channel).toBeUndefined();
    expect(parsed.onlyCode).toBe(false);
    expect(parsed.terms).toEqual(['sovereign', 'distributed', 'mesh']);
  });
});
