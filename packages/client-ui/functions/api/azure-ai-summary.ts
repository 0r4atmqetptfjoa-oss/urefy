import type { Env } from './_db.js';

type SummaryEnv = Env & {
  AZURE_AI_API_URL?: string;
  UREFY_AI_SHARED_TOKEN?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
};

type PublicPostRow = { id: string; title: string; content: string };

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function onRequestPost(context: { request: Request; env: SummaryEnv }): Promise<Response> {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) return response({ error: 'origin_not_allowed' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return response({ error: 'json_required' }, 415);

  const hasDirectAzureAi = Boolean(env.AZURE_OPENAI_KEY);
  const hasProxyAzureAi = Boolean(env.AZURE_AI_API_URL && env.UREFY_AI_SHARED_TOKEN);
  if (!hasDirectAzureAi && !hasProxyAzureAi) return response({ error: 'azure_ai_unavailable' }, 503);

  const db = env.DB || env.AETHERIS_DB;
  if (!db) return response({ error: 'public_post_lookup_unavailable' }, 503);

  let postId = '';
  try {
    const body = await request.json() as { postId?: unknown };
    postId = typeof body.postId === 'string' ? body.postId.trim() : '';
  } catch {
    return response({ error: 'invalid_json' }, 400);
  }
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(postId)) return response({ error: 'invalid_post_id' }, 400);

  let post: PublicPostRow | null;
  try {
    post = await db.prepare(
      `SELECT id, title, content FROM posts
        WHERE id = ? AND audience = 'public'
          AND status IN ('published', 'pinned', 'locked')
        LIMIT 1`,
    ).bind(postId).first<PublicPostRow>();
  } catch {
    return response({ error: 'public_post_lookup_failed' }, 503);
  }
  if (!post) return response({ error: 'public_post_not_found' }, 404);

  const text = `${post.title}\n\n${post.content}`.trim();
  if (text.length < 20) return response({ error: 'post_too_short' }, 400);
  if (text.length > 8_000) return response({ error: 'post_too_long', maxCharacters: 8_000 }, 413);

  // Strategy 1: Direct Azure OpenAI call (e.g. gpt-5-mini with reasoning tokens headroom)
  if (hasDirectAzureAi && env.AZURE_OPENAI_KEY) {
    try {
      const endpoint = (env.AZURE_OPENAI_ENDPOINT || 'https://urefy.openai.azure.com').replace(/\/$/, '');
      const deployment = env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
      const prompt = `Summarize this public community post concisely in 2-3 sentences with key technical takeaways:\n\nTitle: ${post.title}\n\nContent:\n${post.content.slice(0, 3500)}`;

      const upstream = await fetch(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-10-21`,
        {
          method: 'POST',
          headers: {
            'api-key': env.AZURE_OPENAI_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            max_completion_tokens: 800,
          }),
          signal: AbortSignal.timeout(25_000),
        }
      );

      const aiJson = await upstream.json().catch(() => null) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      } | null;
      const summary = aiJson?.choices?.[0]?.message?.content?.trim();

      if (!upstream.ok || !summary) {
        const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502;
        return response({ error: aiJson?.error?.message || 'azure_summary_failed' }, status);
      }

      return response({ summary, cached: false, provider: 'azure-openai', model: deployment }, 200);
    } catch {
      return response({ error: 'azure_summary_unavailable' }, 503);
    }
  }

  // Strategy 2: Upstream proxy endpoint
  try {
    const upstream = await fetch(`${env.AZURE_AI_API_URL!.replace(/\/$/, '')}/api/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.UREFY_AI_SHARED_TOKEN}`,
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await upstream.json().catch(() => null) as { summary?: unknown; cached?: unknown; error?: string } | null;
    if (!upstream.ok || typeof payload?.summary !== 'string') {
      const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502;
      return response({ error: payload?.error || 'azure_summary_failed' }, status);
    }
    return response({ summary: payload.summary, cached: payload.cached === true }, 200);
  } catch {
    return response({ error: 'azure_summary_unavailable' }, 503);
  }
}
