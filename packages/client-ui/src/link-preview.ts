// link-preview.ts
// Aetheris Omni-Sphere — Link Preview Card Engine
// Generates rich preview cards for URLs extracted from post content

import { isLocalDev } from './admin-auth.js';

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description: string;
  favicon: string;
  type: 'article' | 'github' | 'crypto' | 'video' | 'general';
}

class LinkPreviewEngine {
  readonly previewCache: Map<string, LinkPreview> = new Map();

  // ---------------------------------------------------------------------------
  // Known-domain metadata registry
  // ---------------------------------------------------------------------------
  private readonly KNOWN_DOMAINS: Record<string, Partial<LinkPreview>> = {
    'github.com': {
      favicon: '\uD83D\uDC19',
      type: 'github',
      description: 'Open-source repository hosted on GitHub.',
    },
    'gitlab.com': {
      favicon: '\uD83E\uDD8A',
      type: 'github',
      description: 'Repository or project hosted on GitLab.',
    },
    'arxiv.org': {
      favicon: '\uD83D\uDCC4',
      type: 'article',
      description: 'Academic preprint paper on arXiv.',
    },
    'cve.mitre.org': {
      favicon: '\uD83D\uDEE1\uFE0F',
      type: 'article',
      description: 'CVE vulnerability entry from MITRE.',
    },
    'nvd.nist.gov': {
      favicon: '\uD83D\uDD12',
      type: 'article',
      description: 'National Vulnerability Database entry.',
    },
    'exploit-db.com': {
      favicon: '\uD83D\uDCA3',
      type: 'article',
      description: 'Exploit code or PoC from Exploit-DB.',
    },
    'zero.day': {
      favicon: '\u2622\uFE0F',
      type: 'article',
      description: 'Zero-day vulnerability disclosure.',
    },
    'nostr.com': {
      favicon: '\uD83D\uDC26',
      type: 'general',
      description: 'Decentralized protocol relay note.',
    },
    'mastodon.social': {
      favicon: '\uD83E\uDDA3',
      type: 'general',
      description: 'Federated sovereign micro-pulse.',
    },
    'youtube.com': {
      favicon: '\u25B6\uFE0F',
      type: 'video',
      description: 'Video hosted on YouTube.',
    },
    'youtu.be': {
      favicon: '\u25B6\uFE0F',
      type: 'video',
      description: 'YouTube short-link video.',
    },
    'vimeo.com': {
      favicon: '\uD83C\uDFAC',
      type: 'video',
      description: 'Video hosted on Vimeo.',
    },
    'coinmarketcap.com': {
      favicon: '\uD83D\uDCC8',
      type: 'crypto',
      description: 'Cryptocurrency market data on CoinMarketCap.',
    },
    'coingecko.com': {
      favicon: '\uD83E\uDD8E',
      type: 'crypto',
      description: 'Token or coin data from CoinGecko.',
    },
    'etherscan.io': {
      favicon: '\uD83D\uDD37',
      type: 'crypto',
      description: 'Ethereum transaction or contract on Etherscan.',
    },
    'bscscan.com': {
      favicon: '\uD83D\uDFE1',
      type: 'crypto',
      description: 'BNB Chain transaction or contract on BscScan.',
    },
    'opensea.io': {
      favicon: '\uD83C\uDF0A',
      type: 'crypto',
      description: 'NFT listing or collection on OpenSea.',
    },
    'medium.com': {
      favicon: '\u270D\uFE0F',
      type: 'article',
      description: 'Article or blog post on Medium.',
    },
    'substack.com': {
      favicon: '\uD83D\uDCEC',
      type: 'article',
      description: 'Newsletter or post on Substack.',
    },
    'news.ycombinator.com': {
      favicon: '\uD83D\uDD3A',
      type: 'article',
      description: 'Hacker News submission or discussion.',
    },
    'matrix.org': {
      favicon: '\uD83D\uDCAC',
      type: 'general',
      description: 'Open standard for decentralized communication.',
    },
    'wikipedia.org': {
      favicon: '\uD83D\uDCD6',
      type: 'article',
      description: 'Wikipedia encyclopedia article.',
    },
    'stackoverflow.com': {
      favicon: '\uD83D\uDCE6',
      type: 'article',
      description: 'Question or answer on Stack Overflow.',
    },
    'docs.google.com': {
      favicon: '\uD83D\uDCDD',
      type: 'article',
      description: 'Shared Google Document.',
    },
    'pastebin.com': {
      favicon: '\uD83D\uDCCB',
      type: 'general',
      description: 'Code or text snippet from Pastebin.',
    },
    'gist.github.com': {
      favicon: '\uD83D\uDCDD',
      type: 'github',
      description: 'GitHub Gist code snippet.',
    },
    'huggingface.co': {
      favicon: '\uD83E\uDD17',
      type: 'article',
      description: 'AI model, dataset or Space on Hugging Face.',
    },
    'openai.com': {
      favicon: '\uD83E\uDD16',
      type: 'article',
      description: 'Resource or research from OpenAI.',
    },
    'cloudflare.com': {
      favicon: '\uD83C\uDF10',
      type: 'article',
      description: 'Cloudflare network or security resource.',
    },
    'shodan.io': {
      favicon: '\uD83D\uDC41\uFE0F',
      type: 'article',
      description: 'Device or vulnerability data from Shodan.',
    },
    'virustotal.com': {
      favicon: '\uD83E\uDDA0',
      type: 'article',
      description: 'File or URL analysis from VirusTotal.',
    },
  };

