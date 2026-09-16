import { adminAuth } from './admin-auth.js';

async function api(action: string, values: object = {}, authenticated = false): Promise<any> {
  const response = await fetch('/api/admin', {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(authenticated ? { Authorization: `Bearer ${adminAuth.activePin}` } : {}) },
    body: JSON.stringify({ action, ...values }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Passkey request failed. Try again or use your PIN.');
  return data;
}

export async function signInWithAdminPasskey(): Promise<void> {
  const { startAuthentication } = await import('@simplewebauthn/browser');
  const { options, challengeId } = await api('passkey-challenge');
  const credential = await startAuthentication({ optionsJSON: options });
  const result = await api('passkey-verify', { credential, challengeId });
  if (!result.authorized || typeof result.token !== 'string') throw new Error('Passkey sign-in failed.');
  adminAuth.acceptPasskeySession(result.token);
}

export async function bindAdminPasskeySettings(): Promise<void> {
  const button = document.getElementById('btn-admin-add-passkey') as HTMLButtonElement | null;
  const status = document.getElementById('admin-passkey-status');
  const list = document.getElementById('admin-passkey-list');
  if (!button || !status || !list) return;
  const showError = (error: unknown) => { status.textContent = error instanceof Error ? error.message : 'Passkey request failed.'; };
  const refresh = async () => {
    const data = await api('passkey-list', {}, true);
    list.replaceChildren();
    if (!data.credentials.length) list.textContent = 'No admin passkeys registered on this site.';
    for (const key of data.credentials) {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-3 py-2 border-b border-white/10';
      const label = document.createElement('span');
      label.textContent = `Passkey ${key.credential_id.slice(0, 8)} · Added ${new Date(key.created_at).toLocaleDateString()}`;
      const remove = document.createElement('button');
      remove.textContent = 'Revoke';
      remove.className = 'text-amber px-3 py-2';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try {
          await api('passkey-revoke', { credentialId: key.credential_id }, true);
          status.textContent = 'Passkey revoked. Your PIN remains available.';
          await refresh();
        } catch (error) { showError(error); remove.disabled = false; }
      });
      row.append(label, remove);
      list.append(row);
    }
  };
  button.disabled = !window.PublicKeyCredential || !window.isSecureContext;
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Follow the prompt on your device…';
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const { options, challengeId } = await api('passkey-registration-options', {}, true);
      const credential = await startRegistration({ optionsJSON: options });
      await api('passkey-register', { credential, challengeId }, true);
      status.textContent = 'Passkey added. You can use it the next time you sign in.';
      await refresh();
    } catch (error) { showError(error); }
    finally { button.disabled = false; }
  });
  try { await refresh(); } catch (error) { showError(error); }
}
