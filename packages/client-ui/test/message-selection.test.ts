import { describe, expect, it } from 'vitest';
import { captureMessageSelection, getMessageDraft, insertMessageEmoji, setMessageDraft } from '../src/messages-view.js';

describe('Message selection during DOM replacement', () => {
  it('ignores stale selection events from a removed input', () => {
    setMessageDraft('relay', 'hello');
    captureMessageSelection('relay', { value: 'hello', selectionStart: 0, selectionEnd: 0, isConnected: true } as HTMLInputElement);
    captureMessageSelection('relay', { value: 'stale draft', selectionStart: 11, selectionEnd: 11, isConnected: false } as HTMLInputElement);
    insertMessageEmoji('relay', ':)');
    expect(getMessageDraft('relay')).toBe(':)hello');
  });
});