  // Seed 5 demo previews on construction (dev only)
  constructor() {
    if (isLocalDev()) {
      this._seedDemoPreviews();
    }
  }

  private _seedDemoPreviews(): void {
    const demos: LinkPreview[] = [
      {
        url: 'https://github.com/torvalds/linux',
        domain: 'github.com',
        title: 'torvalds/linux — The Linux Kernel',
        description:
          'The official Linux kernel source tree maintained by Linus Torvalds. Contributions welcome via mailing list.',
        favicon: '\uD83D\uDC19',
        type: 'github',
      },
      {
        url: 'https://arxiv.org/abs/2312.00752',
        domain: 'arxiv.org',
        title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces',
        description:
          'A new architecture for sequence modeling that achieves linear time complexity, outperforming transformers on long-range dependencies.',
        favicon: '\uD83D\uDCC4',
        type: 'article',
      },
      {
        url: 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-3094',
        domain: 'cve.mitre.org',
        title: 'CVE-2024-3094 — XZ Utils Backdoor',
        description:
          'Critical supply-chain backdoor in XZ Utils versions 5.6.0 and 5.6.1 affecting SSH authentication on affected Linux distributions.',
        favicon: '\uD83D\uDEE1\uFE0F',
        type: 'article',
      },
      {
        url: 'https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7',
        domain: 'etherscan.io',
        title: 'Tether USD (USDT) — Ethereum Token',
        description:
          'USDT ERC-20 token contract on Ethereum. View transactions, holders, and token analytics on Etherscan.',
        favicon: '\uD83D\uDD37',
        type: 'crypto',
      },
      {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        domain: 'youtube.com',
        title: 'Rick Astley — Never Gonna Give You Up (Official Video)',
        description:
          "The classic 1987 hit by Rick Astley, the song behind the internet's most beloved meme — the Rickroll.",
        favicon: '\u25B6\uFE0F',
        type: 'video',
      },
    ];

    for (const preview of demos) {
      this.previewCache.set(preview.url, preview);
    }
  }

