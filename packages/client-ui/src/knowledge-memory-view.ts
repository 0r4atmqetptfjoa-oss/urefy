import { knowledgeMemory, type KnowledgeMemory } from './knowledge-memory.js';
import { compileContextQuery } from './local-context-query.js';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const bindings = new WeakMap<HTMLElement, AbortController>();
// Only check results, never private text. Bounded and keyed to the snapshot version.
const integrityResults = new Map<string, string>();

function renderItem(item: KnowledgeMemory): string {
  const integrity = integrityResults.get(`${item.id}:${item.digest}`) || '';
  return `<article id="memory-item-${escape(item.id)}" class="memory-item" data-memory-id="${escape(item.id)}">
    <header><div><span class="context-eyebrow">${escape(item.source.kind)} · private snapshot${item.collection ? ` · ${escape(item.collection)}` : ''}</span><h3>${escape(item.title)}</h3></div>
      <time datetime="${new Date(item.savedAt).toISOString()}">${escape(new Date(item.savedAt).toLocaleDateString())}</time></header>
    <details><summary>Read saved context</summary><p class="memory-text">${escape(item.text)}</p></details>
    <div class="context-actions">${item.source.kind !== 'note' ? '<button type="button" class="context-button" data-memory-action="source">Open source</button>' : ''}<button type="button" class="context-button" data-memory-action="collect">Collection</button><button type="button" class="context-button" data-memory-action="remove">Remove snapshot</button></div>
    <details class="memory-provenance" ${integrity ? 'open' : ''}><summary>Provenance & integrity</summary><p>Source author: ${escape(item.source.author)}<br>Source date: ${escape(new Date(item.source.createdAt).toLocaleString())}<br>Saved on this device. Source access may change.</p><code>SHA-256 ${escape(item.digest)}</code><p>This checksum identifies the saved snapshot; it does not certify the source's claims.</p><button type="button" class="context-button" data-memory-action="verify">Check snapshot integrity</button><p data-memory-verification role="status">${escape(integrity)}</p></details>
  </article>`;
}

