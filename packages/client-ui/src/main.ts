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
import './styles/ui-pro-upgrades.css';
import './styles/app.css';
import { secureStorage } from './secure-storage.js';
import { initWebMCP } from './webmcp-init.js';

initWebMCP();

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

  void Promise.all([
    import('./search.js'),
    import('./dm-workspace.js'),
    import('./client-state.js'),
  ]).then(([{ SovereignOmniSearch }, { DmWorkspaceController }, { clientStore }]) => {
    const dmWorkspace = new DmWorkspaceController({
      getIdentity: async () => {
        const kp = clientStore.keypair;
        if (!kp) return null;
        let privHex = '';
        if (kp.privateKey) {
          privHex = Array.from(kp.privateKey, (b) => b.toString(16).padStart(2, '0')).join('');
        }
        return {
          fingerprint: kp.fingerprint,
          publicKeyHex: kp.publicKeyHex,
          privateKeyHex: privHex,
        };
      },
      notify: (msg, type) => {
        clientStore.showToast(msg, type === 'error' ? 'warning' : (type || 'info'));
      },
    });

    const omniSearch = new SovereignOmniSearch({
      getPosts: () =>
        clientStore.posts.map((p) => ({
          id: p.id,
          channelId: p.channelId,
          authorId: p.authorFingerprint,
          authorRole: p.authorRole,
          title: p.title,
          content: p.content,
          flair: p.flair,
          meritVotes: p.meritVotes,
          createdAt: p.createdAt,
        })),
      getChannels: () =>
        clientStore.channels.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          category: c.space,
          activeCount: 1,
        })),
      onSelectPost: (postId, channelId) => {
        if (channelId && channelId !== clientStore.activeChannelId) {
          clientStore.activeChannelId = channelId;
        }
        const post = clientStore.posts.find((p) => p.id === postId);
        if (post) {
          post.isExpanded = true;
          clientStore.notify();
          setTimeout(() => {
            document.querySelector(`[data-post-id="${postId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 80);
        }
      },
      onSelectChannel: (channelId) => {
        clientStore.activeChannelId = channelId;
        clientStore.notify();
      },
      onSelectUser: (fingerprint) => {
        dmWorkspace.openWithPeer(fingerprint);
      },
    });

    const headerSearchInput = document.getElementById('global-search-input') as HTMLInputElement | null;
    headerSearchInput?.addEventListener('focus', () => {
      omniSearch.openModal(headerSearchInput.value);
    });
    document.querySelectorAll('[data-open-command-rail], [data-action="open-command-rail"], #btn-open-command-rail, #btn-mobile-search-trigger, #btn-header-search, #btn-mobile-search').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        omniSearch.openModal();
      });
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        e.preventDefault();
        omniSearch.openModal();
      }
    });

    (window as any).dmWorkspace = dmWorkspace;
    (window as any).omniSearch = omniSearch;

    void import('./spatial-ui-2027.js').then(({ initSpatialUi2027 }) => {
      initSpatialUi2027({
        onOpenSearch: () => omniSearch.openModal(),
        onOpenChat: () => dmWorkspace.open(),
      });
    });
  });
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
