import { expect, test, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createDmDatabase } from '../test/helpers/dm-database.js';
import { onRequestPost } from '../functions/api/governance.js';

test('two sessions publish, vote and reload server-confirmed governance', async ({ browser, baseURL }) => {
  const fixture = createDmDatabase();
  fixture.sqlite.exec(readFileSync(new URL('../migrations/0008_governance.sql', import.meta.url), 'utf8'));
  const contexts: BrowserContext[] = [];
  try {
    for (let index = 0; index < 2; index++) {
      const context = await browser.newContext({ baseURL, serviceWorkers: 'block', viewport: { width: 1440, height: 960 } });
      contexts.push(context);
      await context.addInitScript(() => {
        localStorage.setItem('aetheris_onboarding_completed', 'true');
        localStorage.setItem('aetheris_onboarding_completed_v4', 'true');
        localStorage.setItem('aetheris_ui_mode', 'sovereign');
        sessionStorage.setItem('aetheris_push_banner_dismissed', '1');
      });
      await context.route('**/api/governance', async route => {
        const request = route.request();
        const response = await onRequestPost({ env: { DB: fixture.database, ENVIRONMENT: 'production' },
          request: new Request(request.url(), { method: request.method(), body: request.postData(), headers: request.headers() }) });
        await route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' });
      });
    }
    const author = await contexts[0].newPage();
    const voter = await contexts[1].newPage();
    for (const page of [author, voter]) {
      await page.goto('/');
      await page.locator('#nav-btn-dao').click();
      await expect(page.locator('#governance-workspace')).toHaveAttribute('aria-busy', 'false');
    }
    await author.getByRole('button', { name: 'New proposal', exact: true }).click();
    await author.getByRole('textbox', { name: 'Title', exact: true }).fill('Shared governance regression');
    await author.getByRole('textbox', { name: 'Proposal', exact: true }).fill('A proposal stored by the actual signed API.');
    await author.getByRole('button', { name: 'Publish proposal', exact: true }).click();
    await expect(author.locator('#governance-vote-form')).toBeVisible();
    await voter.getByRole('button', { name: 'Refresh proposals', exact: true }).click();
    await voter.getByRole('button', { name: /Shared governance regression/ }).click();
    await voter.locator('[name="choice"][value="for"]').check();
    await voter.evaluate(() => (window as any).clientStore.notifySync());
    await expect(voter.locator('[name="choice"][value="for"]')).toBeChecked();
    await voter.getByRole('button', { name: 'Submit ballot', exact: true }).click();
    await expect(voter.locator('[data-governance-receipt]')).toHaveText('Server-confirmed ballot: for');
    await author.getByRole('button', { name: 'Refresh proposals', exact: true }).click();
    await expect(author.locator('[data-vote-total="for"]')).toHaveText('1');
    await voter.locator('[name="choice"][value="against"]').check();
    await voter.getByRole('button', { name: 'Update ballot', exact: true }).click();
    await expect(voter.locator('[data-governance-receipt]')).toHaveText('Server-confirmed ballot: against');
    await voter.reload();
    await voter.locator('#nav-btn-dao').click();
    await voter.getByRole('button', { name: /Shared governance regression/ }).click();
    await expect(voter.locator('[data-vote-total="for"]')).toHaveText('0');
    await expect(voter.locator('[data-vote-total="against"]')).toHaveText('1');
    await expect(voter.locator('[data-governance-receipt]')).toHaveText('Server-confirmed ballot: against');
    await expect(voter.locator('#governance-workspace')).not.toContainText('0xzk_snark');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM governance_votes').get()?.count).toBe(1);
    await voter.locator('#governance-modal-backdrop button[data-action="close-feature"]').click();
    await expect(voter.locator('#governance-workspace')).toBeHidden();
  } finally {
    await Promise.all(contexts.map(context => context.close()));
    fixture.sqlite.close();
  }
});