  // URL extraction from free text
  extractUrls(text: string): string[] {
    const URL_REGEX =
      /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z]{2,}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*)/gi;
    const found: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = URL_REGEX.exec(text)) !== null) {
      const raw = match[0].replace(/[.,;:!?)"'\]]+$/, '');
      if (!seen.has(raw)) {
        seen.add(raw);
        found.push(raw);
      }
    }
    return found;
  }

  // Domain extraction
  private _extractDomain(url: string): string {
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, '');
    } catch {
      const m = url.match(/https?:\/\/(?:www\.)?([^/?#]+)/i);
      return m ? m[1] : url;
    }
  }

  // Type detection
  detectType(url: string, domain: string): 'article' | 'github' | 'crypto' | 'video' | 'general' {
    const knownMeta = this.KNOWN_DOMAINS[domain];
    if (knownMeta?.type) return knownMeta.type;
    const lowerUrl = url.toLowerCase();
    const lowerDomain = domain.toLowerCase();
    if (lowerDomain.includes('github') || lowerDomain.includes('gitlab') || lowerDomain.includes('bitbucket')) return 'github';
    if (lowerDomain.includes('youtube') || lowerDomain.includes('vimeo') || lowerDomain.includes('twitch') || lowerDomain.includes('youtu.be') || lowerUrl.includes('/watch?v=') || lowerUrl.includes('/video/')) return 'video';
    if (lowerDomain.includes('etherscan') || lowerDomain.includes('bscscan') || lowerDomain.includes('coingecko') || lowerDomain.includes('coinmarketcap') || lowerDomain.includes('opensea') || lowerDomain.includes('dexscreener') || lowerDomain.includes('uniswap') || lowerUrl.includes('/token/') || lowerUrl.includes('/address/') || lowerUrl.includes('/tx/')) return 'crypto';
    if (lowerDomain.includes('arxiv') || lowerDomain.includes('cve') || lowerDomain.includes('nvd.nist') || lowerDomain.includes('exploit-db') || lowerDomain.includes('medium') || lowerDomain.includes('substack') || lowerDomain.includes('wikipedia') || lowerDomain.includes('blog') || lowerUrl.includes('/article/') || lowerUrl.includes('/blog/') || lowerUrl.includes('/post/') || lowerUrl.includes('/paper/')) return 'article';
    return 'general';
  }

  // Favicon emoji per domain
  getFaviconEmoji(domain: string): string {
    const knownMeta = this.KNOWN_DOMAINS[domain];
    if (knownMeta?.favicon) return knownMeta.favicon;
    const d = domain.toLowerCase();
    if (d.includes('github') || d.includes('gitlab')) return '\uD83D\uDC19';
    if (d.includes('youtube') || d.includes('youtu.be')) return '\u25B6\uFE0F';
    if (d.includes('vimeo') || d.includes('twitch')) return '\uD83C\uDFAC';
    if (d.includes('etherscan') || d.includes('bscscan') || d.includes('polygonscan')) return '\uD83D\uDD37';
    if (d.includes('coingecko') || d.includes('coinmarketcap')) return '\uD83D\uDCC8';
    if (d.includes('opensea') || d.includes('nft')) return '\uD83C\uDF0A';
    if (d.includes('arxiv')) return '\uD83D\uDCC4';
    if (d.includes('cve') || d.includes('nvd')) return '\uD83D\uDEE1\uFE0F';
    if (d.includes('exploit')) return '\uD83D\uDCA3';
    if (d.includes('virus') || d.includes('malware')) return '\uD83E\uDDA0';
    if (d.includes('shodan')) return '\uD83D\uDC41\uFE0F';
    if (d.includes('wikipedia')) return '\uD83D\uDCD6';
    if (d.includes('medium') || d.includes('substack')) return '\u270D\uFE0F';
    if (d.includes('matrix')) return '\uD83D\uDCAC';
    if (d.includes('nostr')) return '\uD83D\uDC26';
    if (d.includes('mastodon') || d.includes('lemmy')) return '\uD83E\uDDA3';
    if (d.includes('telegram')) return '\u2708\uFE0F';
    if (d.includes('hugging')) return '\uD83E\uDD17';
    if (d.includes('openai') || d.includes('anthropic')) return '\uD83E\uDD16';
    if (d.includes('cloud') || d.includes('aws') || d.includes('azure')) return '\u2601\uFE0F';
    if (d.includes('docs') || d.includes('wiki')) return '\uD83D\uDCDA';
    if (d.includes('news') || d.includes('blog')) return '\uD83D\uDCF0';
    return '\uD83D\uDD17';
  }

  // Title from URL path
  private _generateTitleFromUrl(url: string, domain: string): string {
    try {
      const { pathname, searchParams } = new URL(url);
      if (domain === 'github.com' || domain === 'gitlab.com') {
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
      }
      if (domain === 'youtube.com') {
        const v = searchParams.get('v');
        if (v) return `YouTube \u2014 ${v}`;
      }
      const cveMatch = url.match(/(CVE-\d{4}-\d+)/i);
      if (cveMatch) return cveMatch[1].toUpperCase();
      const arxivMatch = pathname.match(/abs\/([\d.]+)/);
      if (arxivMatch) return `arXiv:${arxivMatch[1]}`;
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const last = segments[segments.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.\w+$/, '')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        if (last.length > 2) return last;
      }
    } catch { /* ignore */ }
    return domain;
  }

  // Description generation
  private _generateDescription(url: string, domain: string, type: LinkPreview['type']): string {
    const knownMeta = this.KNOWN_DOMAINS[domain];
    if (knownMeta?.description) return knownMeta.description;
    switch (type) {
      case 'github':  return `Open-source repository or project hosted on ${domain}.`;
      case 'video':   return `Video content hosted on ${domain}. Click to watch.`;
      case 'crypto':  return `Blockchain or crypto asset data from ${domain}.`;
      case 'article': return `Research, article, or documentation page on ${domain}.`;
      default:        return `External resource from ${domain}.`;
    }
  }

  // Main preview resolver (cache-first, then generate locally)
  getPreview(url: string): LinkPreview {
    if (this.previewCache.has(url)) return this.previewCache.get(url)!;
    const domain = this._extractDomain(url);
    const type = this.detectType(url, domain);
    const favicon = this.getFaviconEmoji(domain);
    const title = this._generateTitleFromUrl(url, domain);
    const description = this._generateDescription(url, domain, type);
    const preview: LinkPreview = { url, domain, title, description, favicon, type };
    this.previewCache.set(url, preview);
    return preview;
  }

  // XSS escape
  private _escape(raw: string): string {
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Type badge colour class
  private _typeBadgeClass(type: LinkPreview['type']): string {
    switch (type) {
      case 'github':  return 'text-signal';
      case 'crypto':  return 'text-amber';
      case 'video':   return 'text-crimson';
      case 'article': return 'text-cyphr';
      default:        return 'text-slate-400';
    }
  }

  /**
   * Renders a single link preview card as an HTML anchor element.
   */
  renderLinkPreviewCard(url: string): string {
    const preview = this.getPreview(url);
    const badgeClass = this._typeBadgeClass(preview.type);
    const safeUrl = this._escape(preview.url);
    const safeTitle = this._escape(preview.title);
    const safeDescription = this._escape(preview.description);
    const safeDomain = this._escape(preview.domain);
    const safeType = this._escape(preview.type);
    const safeFavicon = this._escape(preview.favicon);

    return (
      `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" ` +
      `class="block p-3 rounded-xl bg-surface-overlay border border-white/5 ` +
      `hover:border-cyphr/30 transition-all group my-2">` +
      `<div class="flex items-start space-x-3">` +
      `<span class="text-2xl select-none" aria-hidden="true">${safeFavicon}</span>` +
      `<div class="flex-1 min-w-0">` +
      `<div class="text-xs font-bold text-slate-100 group-hover:text-cyphr line-clamp-1">${safeTitle}</div>` +
      `<div class="text-xs text-slate-400 line-clamp-2 mt-0.5">${safeDescription}</div>` +
      `<div class="text-[10px] font-mono text-slate-500 mt-1">${safeDomain}</div>` +
      `</div>` +
      `<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised ` +
      `${badgeClass} border border-white/5 shrink-0 self-start">${safeType}</span>` +
      `</div>` +
      `</a>`
    );
  }

  /**
   * Extracts all URLs from text and returns an HTML wrapper with one preview
   * card per unique URL.  Returns empty string when no URLs are present.
   */
  renderAllPreviewsInText(text: string): string {
    const urls = this.extractUrls(text);
    if (urls.length === 0) return '';
    // Skip video URLs that are already rendered as rich player embeds
    const nonVideoUrls = urls.filter((url) => {
      const p = this.getPreview(url);
      return p.type !== 'video';
    });
    if (nonVideoUrls.length === 0) return '';
    const cards = nonVideoUrls.map((url) => this.renderLinkPreviewCard(url));
    return `<div class="mt-2 space-y-1 animate-in fade-in">${cards.join('')}</div>`;
  }
}

// Singleton export
export const linkPreviewEngine = new LinkPreviewEngine();
