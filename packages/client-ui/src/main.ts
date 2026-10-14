import './theme-boot.js';
import './style.css';
import './sovereign-console.css';
import './spatial.css';
import './premium.css';
import './orbit.css';
import './discovery.css';
import './context.css';
import './product.css';
import './profile/profile-workspace.css';
import './workspace-secondary.css';
import { secureStorage } from './secure-storage.js';



// An open tab can outlive the deployment that supplied its lazy chunks. Preserve
// the user's current form rather than replacing the page without their action.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (document.getElementById('workspace-update-notice')) return;
  const notice = document.createElement('div');
  notice.id = 'workspace-update-notice';
  notice.className = 'workspace-update-notice';
  notice.setAttribute('role', 'alert');
  const text = document.createElement('span');
  text.textContent = navigator.onLine ? 'This view needs the latest app files. Save your current work, then reload.' : 'This view is not available offline. Reconnect, then reload.';
  const reload = document.createElement('button');
  reload.type = 'button'; reload.textContent = 'Reload app';
  reload.addEventListener('click', () => window.location.reload());
  notice.append(text, reload); document.body.appendChild(notice);
});

const start = async () => {
  await secureStorage.init();
  const [{ initApp }, { installProductBranding }, { mobilePerformance }, { restoreWorkspaceLayout }] = await Promise.all([
    import('./app.js'), import('./brand.js'), import('./mobile-performance.js'), import('./workspace-layout.js'),
  ]);
  mobilePerformance.initViewportAdaptation();
  initApp();
  restoreWorkspaceLayout();
  installProductBranding();
  clearTimeout((window as Window & { __urefyBootTimer?: number }).__urefyBootTimer);
  document.documentElement.classList.remove('app-booting');
  document.getElementById('boot-shell')?.remove();
  void import('./ui/studio-runtime-fixes.js').then((m) => m.studioRuntime.init());
};

const begin = () => {
  console.info('[UREfy] Booting Sovereign Client v1.0.1');
  if (typeof window !== 'undefined' && window.location.hostname === 'urefy.com') {
    void import('./rum-monitor.js').then((m) => m.initUreFyRum()).catch(() => {});
  }
  void start().catch(() => {
    clearTimeout((window as Window & { __urefyBootTimer?: number }).__urefyBootTimer);
    document.documentElement.classList.remove('app-booting');
    document.getElementById('boot-shell')?.remove();
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

// UREfy Consumer Polish - Release v1.0.1

if (typeof window !== 'undefined') {
  const mountStudioRuntime = () => {
    void import('./ui/studio-runtime-fixes.js').then((m) => m.studioRuntime.init());
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountStudioRuntime);
  } else {
    mountStudioRuntime();
  }
}
