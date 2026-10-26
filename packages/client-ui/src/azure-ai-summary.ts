const MAX_RESULT_LENGTH = 6_000;

function ensureResultRegion(card: HTMLElement): HTMLElement {
  let region = card.querySelector<HTMLElement>('[data-azure-ai-result]');
  if (!region) {
    region = document.createElement('section');
    region.dataset.azureAiResult = 'true';
    region.className = 'mt-3 rounded-xl border border-cyphr/25 bg-surface-base/90 p-3 text-sm text-slate-200';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    card.querySelector('.social-post__content')?.append(region);
  }
  return region;
}

export async function summarizePublicPost(button: HTMLButtonElement, event: MouseEvent): Promise<void> {
  event.preventDefault();
  event.stopPropagation();

  const postId = button.dataset.postId || '';
  const card = button.closest<HTMLElement>('[data-post-card-id]');
  if (!postId || !card || button.dataset.busy === 'true') return;

  const region = ensureResultRegion(card);
  const previousLabel = button.textContent || 'Azure AI summary';
  button.dataset.busy = 'true';
  button.disabled = true;
  region.textContent = 'Sending this public post to Azure AI for a short summary…';

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 27_000);
    const response = await fetch('/api/azure-ai-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ postId }),
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer));
    const payload = await response.json().catch(() => null) as { summary?: unknown; error?: string; maxCharacters?: number } | null;
    if (!response.ok || typeof payload?.summary !== 'string') {
      if (payload?.error === 'monthly_limit_reached' || payload?.error === 'monthly_ai_budget_reached') {
        region.textContent = 'The Azure AI monthly limit has been reached. The local summary tools are still available.';
      } else if (payload?.error === 'post_too_long') {
        region.textContent = `This post is too long for the Azure summary limit (${payload.maxCharacters || 8_000} characters).`;
      } else {
        region.textContent = 'Azure AI could not summarize this post right now. Try again later.';
      }
      return;
    }
    region.textContent = payload.summary.slice(0, MAX_RESULT_LENGTH);
  } catch {
    region.textContent = 'Azure AI could not be reached right now. Try again later.';
  } finally {
    button.dataset.busy = 'false';
    button.disabled = false;
    button.textContent = previousLabel;
  }
}
