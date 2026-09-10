/**
 * Admin Entry Point — Completely separate from the main user application.
 * Accessible only at /admin.html
 */
import './style.css';
import './premium.css';
import { secureStorage } from './secure-storage.js';

async function startAdmin(): Promise<void> {
	await secureStorage.init();
	const [{ initAdminApp }, { installProductBranding }] = await Promise.all([
		import('./admin-app.js'), import('./brand.js'), import('./admin.js'),
	]);
	initAdminApp();
	installProductBranding();
}

void startAdmin().catch(() => {
	const message = document.createElement('p');
	message.setAttribute('role', 'alert');
	message.textContent = 'Administration could not be initialized. Reload and try again.';
	document.body.appendChild(message);
});