export function renderKnowledgeMemory(): string {
  return `<section class="knowledge-memory" aria-labelledby="memory-title"><header class="memory-heading"><div><span class="context-eyebrow">Your knowledge, with its context</span><h2 id="memory-title">Saved in Vault</h2><p>Your Vault contents are encrypted before leaving your device. Cloudflare stores encrypted data and limited operational metadata but cannot read your private Vault content.</p></div><button type="button" class="context-button" data-action="keep-note">Write a note</button></header>
    <label class="memory-search">Find in your knowledge<input id="memory-search" type="search" placeholder="Search text, author, or collection" autocomplete="off" aria-describedby="memory-search-help"></label>
    <p id="memory-search-help" class="context-help">Local search: &quot;exact phrase&quot;, -exclude, kind:post, author:name, collection:&quot;Reading list&quot;, after:2026-01-01, before:2027-01-01. Dates use UTC.</p>
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
      const query = (search?.value || '').trim();
      const match = compileContextQuery(query);
      const matches = items.filter(item => match({ text: [item.title, item.text, item.collection, item.source.author].join('\n'), author: item.source.author, kind: item.source.kind, collection: item.collection, createdAt: item.source.createdAt }));
      root.innerHTML = matches.length ? matches.map(renderItem).join('') : `<div class="memory-empty"><h3>${query ? 'No matching snapshots' : 'Keep the part worth returning to'}</h3><p>${query ? 'Try a different phrase or collection.' : 'Choose Keep on a message, or Keep in Vault on a branch. Its source travels with it.'}</p></div>`;
    };
    search?.addEventListener('input', render, { signal: controller.signal });
    render();
    root.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-memory-action]');
      const id = button?.closest<HTMLElement>('[data-memory-id]')?.dataset.memoryId;
      const item = items.find(item => item.id === id);
      if (!button || !item) return;
      button.disabled = true;
      void handleMemoryAction(button.dataset.memoryAction!, item, button).catch(async error => {
        const { clientStore } = await import('./client-state.js');
        clientStore.showToast(error instanceof Error ? error.message : 'Knowledge action failed', 'warning');
      }).finally(() => { button.disabled = false; });
    }, { signal: controller.signal });
  } catch (error) {
    if (root.isConnected && !controller.signal.aborted) root.innerHTML = `<p role="alert">${escape(error instanceof Error ? error.message : 'Knowledge is unavailable')}</p>`;
  }
}

async function handleMemoryAction(action: string, item: KnowledgeMemory, button: HTMLButtonElement): Promise<void> {
  const [{ sovereignDialog }, { clientStore }] = await Promise.all([import('./dialog-modal.js'), import('./client-state.js')]);
  if (action === 'verify') {
    const valid = await knowledgeMemory.verify(item.id);
    const result = valid ? 'Snapshot matches its saved checksum.' : 'Snapshot does not match its saved checksum. Treat this copy as unverified.';
    if (integrityResults.size >= 200) integrityResults.clear();
    integrityResults.set(`${item.id}:${item.digest}`, result);
    const article = document.getElementById(`memory-item-${item.id}`);
    const status = article?.querySelector('[data-memory-verification]');
    if (status) status.textContent = result;
    const details = article?.querySelector<HTMLDetailsElement>('.memory-provenance');
    if (details) details.open = true;
    return;
  } else if (action === 'remove') {
    if (!await sovereignDialog.confirm('Remove this saved snapshot? The original conversation or post stays available at its source.')) return;
    await knowledgeMemory.remove(item.id);
  } else if (action === 'collect') {
    const name = await sovereignDialog.prompt('Collection name (leave empty to remove from a collection)', { title: 'Organize saved knowledge', placeholder: item.collection || 'e.g. Privacy research' });
    if (name === null) return;
    await knowledgeMemory.collect(item.id, name);
  } else if (action === 'source') {
    if (item.source.peer) {
      if (item.source.kind === 'message') {
        const { openMessageContext } = await import('./context-navigation.js');
        await openMessageContext(item.source.peer, item.source.id);
        return;
      }
      const [{ sovereignDM }, { setActiveMessagesTab }, { sovereignRouter }] = await Promise.all([import('./sovereign-dm.js'), import('./messages-view.js'), import('./router.js')]);
      await sovereignDM.ready;
      if (!sovereignDM.getConversation(item.source.peer)) throw new Error('The source conversation is not available on this device');
      if (item.source.branchId && item.source.branchId !== 'main' && !sovereignDM.getBranches(item.source.peer).some(branch => branch.id === item.source.branchId)) throw new Error('The source branch is not available on this device');
      sovereignDM.activePeerFP = item.source.peer;
      sovereignDM.selectBranch(item.source.branchId || 'main');
      setActiveMessagesTab('dm');
      sovereignRouter.navigateTo('messages');
    } else if (item.source.kind === 'message' && item.source.channelId) {
      const [{ sovereignCircleEngine }, { communityView }, { sovereignRouter }, { focusContextTarget }] = await Promise.all([import('./sovereign-circle.js'), import('./community-view.js'), import('./router.js'), import('./context-navigation.js')]);
      const circle = sovereignCircleEngine.getAllCircles().find(circle => circle.channelId === item.source.channelId || `relays-${circle.name}` === item.source.channelId);
      if (!circle || !clientStore.messages.get(item.source.channelId)?.some(message => message.id === item.source.id)) throw new Error('The source community message is not available on this device');
      communityView.setActivePillar('live');
      sovereignRouter.navigateTo('communities', { subtab: circle.name });
      clientStore.activeChannelId = circle.channelId;
      clientStore.notifySync();
      if (!await focusContextTarget(`context-live-${item.source.id}`)) throw new Error('The source message could not be displayed');
      return;
    } else if (item.source.kind === 'post' || item.source.kind === 'comment') {
      const { openPostContext } = await import('./context-navigation.js');
      await openPostContext(item.source.postId || item.source.id, item.source.kind === 'comment' ? item.source.id : undefined);
      return;
    } else if (item.source.url) {
      window.open(item.source.url, '_blank', 'noopener,noreferrer');
    } else {
      clientStore.showToast('This note was created in your Vault.', 'info');
      return;
    }
  }
  clientStore.notifySync();
}
