import './style.css';
import './premium.css';
import { secureStorage } from './secure-storage.js';

const start = async () => {
  await secureStorage.init();
  const [{ initApp }, { installProductBranding }, { mobilePerformance }, { restoreWorkspaceLayout }] = await Promise.all([
    import('./app.js'), import('./brand.js'), import('./mobile-performance.js'), import('./workspace-layout.js'),
  ]);
  mobilePerformance.initViewportAdaptation();
  initApp();
  restoreWorkspaceLayout();
  installProductBranding();
};

const begin = () => {
  void start().catch(() => {
    const root = document.getElementById('app');
    if (!root) return;
    root.replaceChildren();
    const message = document.createElement('p');
    message.textContent = 'The encrypted workspace could not be opened. Please reload and try again.';
    message.setAttribute('role', 'alert');
    const retry = document.createElement('button');
    retry.textContent = 'Reload';
    retry.addEventListener('click', () => window.location.reload());
    root.append(message, retry);
  });
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin, { once: true });
else begin();
