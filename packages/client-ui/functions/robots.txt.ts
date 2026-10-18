import { headHandler } from './_head.js';

const robots = `User-agent: *
Allow: /
Disallow: /api/admin
Disallow: /api/cron-backup

# Permisiuni explicite pentru Google Search & Google AI Overviews
User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

# Permisiuni explicite pentru Motoarele de Căutare AI (ChatGPT, Perplexity, Claude, Bing)
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: bingbot
Allow: /

Sitemap: https://urefy.com/sitemap.xml
`;

export const onRequestGet = () =>
  new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export const onRequestHead = headHandler(onRequestGet);
