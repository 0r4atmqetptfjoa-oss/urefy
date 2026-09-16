import { knowledgeMemory, type KnowledgeMemory } from './knowledge-memory.js';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const bindings = new WeakMap<HTMLElement, AbortController>();

function renderItem(item: KnowledgeMemory): string {
  return `<article class="memory-item" data-memory-id="${escape(item.id)}">
    <header><div><span class="context-eyebrow">${escape(item.source.kind)} · private snapshot${item.collection ? ` · ${escape(item.collection)}` : ''}</span><h3>${escape(item.title)}</h3></div>
      <time datetime="${new Date(item.savedAt).toISOString()}">${escape(new Date(item.savedAt).toLocaleDateString())}</time></header>
    <details><summary>Read saved context</summary><p class="memory-text">${escape(item.text)}</p></details>
    <div class="context-actions"><button type="button" class="context-button" data-memory-action="source">Open source</button><button type="button" class="context-button" data-memory-action="collect">Collection</button><button type="button" class="context-button" data-memory-action="remove">Remove snapshot</button></div>
    <details class="memory-provenance"><summary>Provenance & integrity</summary><p>Source author: ${escape(item.source.author)}<br>Source date: ${escape(new Date(item.source.createdAt).toLocaleString())}<br>Saved on this device. Source access may change.</p><code>SHA-256 ${item.digest}</code><p>This checksum identifies the saved snapshot; it does not certify the source's claims.</p></details>
  </article>`;
}

export function renderKnowledgeMemory(): string {
  return `<section class="knowledge-memory" aria-labelledby="memory-title"><header class="memory-heading"><div><span class="context-eyebrow">Your knowledge, with its context</span><h2 id="memory-title">Kept in Vault</h2><p>Encrypted snapshots on this device. Nothing is published or uploaded.</p></div><button type="button" class="context-button" data-action="keep-note">Write a note</button></header>
    <label class="memory-search">Find in your knowledge<input id="memory-search" type="search" placeholder="Search text, author, or collection" autocomplete="off"></label>
    <div id="memory-items" aria-live="polite"><p role="status">Opening encrypted knowledge…</p></div></section>`;
}

/** Called after a Vault render. Detached views never receive async results. */
export async function hydrateKnowledgeMemory(): Promise<void> {
  const root = document.getElementById('memory-items');
  if (!root) return;
  bindings.get(root)?.abort();
  const controller = new AbortController();
  bindings.set(root, controller);
  try {
    const items = await knowledgeMemory.list();
    if (!root.isConnected || controller.signal.aborted) return;
    const search = document.getElementById('memory-search') as HTMLInputElement | null;
    const render = () => {
      const query = (search?.value || '').trim().toLocaleLowerCase();
      const matches = items.filter(item => [item.title, item.text, item.collection, item.source.author].some(value => value.toLocaleLowerCase().includes(query)));
      root.innerHTML = matches.length ? matches.map(renderItem).join('') : `<div class="memory-empty"><h3>${query ? 'No matching snapshots' : 'Keep the part worth returning to'}</h3><p>${query ? 'Try a different phrase or collection.' : 'Choose Keep on a message, or Keep in Vault on a branch. Its source travels with it.'}</p></div>`;
    };
    search?.addEventListener('input', render, { signal: controller.signal });
    render();
    root.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-memory-action]');
      const id = button?.closest<HTMLElement>('[data-memory-id]')?.dataset.memoryId;
      const item = items.find(item => item.id === id);
      if (!button || !item) return;
      void handleMemoryAction(button.dataset.memoryAction!, item).catch(async error => {
        const { clientStore } = await import('./client-state.js');
        clientStore.showToast(error instanceof Error ? error.message : 'Knowledge action failed', 'warning');
      });
    }, { signal: controller.signal });
  } catch (error) {
    if (root.isConnected) root.innerHTML = `<p role="alert">${escape(error instanceof Error ? error.message : 'Knowledge is unavailable')}</p>`;
  }
}

async function handleMemoryAction(action: string, item: KnowledgeMemory): Promise<void> {
  const [{ sovereignDialog }, { clientStore }] = await Promise.all([import('./dialog-modal.js'), import('./client-state.js')]);
  if (action === 'remove') {
    if (!await sovereignDialog.confirm('Remove this saved snapshot? The original conversation or post stays available at its source.')) return;
    await knowledgeMemory.remove(item.id);
  } else if (action === 'collect') {
    const name = await sovereignDialog.prompt('Collection name (leave empty to remove from a collection)', { title: 'Organize saved knowledge', placeholder: item.collection || 'e.g. Privacy research' });
    if (name === null) return;
    await knowledgeMemory.collect(item.id, name);
  } else if (action === 'source') {
    if (item.source.peer) {
      const [{ sovereignDM }, { setActiveMessagesTab }, { sovereignRouter }] = await Promise.all([import('./sovereign-dm.js'), import('./messages-view.js'), import('./router.js')]);
      await sovereignDM.ready;
      if (!sovereignDM.getConversation(item.source.peer)) throw new Error('The source conversation is not available on this device');
      sovereignDM.activePeerFP = item.source.peer;
      sovereignDM.selectBranch(item.source.branchId || 'main');
      setActiveMessagesTab('dm');
      sovereignRouter.navigateTo('messages');
    } else if (item.source.kind === 'post') {
      const { postDetailView } = await import('./post-detail.js');
      postDetailView.openPost(item.source.id);
    } else if (item.source.url) {
      window.open(item.source.url, '_blank', 'noopener,noreferrer');
    } else {
      clientStore.showToast('This note was created in your Vault.', 'info');
      return;
    }
  }
  clientStore.notifySync();
}
