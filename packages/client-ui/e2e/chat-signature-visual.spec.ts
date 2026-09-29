import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.cwd(), 'artifacts/chat-signature');
mkdirSync(output, { recursive: true });

test.use({ serviceWorkers: 'block' });

test('100-message dialogue stays readable across direct and community layouts', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    localStorage.setItem('aetheris_onboarding_completed', 'true');
    localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
    localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
    sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#app-top-header')).toBeVisible();
  await page.locator('[data-testid="nav-item-messages"]').click();
  await page.evaluate(() => {
    const store = (window as any).clientStore;
    const authors = ['a89104fa2211', 'f40019bc88a2', '9b22a011cd44', store.keypair.fingerprint];
    const lines = [
      'Did you review the mobile build? Recovery still looks strange.',
      'I found the issue. Testing the patch now.',
      'Send me the result when you are done.',
      'The smaller navigation feels much calmer on a phone.',
      'We should keep the conversation readable even after a busy day.',
      'A longer thought: people need to follow the decision, the reason behind it, and who will verify the next build. That context should stay attached to the conversation without becoming a wall of interface.',
      'Agreed. ◈',
      'Here is the next check: compare the two states, then share the result.',
    ];
    const start = Date.now() - 100 * 60_000;
    store.messages.set(store.activeChannelId, Array.from({ length: 100 }, (_, i) => ({
      id: `visual-community-${i}`, channelId: store.activeChannelId,
      authorFingerprint: authors[Math.floor(i / 2) % authors.length],
      text: i === 24 ? '# Context Capsule: Release decisions\n### Curator Note\nVerify the recovery flow before shipping.\n### Curated Messages (3)' : lines[i % lines.length],
      epoch: 'test', status: 'local-only', createdAt: start + i * 60_000,
      isMine: authors[Math.floor(i / 2) % authors.length] === store.keypair.fingerprint,
    })));
    store.notifySync();
  });
  await expect(page.locator('.relay-message')).toHaveCount(100);
  await page.locator('#messages-container').evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
  await page.screenshot({ path: resolve(output, 'community-desktop-dense.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, 'community-mobile-dense.png') });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-action="switch-messages-tab"][data-tab="dm"]').click();
  await page.screenshot({ path: resolve(output, 'direct-desktop-empty.png') });
  await page.evaluate(() => {
    const sovereignDM = (window as any).sovereignDM;
    const store = (window as any).clientStore;
    const me = store.keypair.fingerprint;
    const peer = 'a89104fa2211';
    const lines = [
      'Did you review the mobile build? Recovery still looks strange.',
      'I found the issue. Testing the patch now.',
      'Send me the result when you are done.',
      'The new flow has fewer boxes and more room to read.',
      'That sounds right. Can we preserve the context from yesterday?',
      'A longer thought: let us keep the decision and its reason visible. A dense conversation should remain easy to scan when you return after several hours away.',
      'Yes — I will share the verification result here. ◈',
    ];
    const start = Date.now() - 100 * 60_000;
    sovereignDM.conversations.set(peer, {
      peerFingerprint: peer, peerRole: 'MEMBER', unreadCount: 0, lastMessageAt: Date.now(),
      messages: Array.from({ length: 100 }, (_, i) => ({
        id: `visual-direct-${i}`, senderFP: i % 4 < 2 ? peer : me,
        receiverFP: i % 4 < 2 ? me : peer, encryptedPayload: '',
        plaintext: i === 24 ? '# Context Capsule: Release decisions\n### Curator Note\nVerify the recovery flow before shipping.\n### Curated Messages (3)' : lines[i % lines.length],
        timestamp: start + i * 60_000, isRead: true, deliveryStatus: 'sent',
        ...(i === 34 ? { context: { replyToId: 'visual-direct-31' } } : {}),
        ...(i === 48 ? { attachment: { name: 'voice_note_2026.webm', type: 'audio/webm', size: 1000, dataUrl: 'data:audio/webm;base64,GkXfo0AgQoaBAULygQRC84EIQoKEd2VibUJigQCGhVZQ' } } : {}),
      })),
    });
    sovereignDM.activePeerFP = peer;
    store.notifySync();
  });
  await expect(page.locator('.dm-message')).toHaveCount(100);
  await page.locator('#dm-thread-messages').evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
  await page.screenshot({ path: resolve(output, 'direct-desktop-dense.png') });
  const firstVisibleMessage = page.locator('.dm-message').nth(45);
  await firstVisibleMessage.hover();
  await firstVisibleMessage.getByLabel('More message actions').click();
  await expect(firstVisibleMessage.getByRole('button', { name: 'Branch conversation' })).toBeVisible();
  await page.locator('.editorial-capsule-insert').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'context-capsule-desktop.png') });
  await page.evaluate(() => {
    (window as any).contextCapsuleManager.openCreator('Direct with David Chen', [
      { id: 'visual-direct-1', senderName: 'David Chen', senderHandle: '@david_c', text: 'Did you review the mobile build?', timestamp: Date.now() - 9000 },
      { id: 'visual-direct-2', senderName: 'You', senderHandle: '@me', text: 'I found the issue. Testing the patch now.', timestamp: Date.now() - 6000 },
      { id: 'visual-direct-3', senderName: 'David Chen', senderHandle: '@david_c', text: 'Send me the result when you are done.', timestamp: Date.now() - 3000 },
    ]);
  });
  await expect(page.locator('#capsule-modal-backdrop')).toBeVisible();
  await page.screenshot({ path: resolve(output, 'capsule-creator-desktop.png') });
  await page.locator('#capsule-modal-backdrop [data-action="close-capsule-creator"]').first().click();
  await page.locator('[data-action="toggle-dm-context"]').first().click();
  await expect(page.locator('.dialogue-context-shelf')).toBeVisible();
  await page.screenshot({ path: resolve(output, 'context-shelf-desktop.png') });
  await page.locator('.dialogue-context-shelf [data-action="toggle-dm-context"]').click();
  await page.locator('[data-action="open-chat-search"]').first().click();
  await page.screenshot({ path: resolve(output, 'search-desktop.png') });
  await page.locator('[data-action="close-chat-search"]').click();
  await expect(page.locator('#chat-search-overlay')).toHaveCount(0);
  await expect(page.locator('.dialogue-audio')).toHaveCount(1);
  await page.evaluate(() => document.querySelector('.dialogue-audio')?.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: resolve(output, 'voice-message-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, 'direct-mobile-dense.png') });
  await page.locator('button[data-action="toggle-dm-emoji"]').last().click();
  await page.screenshot({ path: resolve(output, 'emoji-sheet-mobile.png') });
  await page.getByRole('button', { name: 'Close emoji picker' }).click();
  await page.locator('.dm-message').nth(45).dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 160, clientY: 320 });
  await page.waitForTimeout(460);
  await page.locator('.dm-message').nth(45).dispatchEvent('pointerup', { pointerType: 'touch', clientX: 160, clientY: 320 });
  await expect(page.locator('.dm-message').nth(45)).toBeFocused();
  await page.screenshot({ path: resolve(output, 'message-actions-mobile.png') });
  await page.locator('.dm-message').nth(45).getByRole('button', { name: 'Reply' }).click();
  await page.screenshot({ path: resolve(output, 'reply-mobile.png') });
  await page.evaluate(() => {
    (window as any).contextCapsuleManager.openCreator('Direct with David Chen', [
      { id: 'visual-direct-1', senderName: 'David Chen', senderHandle: '@david_c', text: 'Did you review the mobile build?', timestamp: Date.now() },
      { id: 'visual-direct-2', senderName: 'You', senderHandle: '@me', text: 'I found the issue. Testing the patch now.', timestamp: Date.now() },
    ]);
  });
  await page.screenshot({ path: resolve(output, 'capsule-mobile.png') });
  await page.locator('#capsule-modal-backdrop [data-action="close-capsule-creator"]').first().click();
  await page.locator('#input-dm-message').focus();
  await page.screenshot({ path: resolve(output, 'composer-focused-mobile.png') });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
