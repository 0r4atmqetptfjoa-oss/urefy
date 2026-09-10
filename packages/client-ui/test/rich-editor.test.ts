import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RichBlockEditor,
  richEditor,
  Block,
  BlockType,
  BlockMeta,
} from '../src/rich-editor.js';

describe('RichBlockEditor Notion/Obsidian Block Engine', () => {
  let editor: RichBlockEditor;

  beforeEach(() => {
    (globalThis as any).document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      createElement: vi.fn(() => ({
        innerHTML: '',
        style: {},
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) },
        appendChild: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    };
    editor = new RichBlockEditor();
  });

  // -------------------------------------------------------------------------
  // 1. Initialization & Defaults
  // -------------------------------------------------------------------------
  describe('Initialization & Seed Defaults', () => {
    it('initializes with seed default blocks', () => {
      const blocks = editor.getBlocks();
      expect(blocks.length).toBeGreaterThanOrEqual(7);

      const types = blocks.map((b) => b.type);
      expect(types).toContain('heading1');
      expect(types).toContain('paragraph');
      expect(types).toContain('callout');
      expect(types).toContain('math');
      expect(types).toContain('code');
      expect(types).toContain('poll');
      expect(types).toContain('diff');
      expect(types).toContain('quote');

      expect(editor.activeBlockId).toBe(blocks[0].id);
    });

    it('exports singleton instance richEditor', () => {
      expect(richEditor).toBeInstanceOf(RichBlockEditor);
      expect(richEditor.getBlocks().length).toBeGreaterThan(0);
    });

    it('getBlock returns the correct block by ID or undefined if not found', () => {
      const firstBlock = editor.getBlocks()[0];
      expect(editor.getBlock(firstBlock.id)).toEqual(firstBlock);
      expect(editor.getBlock('non-existent-id')).toBeUndefined();
    });

    it('clear() empties all blocks and inserts an initial blank paragraph', () => {
      editor.clear();
      const blocks = editor.getBlocks();
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].content).toBe('');
      expect(editor.activeBlockId).toBe(blocks[0].id);
    });

    it('setBlocks() replaces the block array and updates activeBlockId', () => {
      const customBlocks: Block[] = [
        { id: 'custom_1', type: 'heading1', content: 'Custom Title' },
        { id: 'custom_2', type: 'paragraph', content: 'Custom paragraph body' },
      ];
      editor.setBlocks(customBlocks);

      expect(editor.getBlocks()).toEqual(customBlocks);
      expect(editor.activeBlockId).toBe('custom_1');
    });

    it('setActiveBlock updates the active block ID', () => {
      editor.setActiveBlock('test_active_id');
      expect(editor.activeBlockId).toBe('test_active_id');
      editor.setActiveBlock(null);
      expect(editor.activeBlockId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Adding Blocks for all 12 Block Types
  // -------------------------------------------------------------------------
  describe('addBlock Operations across all Block Types', () => {
    beforeEach(() => {
      editor.setBlocks([]);
    });

    it('adds a paragraph block with default values', () => {
      const block = editor.addBlock('paragraph');
      expect(block.type).toBe('paragraph');
      expect(block.content).toBe('');
      expect(block.id).toBeDefined();
      expect(editor.activeBlockId).toBe(block.id);
    });

    it('adds a heading1 block with default title content', () => {
      const block = editor.addBlock('heading1');
      expect(block.type).toBe('heading1');
      expect(block.content).toBe('New Section Heading');
    });

    it('adds a heading2 block with default subtitle content', () => {
      const block = editor.addBlock('heading2');
      expect(block.type).toBe('heading2');
      expect(block.content).toBe('Hierarchical Subheading');
    });

    it('adds a code block with language and filename metadata', () => {
      const block = editor.addBlock('code');
      expect(block.type).toBe('code');
      expect(block.content).toContain('export const sovereignNode');
      expect(block.meta?.language).toBe('typescript');
      expect(block.meta?.showLineNumbers).toBe(true);
      expect(block.meta?.filename).toBe('source.ts');
    });

    it('adds a math block with displayMode metadata', () => {
      const block = editor.addBlock('math');
      expect(block.type).toBe('math');
      expect(block.content).toContain('\\int_');
      expect(block.meta?.displayMode).toBe(true);
    });

    it('adds a poll block with voting options and ZK encryption metadata', () => {
      const block = editor.addBlock('poll');
      expect(block.type).toBe('poll');
      expect(block.content).toContain('What is');
      expect(block.meta?.options).toBeDefined();
      expect(block.meta?.options?.length).toBeGreaterThanOrEqual(2);
      expect(block.meta?.votes).toBeDefined();
      expect(block.meta?.isEncrypted).toBe(true);
      expect(block.meta?.totalVotes).toBeGreaterThan(0);
    });

    it('adds a diff block with patch content and diffFilename metadata', () => {
      const block = editor.addBlock('diff');
      expect(block.type).toBe('diff');
      expect(block.content).toContain('--- a/config.ts');
      expect(block.meta?.diffFilename).toBe('changes.patch');
    });

    it('adds a callout block with info type, title, and icon metadata', () => {
      const block = editor.addBlock('callout');
      expect(block.type).toBe('callout');
      expect(block.meta?.calloutType).toBe('info');
      expect(block.meta?.title).toBe('Key Information');
      expect(block.meta?.icon).toBe('💡');
    });

    it('adds a quote block with author and source metadata', () => {
      const block = editor.addBlock('quote');
      expect(block.type).toBe('quote');
      expect(block.meta?.author).toBe('Sovereign Anonymous');
      expect(block.meta?.source).toBe('UREfy');
    });

    it('adds an image block with alt and caption metadata', () => {
      const block = editor.addBlock('image');
      expect(block.type).toBe('image');
      expect(block.content).toContain('http');
      expect(block.meta?.alt).toBeDefined();
      expect(block.meta?.caption).toBeDefined();
    });

    it('adds an embed block with embedType and provider metadata', () => {
      const block = editor.addBlock('embed');
      expect(block.type).toBe('embed');
      expect(block.content).toContain('http');
      expect(block.meta?.embedType).toBe('video');
    });

    it('adds a divider block with --- content', () => {
      const block = editor.addBlock('divider');
      expect(block.type).toBe('divider');
      expect(block.content).toBe('---');
    });

    it('inserts a block right after the specified afterId', () => {
      const b1 = editor.addBlock('paragraph');
      const b2 = editor.addBlock('heading1');
      const b3 = editor.addBlock('quote');

      // Insert between b1 and b2
      const inserted = editor.addBlock('code', b1.id);
      const blocks = editor.getBlocks();

      expect(blocks[0].id).toBe(b1.id);
      expect(blocks[1].id).toBe(inserted.id);
      expect(blocks[1].type).toBe('code');
      expect(blocks[2].id).toBe(b2.id);
      expect(blocks[3].id).toBe(b3.id);
    });

    it('appends to end if afterId does not match any existing block', () => {
      const b1 = editor.addBlock('paragraph');
      const inserted = editor.addBlock('math', 'non-existent-after-id');
      const blocks = editor.getBlocks();
      expect(blocks[blocks.length - 1].id).toBe(inserted.id);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Updating and Removing Blocks
  // -------------------------------------------------------------------------
  describe('updateBlock & removeBlock Operations', () => {
    it('updates content and metadata for an existing block', () => {
      const block = editor.addBlock('code');
      editor.updateBlock(block.id, 'const x: number = 100;', {
        language: 'rust',
        filename: 'main.rs',
      });

      const updated = editor.getBlock(block.id);
      expect(updated?.content).toBe('const x: number = 100;');
      expect(updated?.meta?.language).toBe('rust');
      expect(updated?.meta?.filename).toBe('main.rs');
    });

    it('does nothing when updateBlock is called on non-existent ID', () => {
      const initialCount = editor.getBlocks().length;
      editor.updateBlock('unknown_id', 'new content');
      expect(editor.getBlocks().length).toBe(initialCount);
    });

    it('removes a block by ID', () => {
      const block = editor.addBlock('quote');
      const initialCount = editor.getBlocks().length;

      editor.removeBlock(block.id);
      expect(editor.getBlock(block.id)).toBeUndefined();
      expect(editor.getBlocks().length).toBe(initialCount - 1);
    });

    it('updates activeBlockId when the active block is removed', () => {
      editor.setBlocks([]);
      const b1 = editor.addBlock('heading1');
      const b2 = editor.addBlock('paragraph');
      editor.setActiveBlock(b2.id);

      editor.removeBlock(b2.id);
      expect(editor.activeBlockId).toBe(b1.id);
    });

    it('creates a fallback default paragraph block when removing the last remaining block', () => {
      editor.clear(); // Leaves 1 paragraph
      const onlyBlock = editor.getBlocks()[0];
      editor.removeBlock(onlyBlock.id);

      const blocks = editor.getBlocks();
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe('paragraph');
    });

    it('gracefully handles removeBlock with non-existent ID', () => {
      const count = editor.getBlocks().length;
      editor.removeBlock('invalid_id');
      expect(editor.getBlocks().length).toBe(count);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Moving, Duplicating & Transforming Blocks
  // -------------------------------------------------------------------------
  describe('moveBlock, duplicateBlock & transformBlock', () => {
    it('moves block UP in the list', () => {
      editor.setBlocks([]);
      const b1 = editor.addBlock('heading1');
      const b2 = editor.addBlock('paragraph');
      const b3 = editor.addBlock('quote');

      editor.moveBlock(b3.id, 'up');
      let blocks = editor.getBlocks();
      expect(blocks[0].id).toBe(b1.id);
      expect(blocks[1].id).toBe(b3.id);
      expect(blocks[2].id).toBe(b2.id);

      // Move all the way to index 0
      editor.moveBlock(b3.id, 'up');
      blocks = editor.getBlocks();
      expect(blocks[0].id).toBe(b3.id);

      // Boundary: moving up from index 0 is a no-op
      editor.moveBlock(b3.id, 'up');
      expect(editor.getBlocks()[0].id).toBe(b3.id);
    });

    it('moves block DOWN in the list', () => {
      editor.setBlocks([]);
      const b1 = editor.addBlock('heading1');
      const b2 = editor.addBlock('paragraph');
      const b3 = editor.addBlock('quote');

      editor.moveBlock(b1.id, 'down');
      let blocks = editor.getBlocks();
      expect(blocks[0].id).toBe(b2.id);
      expect(blocks[1].id).toBe(b1.id);
      expect(blocks[2].id).toBe(b3.id);

      // Move to last position
      editor.moveBlock(b1.id, 'down');
      blocks = editor.getBlocks();
      expect(blocks[2].id).toBe(b1.id);

      // Boundary: moving down from last index is a no-op
      editor.moveBlock(b1.id, 'down');
      expect(editor.getBlocks()[2].id).toBe(b1.id);
    });

    it('does nothing when moveBlock is called on non-existent ID', () => {
      const before = [...editor.getBlocks()];
      editor.moveBlock('non_existent', 'up');
      expect(editor.getBlocks()).toEqual(before);
    });

    it('duplicates a block right after the source block with cloned content and metadata', () => {
      editor.setBlocks([]);
      const b1 = editor.addBlock('callout');
      editor.updateBlock(b1.id, 'Custom callout message', {
        title: 'Custom Warning',
        calloutType: 'warning',
      });

      const duplicated = editor.duplicateBlock(b1.id);
      expect(duplicated).not.toBeNull();
      expect(duplicated?.id).not.toBe(b1.id);
      expect(duplicated?.type).toBe('callout');
      expect(duplicated?.content).toBe('Custom callout message');
      expect(duplicated?.meta?.title).toBe('Custom Warning');
      expect(duplicated?.meta?.calloutType).toBe('warning');

      const blocks = editor.getBlocks();
      expect(blocks.length).toBe(2);
      expect(blocks[1].id).toBe(duplicated?.id);
      expect(editor.activeBlockId).toBe(duplicated?.id);
    });

    it('returns null when duplicateBlock is called on non-existent ID', () => {
      expect(editor.duplicateBlock('invalid_id')).toBeNull();
    });

    it('transforms a block to a new type while preserving content and merging default meta', () => {
      editor.setBlocks([]);
      const b1 = editor.addBlock('paragraph');
      editor.updateBlock(b1.id, 'Shared content text');

      editor.transformBlock(b1.id, 'code');
      const transformed = editor.getBlock(b1.id);

      expect(transformed?.type).toBe('code');
      expect(transformed?.content).toBe('Shared content text');
      expect(transformed?.meta?.language).toBe('typescript');
      expect(transformed?.meta?.showLineNumbers).toBe(true);
    });

    it('gracefully handles transformBlock on non-existent ID', () => {
      editor.transformBlock('invalid_id', 'heading1');
      expect(editor.getBlock('invalid_id')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 5. Markdown Export & Import
  // -------------------------------------------------------------------------
  describe('exportAsMarkdown & importFromMarkdown Roundtrip', () => {
    it('exports all block types to valid Markdown format', () => {
      editor.clear();
      editor.addBlock('heading1');
      editor.addBlock('heading2');
      editor.addBlock('paragraph');
      editor.addBlock('code');
      editor.addBlock('math');
      editor.addBlock('poll');
      editor.addBlock('diff');
      editor.addBlock('callout');
      editor.addBlock('quote');
      editor.addBlock('image');
      editor.addBlock('embed');
      editor.addBlock('divider');

      const md = editor.exportAsMarkdown();

      expect(md).toContain('# New Section Heading');
      expect(md).toContain('## Hierarchical Subheading');
      expect(md).toContain('```typescript');
      expect(md).toContain('$$');
      expect(md).toContain('[POLL:');
      expect(md).toContain('```diff');
      expect(md).toContain('> [!INFO]');
      expect(md).toContain('> Code is law');
      expect(md).toContain('![');
      expect(md).toContain('[Embed:');
      expect(md).toContain('---');
    });

    it('imports Markdown string and parses it into structured blocks', () => {
      const sampleMarkdown = `
# Test Main Heading

This is a plain text paragraph.

## Section Subheading

\`\`\`typescript
const aetheris = "sovereign";
\`\`\`

\`\`\`diff
--- a/main.ts
+++ b/main.ts
@@ -1,1 +1,2 @@
+const x = 10;
\`\`\`

$$
\\sum_{i=1}^n x_i
$$

> [!WARNING]
> This is a critical warning.

> Famous quote
> — *Satoshi Nakamoto*

![Diagram Image](https://example.com/image.png "Image Caption")

---
      `.trim();

      editor.importFromMarkdown(sampleMarkdown);
      const blocks = editor.getBlocks();

      expect(blocks.length).toBeGreaterThanOrEqual(8);

      const h1 = blocks.find((b) => b.type === 'heading1');
      expect(h1?.content).toBe('Test Main Heading');

      const h2 = blocks.find((b) => b.type === 'heading2');
      expect(h2?.content).toBe('Section Subheading');

      const p = blocks.find((b) => b.type === 'paragraph');
      expect(p?.content).toContain('This is a plain text paragraph');

      const code = blocks.find((b) => b.type === 'code');
      expect(code?.meta?.language).toBe('typescript');
      expect(code?.content).toContain('const aetheris');

      const diff = blocks.find((b) => b.type === 'diff');
      expect(diff?.content).toContain('--- a/main.ts');

      const math = blocks.find((b) => b.type === 'math');
      expect(math?.content).toContain('\\sum_{i=1}^n');

      const callout = blocks.find((b) => b.type === 'callout');
      expect(callout?.meta?.calloutType).toBe('warning');

      const quote = blocks.find((b) => b.type === 'quote');
      expect(quote?.meta?.author).toBe('Satoshi Nakamoto');

      const img = blocks.find((b) => b.type === 'image');
      expect(img?.content).toBe('https://example.com/image.png');
      expect(img?.meta?.alt).toBe('Diagram Image');
      expect(img?.meta?.caption).toBe('Image Caption');

      const divider = blocks.find((b) => b.type === 'divider');
      expect(divider?.content).toBe('---');
    });
  });

  // -------------------------------------------------------------------------
  // 6. HTML Export Engine
  // -------------------------------------------------------------------------
  describe('exportAsHTML Rendering System', () => {
    it('exports XSS-safe HTML with syntax highlighted code and MathML formulas', () => {
      editor.clear();
      const codeBlock = editor.addBlock('code');
      editor.updateBlock(codeBlock.id, 'const num: number = 42;\nconsole.log("UREfy");', {
        language: 'typescript',
        filename: 'app.ts',
      });

      const mathBlock = editor.addBlock('math');
      editor.updateBlock(mathBlock.id, '\\alpha + \\beta = \\gamma');

      const pollBlock = editor.addBlock('poll');
      editor.updateBlock(pollBlock.id, 'Consensus Proposal Vote?', {
        options: ['Yes', 'No'],
        votes: [10, 2],
        isEncrypted: true,
      });

      const diffBlock = editor.addBlock('diff');
      editor.updateBlock(diffBlock.id, '@@ -1,2 +1,2 @@\n-old();\n+new();', {
        diffFilename: 'patch.diff',
      });

      const calloutWarning = editor.addBlock('callout');
      editor.updateBlock(calloutWarning.id, 'Watch your keys', {
        calloutType: 'warning',
        title: 'Warning',
      });

      const html = editor.exportAsHTML();

      expect(html).toContain('aetheris-rendered-content');
      // Heading / Code check
      expect(html).toContain('app.ts');
      expect(html).toContain('text-aether'); // keyword color class
      expect(html).toContain('text-cyphr'); // builtin / variable color class
      // MathML check
      expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
      expect(html).toContain('α');
      expect(html).toContain('β');
      // Poll check
      expect(html).toContain('Consensus Proposal Vote?');
      expect(html).toContain('ZK-Anonymous');
      expect(html).toContain('10 votes');
      expect(html).toContain('83%'); // 10 / 12 ~ 83%
      // Diff check
      expect(html).toContain('patch.diff');
      expect(html).toContain('new();');
      expect(html).toContain('old();');
      expect(html).toContain('+1');
      expect(html).toContain('-1');
      // Callout check
      expect(html).toContain('Warning');
      expect(html).toContain('border-amber');
    });

    it('renders inline markdown inside paragraph HTML (bold, italic, code, links, del)', () => {
      editor.clear();
      const p = editor.addBlock('paragraph');
      editor.updateBlock(
        p.id,
        '**Bold Text** and *Italic Text* and `inline_code()` and ~~deleted~~ and [Site](https://aetheris.net)'
      );

      const html = editor.exportAsHTML();
      expect(html).toContain('<strong class="font-bold text-white">Bold Text</strong>');
      expect(html).toContain('<em class="italic text-slate-200">Italic Text</em>');
      expect(html).toContain('<code class="px-1.5 py-0.5 bg-surface-overlay text-cyphr rounded font-mono text-xs border border-white/5">inline_code()</code>');
      expect(html).toContain('<del class="line-through text-slate-500">deleted</del>');
      expect(html).toContain('<a href="https://aetheris.net"');
    });

    it('renders callout blocks with correct styling for danger, success, and info', () => {
      editor.clear();

      const cDanger = editor.addBlock('callout');
      editor.updateBlock(cDanger.id, 'Danger msg', { calloutType: 'danger', title: 'Fatal' });

      const cSuccess = editor.addBlock('callout');
      editor.updateBlock(cSuccess.id, 'Success msg', { calloutType: 'success', title: 'Great' });

      const html = editor.exportAsHTML();
      expect(html).toContain('border-crimson');
      expect(html).toContain('border-signal');
    });
  });

  // -------------------------------------------------------------------------
  // 7. UI Rendering: Editor, Slash Menu & Controls
  // -------------------------------------------------------------------------
  describe('renderEditor, renderSlashMenu & Block Components', () => {
    it('renders the complete editor container UI with header, canvas, preview drawer, and footer metrics', () => {
      const html = editor.renderEditor();

      expect(html).toContain('id="aetheris-rich-block-editor"');
      expect(html).toContain('Sovereign Rich Blocks Editor');
      expect(html).toContain('id="btn-editor-open-slash"');
      expect(html).toContain('id="btn-editor-toggle-preview"');
      expect(html).toContain('id="btn-editor-export-markdown"');
      expect(html).toContain('id="btn-editor-clear-all"');
      expect(html).toContain('id="rich-editor-blocks-container"');
      expect(html).toContain('id="btn-editor-add-bottom-block"');
      expect(html).toContain('id="rich-editor-preview-drawer"');
      expect(html).toContain('id="btn-editor-submit-post"');
      expect(html).toContain('Blocks:');
      expect(html).toContain('Words:');
    });

    it('renders the Slash Commands dropdown menu with categorized items and keyboard shortcuts', () => {
      const slashHtml = editor.renderSlashMenu();

      expect(slashHtml).toContain('id="rich-editor-slash-menu"');
      expect(slashHtml).toContain('Block Commands (/)');
      expect(slashHtml).toContain('Text & Formatting');
      expect(slashHtml).toContain('Crypto & Development');
      expect(slashHtml).toContain('Media & Structure');

      for (const cmd of editor.slashCommands) {
        expect(slashHtml).toContain(`data-slash-type="${cmd.type}"`);
        expect(slashHtml).toContain(cmd.label);
        expect(slashHtml).toContain(`/${cmd.shortcut}`);
      }
    });

    it('renders block controls bar with up/down disabled states on edge blocks', () => {
      editor.setBlocks([
        { id: 'b1', type: 'heading1', content: 'Title' },
        { id: 'b2', type: 'paragraph', content: 'Body' },
      ]);

      const controls1 = editor.renderBlockControls(editor.getBlocks()[0], 0);
      expect(controls1).toContain('btn-block-drag');
      expect(controls1).toContain('btn-block-move-up');
      expect(controls1).toContain('disabled'); // First item can't move up
      expect(controls1).toContain('btn-block-duplicate');
      expect(controls1).toContain('btn-block-delete');
      expect(controls1).toContain('select-block-transform');

      const controls2 = editor.renderBlockControls(editor.getBlocks()[1], 1);
      expect(controls2).toContain('btn-block-move-down');
      expect(controls2).toContain('disabled'); // Last item can't move down
    });

    it('renders editable block contents for heading, paragraph, code, math, poll, diff, callout, quote, image, embed, divider', () => {
      editor.clear();

      const h1 = editor.addBlock('heading1');
      expect(editor.renderBlockContent(h1)).toContain('class="block-content-input');

      const p = editor.addBlock('paragraph');
      expect(editor.renderBlockContent(p)).toContain('class="block-content-textarea');

      const code = editor.addBlock('code');
      expect(editor.renderBlockContent(code)).toContain('class="code-block-editor');
      expect(editor.renderBlockContent(code)).toContain('class="code-language-select');

      const math = editor.addBlock('math');
      expect(editor.renderBlockContent(math)).toContain('class="math-block-editor');
      expect(editor.renderBlockContent(math)).toContain('class="math-latex-textarea');

      const poll = editor.addBlock('poll');
      expect(editor.renderBlockContent(poll)).toContain('class="poll-block-editor');
      expect(editor.renderBlockContent(poll)).toContain('class="poll-question-input');

      const diff = editor.addBlock('diff');
      expect(editor.renderBlockContent(diff)).toContain('class="diff-block-editor');
      expect(editor.renderBlockContent(diff)).toContain('class="diff-raw-textarea');

      const callout = editor.addBlock('callout');
      expect(editor.renderBlockContent(callout)).toContain('class="callout-block-editor');
      expect(editor.renderBlockContent(callout)).toContain('class="callout-type-select');

      const quote = editor.addBlock('quote');
      expect(editor.renderBlockContent(quote)).toContain('class="quote-block-editor');
      expect(editor.renderBlockContent(quote)).toContain('class="quote-author-input');

      const img = editor.addBlock('image');
      expect(editor.renderBlockContent(img)).toContain('class="image-block-editor');
      expect(editor.renderBlockContent(img)).toContain('class="image-url-input');

      const embed = editor.addBlock('embed');
      expect(editor.renderBlockContent(embed)).toContain('class="embed-block-editor');
      expect(editor.renderBlockContent(embed)).toContain('class="embed-url-input');

      const divider = editor.addBlock('divider');
      expect(editor.renderBlockContent(divider)).toContain('class="divider-block-editor');
    });

    it('renders a block row wrapper with active styling when block is active', () => {
      editor.setBlocks([]);
      const b1 = editor.addBlock('heading1');
      editor.setActiveBlock(b1.id);

      const html = editor.renderBlock(b1, 0);
      expect(html).toContain(`id="block-wrapper-${b1.id}"`);
      expect(html).toContain('ring-cyphr/40');
      expect(html).toContain('btn-quick-add-block');
    });
  });

  // -------------------------------------------------------------------------
  // 8. attachEvents DOM Event Delegation & Interactivity
  // -------------------------------------------------------------------------
  describe('attachEvents Interactive DOM Bindings', () => {
    it('gracefully handles missing root element', () => {
      expect(() => editor.attachEvents(null as any)).not.toThrow();
    });

    it('attaches event listeners to mock DOM container without errors', () => {
      // Mock element with event listener interfaces for headless environments
      const mockElement = {
        querySelector: vi.fn((selector: string) => {
          if (selector === '#btn-editor-add-bottom-block') {
            return { addEventListener: vi.fn() };
          }
          if (selector === '#btn-editor-toggle-preview') {
            return { addEventListener: vi.fn() };
          }
          if (selector === '#btn-editor-export-markdown') {
            return { addEventListener: vi.fn() };
          }
          if (selector === '#btn-editor-clear-all') {
            return { addEventListener: vi.fn() };
          }
          if (selector === '#btn-editor-open-slash') {
            return { addEventListener: vi.fn() };
          }
          if (selector === '#rich-editor-slash-menu') {
            return { classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn() }, style: {} };
          }
          return null;
        }),
        querySelectorAll: vi.fn(() => []),
      } as unknown as HTMLElement;

      const updateCallback = vi.fn();
      expect(() => editor.attachEvents(mockElement, updateCallback)).not.toThrow();
      expect(mockElement.querySelector).toHaveBeenCalled();
      expect(mockElement.querySelectorAll).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 9. Strict HTML Sanitization & XSS Defense Security Suite
  // -------------------------------------------------------------------------
  describe('Strict HTML Sanitization & XSS Defense', () => {
    it('sanitizes script tags, javascript: hrefs, and malicious event handlers in inline markdown and blocks', () => {
      editor.setBlocks([
        {
          id: 'xss_1',
          type: 'paragraph',
          content: 'Click here [XSS Attack](javascript:alert(document.domain)) and [Data URI](data:text/html,<script>alert(1)</script>)',
        },
        {
          id: 'xss_2',
          type: 'heading1',
          content: '<script>alert("h1_xss")</script><img src=x onerror=alert(1)>',
        },
        {
          id: 'xss_3',
          type: 'embed',
          content: 'javascript:alert("embed_xss")',
        },
        {
          id: 'xss_4',
          type: 'image',
          content: 'javascript:alert("img_xss")',
          meta: { alt: '"><script>alert(1)</script>', caption: '<img src=x onerror=alert(2)>' },
        },
      ]);

      const html = editor.exportAsHTML();

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('href="javascript:');
      expect(html).not.toContain('href="data:');
      expect(html).not.toContain('src="javascript:');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;');
    });

    it('fuzzing: exports HTML safely with 50 randomized XSS vectors', () => {
      const xssVectors = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
        '"><script src=data:text/javascript,alert(1)>',
        '<a href="javascript:alert(1)">Click</a>',
        '[evil link](javascript:void(0))',
        '"><iframe src="javascript:alert(1)"></iframe>',
        '<style>@import"javascript:alert(1)";</style>',
        '<body onload=alert(1)>',
      ];

      for (let i = 0; i < 50; i++) {
        const payload = xssVectors[i % xssVectors.length];
        editor.setBlocks([
          { id: `fuzz_${i}`, type: 'paragraph', content: `Random fuzz ${i}: ${payload}` },
          { id: `fuzz_code_${i}`, type: 'code', content: payload, meta: { filename: payload } },
          { id: `fuzz_poll_${i}`, type: 'poll', content: payload, meta: { options: [payload, 'Clean option'] } },
        ]);

        const rendered = editor.exportAsHTML();
        expect(rendered).not.toContain('<script>');
        expect(rendered).not.toContain('<svg onload=');
        expect(rendered).not.toContain('href="javascript:');
      }
    });
  });
});
