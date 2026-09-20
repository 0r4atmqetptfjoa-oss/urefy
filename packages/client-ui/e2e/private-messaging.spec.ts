import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { onRequestPost } from '../functions/api/direct-messages.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createDmDatabase } from '../test/helpers/dm-database.js';

test('two independent sessions exchange encrypted messages and retain private history', async ({ browser, baseURL }) => {
  test.setTimeout(120000);
  const fixture = createDmDatabase();
  resetReplayNonceCache();
  const contexts: BrowserContext[] = [];
  const setup = async (): Promise<Page> => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block' });
    contexts.push(context);
    await context.addInitScript(() => {
      localStorage.setItem('aetheris_onboarding_completed', 'true');
      localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
      localStorage.setItem('aetheris_proactive_ai_enabled', 'false');
      sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
    });
    const page = await context.newPage();
    await page.route('**/api/direct-messages', async route => {
      const body = route.request().postData() ?? '';
      const request = new Request(route.request().url(), { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });
      const response = await onRequestPost({ request, env: { DB: fixture.database, ENVIRONMENT: 'production' } });
      if (JSON.parse(body).payload.action === 'send') {
        await page.evaluate(() => (window as any).clientStore.notifySync());
      }
      await route.fulfill({ status: response.status, body: await response.text(), headers: { 'Content-Type': 'application/json' } });
    });
    await page.goto(baseURL!);
    await page.locator('[data-testid="nav-item-messages"]').click();
    await page.locator('[data-action="switch-messages-tab"][data-tab="dm"]').click();
    return page;
  };
  const openConversation = async (page: Page, fingerprint: string) => {
    await page.locator('[data-action="new-dm-conversation"]').first().click();
    await page.locator('#input-new-dm-peer').fill(fingerprint);
    await page.locator('[data-action="submit-new-dm-peer"]').click();
    await expect(page.locator('#input-dm-message')).toBeVisible();
  };

  try {
    const sender = await setup();
    const recipient = await setup();
    const senderFP = await sender.evaluate(() => (window as any).clientStore.keypair.fingerprint);
    const recipientFP = await recipient.evaluate(() => (window as any).clientStore.keypair.fingerprint);
    await expect.poll(() => fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM dm_identities').get()?.count).toBe(2);
    await openConversation(sender, recipientFP);
    await openConversation(recipient, senderFP);

    const text = 'Private browser delivery regression';
    await sender.locator('#input-dm-message').fill(text);
    await sender.locator('#input-dm-message').press('Enter');
    await expect(sender.locator('#input-dm-message')).toHaveValue('');
    await expect(sender.locator('#dm-thread-messages').getByText(text, { exact: true })).toBeVisible();
    await recipient.bringToFront();
    await expect(recipient.locator('#dm-thread-messages').getByText(text, { exact: true })).toBeVisible({ timeout: 20000 });

    const reply = 'Encrypted reply from the recipient';
    await recipient.locator('#input-dm-message').fill(reply);
    await recipient.locator('#input-dm-message').press('Enter');
    await expect(recipient.locator('#input-dm-message')).toHaveValue('');
    await sender.bringToFront();
    await expect(sender.locator('#dm-thread-messages').getByText(reply, { exact: true })).toBeVisible({ timeout: 20000 });
    expect(await sender.evaluate(marker => Object.values(localStorage).some(value => value.includes(marker)), text)).toBe(false);
    expect(fixture.sqlite.prepare('SELECT envelope_json FROM direct_messages LIMIT 1').get()?.envelope_json).not.toContain(text);

    // A branch preserves the source and travels inside the encrypted envelope.
    await sender.locator('.dm-message').filter({ hasText: text }).getByRole('button', { name: 'Branch', exact: true }).click();
    await sender.locator('#sovereign-dialog-root input').fill('Private reading plan');
    await sender.locator('#sovereign-dialog-confirm-btn').click();
    await expect(sender.locator('.context-trail').first()).toContainText(text);
    const branchText = 'Read the offline privacy guide together';
    await sender.locator('#input-dm-message').fill(branchText);
    await sender.locator('#input-dm-message').press('Enter');
    await expect(sender.locator('#input-dm-message')).toHaveValue('');
    await recipient.bringToFront();
    const branchButton = recipient.locator('[data-action="switch-dm-branch"]').filter({ hasText: 'Private reading plan' });
    await expect(branchButton).toBeVisible({ timeout: 20000 });
    await expect(branchButton.locator('[aria-label="Unread messages"]')).toBeVisible();
    await branchButton.click();
    await expect(recipient.locator('#dm-thread-messages')).toContainText(branchText);
    await expect(branchButton.locator('[aria-label="Unread messages"]')).toHaveCount(0);
    await recipient.locator('[data-action="keep-dm-branch"]').click();
    await expect(recipient.getByText('Kept in your encrypted Vault on this device.')).toBeVisible();
    await recipient.getByRole('button', { name: 'Return to source', exact: true }).click();
    await expect(recipient.locator('.dm-message').filter({ hasText: text })).toBeFocused();

    // Search points at the actual message, including its branch, rather than only a peer.
    await recipient.locator('#input-dm-search').fill('"offline privacy" -cloud');
    await recipient.locator('.context-search-result').filter({ hasText: branchText }).click();
    await expect(recipient.locator('.dm-message').filter({ hasText: branchText })).toBeFocused();
    await recipient.locator('#input-dm-search').fill('');
    const branchMessageId = await recipient.locator('.dm-message').filter({ hasText: branchText }).getAttribute('id');
    const branchMessage = recipient.locator(`#${branchMessageId}`);
    await branchMessage.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(recipient.getByText(`Replying to: ${branchText}`, { exact: true })).toBeVisible();
    await recipient.locator('#input-dm-message').fill('A contextual answer');
    await recipient.locator('#input-dm-message').press('Enter');
    await expect(recipient.locator('#input-dm-message')).toHaveValue('');
    await expect(recipient.locator('.context-quote-link')).toHaveText(branchText);
    await branchMessage.locator('summary').click();
    await branchMessage.getByRole('button', { name: 'React 👍', exact: true }).click();
    await expect(branchMessage.locator('[data-emoji="👍"][aria-pressed="true"]')).toContainText('1');
    expect(fixture.sqlite.prepare('SELECT envelope_json FROM direct_messages').all().some(row => String(row.envelope_json).includes(branchText))).toBe(false);

    await recipient.goto(`${baseURL}/#vault`);
    await expect(recipient.locator('.memory-item')).toContainText('Private reading plan');
    await recipient.locator('[data-memory-action="source"]').click();
    await expect(recipient.locator('#dm-thread-messages')).toContainText(branchText);

    await recipient.reload();
    await recipient.locator('[data-testid="nav-item-messages"]').click();
    await recipient.locator('[data-action="switch-messages-tab"][data-tab="dm"]').click();
    await expect(recipient.locator('#dm-thread-messages')).toContainText(branchText);
    await recipient.locator('[data-action="switch-dm-branch"][data-branch="main"]').click();
    await expect(recipient.locator('#dm-thread-messages').getByText(text, { exact: true })).toBeVisible();
    await expect(recipient.locator('#dm-thread-messages').getByText(reply, { exact: true })).toBeVisible();
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
    fixture.sqlite.close();
  }
});
