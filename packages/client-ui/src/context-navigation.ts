/** Focus after reactive rendering, with a bounded observer and no selector interpolation. */
export async function focusContextTarget(id: string): Promise<boolean> {
  const focus = () => {
    const element = document.getElementById(id);
    if (!element) return false;
    element.tabIndex = -1;
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    element.focus({ preventScroll: true });
    return true;
  };
  if (focus()) return true;
  return new Promise(resolve => {
    const finish = (found: boolean) => { observer.disconnect(); clearTimeout(timer); resolve(found); };
    const observer = new MutationObserver(() => { if (focus()) finish(true); });
    const timer = setTimeout(() => finish(false), 2000);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export async function openMessageContext(peer: string, messageId: string): Promise<void> {
  const [{ sovereignDM }, { branchOf }, { setActiveMessagesTab }, { sovereignRouter }, { clientStore }] = await Promise.all([
    import('./sovereign-dm.js'), import('./conversation-context.js'), import('./messages-view.js'), import('./router.js'), import('./client-state.js'),
  ]);
  await sovereignDM.ready;
  const message = sovereignDM.getConversation(peer)?.messages.find(item => item.id === messageId && !item.context?.reaction);
  if (!message) throw new Error('The source message is not available on this device');
  sovereignDM.activePeerFP = peer;
  sovereignDM.selectBranch(branchOf(message));
  setActiveMessagesTab('dm');
  sovereignRouter.navigateTo('messages');
  clientStore.notifySync();
  if (!await focusContextTarget(`dm-message-${message.id}`)) throw new Error('The source message could not be displayed');
}

/** Loads a missing public source through its existing visibility-filtered API. */
export async function openPostContext(postId: string, commentId?: string, isCurrent: () => boolean = () => true): Promise<void> {
  if (!/^[a-z0-9:_-]{1,160}$/i.test(postId)) throw new Error('This post link is invalid');
  const [{ clientStore }, { postDetailView }, { threadManager }] = await Promise.all([import('./client-state.js'), import('./post-detail.js'), import('./threads.js')]);
  if (!clientStore.posts.some(post => post.id === postId)) {
    const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || data.post?.id !== postId || typeof data.post.content !== 'string' || typeof data.post.title !== 'string') {
      throw new Error('The original post is unavailable. A saved snapshot can still be read in your Vault.');
    }
    if (!isCurrent()) return;
    if (!clientStore.posts.some(post => post.id === postId)) clientStore.posts.push(data.post);
  }
  if (!isCurrent()) return;
  postDetailView.openPost(postId);
  clientStore.notifySync();
  if (commentId) {
    await threadManager.loadCommentsForPost(postId);
    if (!isCurrent() || postDetailView.activePostId !== postId) return;
    // Reveal only the ancestry of this source; leave unrelated collapsed threads alone.
    const reveal = (comments: ReturnType<typeof threadManager.getRootCommentsForPost>): boolean => comments.some(comment => {
      if (comment.id === commentId || reveal(comment.replies)) { postDetailView.collapsedComments.delete(comment.id); return true; }
      return false;
    });
    const found = reveal(threadManager.getRootCommentsForPost(postId));
    clientStore.notifySync();
    if (!found || !await focusContextTarget(`context-comment-${commentId}`)) clientStore.showToast('The discussion opened; this comment is not available in the loaded replies.', 'info');
  }
}
