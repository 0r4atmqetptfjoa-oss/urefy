import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('Public admin entry-point lockdown', () => {
  it('does not expose the admin dashboard from the public application bundle', () => {
    const main = source('../src/main.ts');
    const dispatcher = source('../src/ui/action-dispatcher.ts');

    expect(main).not.toContain('admin-dashboard');
    expect(main).not.toContain('adminDashboard');
    expect(dispatcher).not.toContain('admin-dashboard');
    expect(dispatcher).not.toContain('open-admin-console');
  });

  it('does not contain the old Ctrl+Alt+A admin shortcut', () => {
    const main = source('../src/main.ts');
    expect(main).not.toMatch(/altKey[\s\S]{0,120}admin/i);
    expect(main).not.toMatch(/['"]a['"][\s\S]{0,120}admin/i);
  });

  it('serves /admin through the gate instead of redirecting back to /admin.html', () => {
    const handler = source('../functions/admin.ts');
    expect(handler).toContain('handleAdminGate');
    expect(handler).not.toContain('status: 302');
    expect(handler).not.toContain("url.pathname = '/admin.html'");
  });

  it('keeps the admin page in the Vite build so it can be served behind Access', () => {
    const viteConfig = source('../vite.config.ts');
    expect(viteConfig).toContain('admin.html');
  });
});
