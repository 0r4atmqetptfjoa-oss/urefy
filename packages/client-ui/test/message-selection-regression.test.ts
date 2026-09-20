import { afterEach, expect, it, vi } from 'vitest';
import { captureMessageSelection, getMessageDraft, insertMessageEmoji, setMessageDraft } from '../src/messages-view.js';

afterEach(() => vi.unstubAllGlobals());

it('preserves selected text when a background render resets the unfocused editor caret', () => {
  const input = { value: 'hello world', selectionStart: 6, selectionEnd: 11, isConnected: true } as HTMLInputElement;
  const document = { activeElement: input as unknown };
  vi.stubGlobal('document', document);
  setMessageDraft('relay', input.value);
  captureMessageSelection('relay', input);
  document.activeElement = { id: 'emoji-toolbar' };
  input.selectionStart = 11;
  captureMessageSelection('relay', input);
  insertMessageEmoji('relay', '😊');
  expect(getMessageDraft('relay')).toBe('hello 😊');
});

it('honors an explicit selection event from an editor replaced during rendering', () => {
  const input = { value: 'hello world', selectionStart: 6, selectionEnd: 11, isConnected: true } as HTMLInputElement;
  vi.stubGlobal('document', { activeElement: {} });
  setMessageDraft('relay', input.value);
  captureMessageSelection('relay', input, true);
  insertMessageEmoji('relay', '😊');
  expect(getMessageDraft('relay')).toBe('hello 😊');
});
