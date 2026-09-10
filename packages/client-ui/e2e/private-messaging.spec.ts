import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { onRequestPost } from '../functions/api/direct-messages.js';
import { resetReplayNonceCache } from '../functions/api/_auth.js';
import { createDmDatabase } from '../test/helpers/dm-database.js';

test('two independent sessions exchange encrypted messages and retain private history', async ({ browser, baseURL }) => {
  test.setTimeout(60000);
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

    await recipient.reload();
    await recipient.locator('[data-testid="nav-item-messages"]').click();
    await recipient.locator('[data-action="switch-messages-tab"][data-tab="dm"]').click();
    await expect(recipient.locator('#dm-thread-messages').getByText(text, { exact: true })).toBeVisible();
    await expect(recipient.locator('#dm-thread-messages').getByText(reply, { exact: true })).toBeVisible();
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
    fixture.sqlite.close();
  }
});