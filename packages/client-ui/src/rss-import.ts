/**
 * @file rss-import.ts
 * @package @aetheris/client-ui
 * @description Sovereign RSS / Atom Feed Aggregator & Threat Intelligence Monitor.
 * Provides real-time ingestion, manual and DOM XML parsing, category-based classification,
 * CORS proxy forwarding, and responsive cyber-themed UI components for UREfy.
 */

import { isDemoModeEnabled } from './demo-mode.js';
import { t } from './i18n.js';

/**
 * Interface representing a subscribed RSS/Atom feed source.
 */
export interface RSSFeed {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: 'security' | 'tech' | 'crypto' | 'research' | 'custom';
  lastFetched?: number;
  itemCount?: number;
  isActive: boolean;
}

/**
 * Interface representing an individual ingested feed item / intelligence entry.
 */
export interface RSSItem {
  id: string;
  feedId: string;
  title: string;
  link: string;
  description: string;
  pubDate: number;
  author?: string;
  tags?: string[];
  isRead: boolean;
  isBookmarked: boolean;
}

/**
 * Category metadata definitions for visual badges and filtering.
 */
interface CategoryMeta {
  label: string;
  icon: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  security: {
    label: 'Security Advisory',
    icon: '🛡️',
    colorClass: 'text-crimson',
    borderClass: 'border-crimson/30',
    bgClass: 'bg-crimson/10',
  },
  tech: {
    label: 'Tech News',
    icon: '💻',
    colorClass: 'text-cyphr',
    borderClass: 'border-cyphr/30',
    bgClass: 'bg-cyphr/10',
  },
  crypto: {
    label: 'Cryptography & ZK',
    icon: '🔐',
    colorClass: 'text-aether',
    borderClass: 'border-aether/30',
    bgClass: 'bg-aether/10',
  },
  research: {
    label: 'Research Papers',
    icon: '📄',
    colorClass: 'text-amber',
    borderClass: 'border-amber/30',
    bgClass: 'bg-amber/10',
  },
  custom: {
    label: 'Custom Stream',
    icon: '⚡',
    colorClass: 'text-signal',
    borderClass: 'border-signal/30',
    bgClass: 'bg-signal/10',
  },
};

/**
 * HTML sanitization helper to prevent XSS.
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes external URLs against malicious schemes (javascript:, data:, vbscript:)
 */
function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim().replace(/[\x00-\x1F\x7F]/g, '');
  const decoded = trimmed
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&colon;/gi, ':');

  const isSafeScheme = /^(https?:\/\/|mailto:|ipfs:\/\/|hyper:\/\/|magnet:\?|#|\/|\.\/)/i.test(decoded);
  const isDangerousScheme = /^(javascript|vbscript|data|blob|file|about):/i.test(decoded);

  if (!isSafeScheme || isDangerousScheme) {
    return '#';
  }
  return escapeHtml(trimmed);
}

/**
 * Strips HTML tags, CDATA wrappers, and HTML entities to produce clean excerpt text.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  let clean = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '--');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<\/?script[^>]*>/gi, '');
  clean = clean.replace(/<\/?[^>]+(>|$)/g, ' ');
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Parses diverse date string formats into standard Unix epoch milliseconds.
 */
function parseDateString(dateStr: string): number {
  if (!dateStr || dateStr.trim().length === 0) return Date.now();
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;
  const isoMatch = dateStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  if (isoMatch) {
    const isoParsed = Date.parse(isoMatch[0]);
    if (!isNaN(isoParsed)) return isoParsed;
  }
  return Date.now();
}

/**
 * Formats epoch timestamp into relative human-readable time.
 */
function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

/**
 * Formats epoch timestamp into precise ISO/local representation.
 */
function formatFullDate(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Generates a deterministic hash ID from a string.
 */
function computeHashId(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sovereign RSS / Atom Aggregator and Monitor Engine.
 */
export class RSSImporter {
  public feeds: RSSFeed[] = [];
  public items: RSSItem[] = [];

  public selectedCategory: string = 'all';
  public searchQuery: string = '';
  public isRefreshing: boolean = false;
  public lastSyncTime: number = Date.now();
  public showAddFeedModal: boolean = false;

  private readonly feedsStorageKey = 'aetheris_rss_feeds_v2';
  private readonly itemsStorageKey = 'aetheris_rss_items_v2';
  private readonly corsProxyUrl = 'https://api.allorigins.win/raw?url=';
  private autoRefreshTimerId: ReturnType<typeof setInterval> | null = null;

  /**
   * Initializes the RSS Importer engine, loading local state and initial demo items.
   */
  constructor() {
    this.initializeFeeds();
    this.initializeItems();
    this.startAutoRefreshSchedule();
  }

  /**
   * Pre-populates the default feeds list with premier cybersecurity & crypto intelligence sources.
   */
  private getDefaultFeeds(): RSSFeed[] {
    return [
      {
        id: 'feed-cve-mitre',
        url: 'https://cvefeed.io/rssfeed/latest.xml',
        title: 'CVE MITRE / NVD Disclosures',
        description: 'Real-time Common Vulnerabilities and Exposures advisory feed',
        category: 'security',
        lastFetched: Date.now() - 3600000 * 2,
        itemCount: 4,
        isActive: true,
      },
      {
        id: 'feed-krebs',
        url: 'https://krebsonsecurity.com/feed/',
        title: 'Krebs on Security',
        description: 'In-depth cybercrime investigations and digital forensics',
        category: 'security',
        lastFetched: Date.now() - 3600000 * 4,
        itemCount: 3,
        isActive: true,
      },
      {
        id: 'feed-schneier',
        url: 'https://www.schneier.com/feed/atom/',
        title: 'Schneier on Security',
        description: 'Bruce Schneier on cryptography, surveillance, and threat modeling',
        category: 'crypto',
        lastFetched: Date.now() - 3600000 * 5,
        itemCount: 3,
        isActive: true,
      },
      {
        id: 'feed-thehackernews',
        url: 'https://feeds.feedburner.com/TheHackersNews',
        title: 'The Hacker News',
        description: 'Global cybersecurity alerts, zero-day analysis, and exploits',
        category: 'tech',
        lastFetched: Date.now() - 3600000 * 1,
        itemCount: 4,
        isActive: true,
      },
      {
        id: 'feed-arxiv-cr',
        url: 'https://rss.arxiv.org/rss/cs.CR',
        title: 'arXiv cs.CR (Cryptography & Security)',
        description: 'Preprint research papers in cryptography, zero-knowledge, and protocol verification',
        category: 'research',
        lastFetched: Date.now() - 3600000 * 3,
        itemCount: 4,
        isActive: true,
      },
    ];
  }

  /**
   * Initializes feed configurations from localStorage or populates defaults.
   */
  private initializeFeeds(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.feedsStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.feeds = parsed;
            return;
          }
        }
      } catch (err) {
        console.warn('[RSSImporter] Failed to load feeds from localStorage:', err);
      }
    }
    this.feeds = this.getDefaultFeeds().map(({ lastFetched, itemCount, ...feed }) => ({ ...feed, itemCount: 0 }));
    this.saveFeeds();
  }

  /**
  * Initializes feed items from localStorage, with isolated test fixtures only.
   */
  private initializeItems(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.itemsStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.items = parsed;
            return;
          }
        }
      } catch (err) {
        console.warn('[RSSImporter] Failed to load items from localStorage:', err);
      }
    }
    this.items = isDemoModeEnabled() ? this.getDefaultSeedItems() : [];
    this.saveItems();
  }

  /**
   * Provides comprehensive seed intelligence items for immediate UI fidelity.
   */
  private getDefaultSeedItems(): RSSItem[] {
    const now = Date.now();
    return [
      {
        id: 'rss-item-cve-2026-9041',
        feedId: 'feed-cve-mitre',
        title: 'CVE-2026-9041: Remote Memory Corruption in Kernel WireGuard Handshake Implementation',
        link: 'https://nvd.nist.gov/vuln/detail/CVE-2026-9041',
        description: 'A buffer underflow vulnerability was discovered during ephemeral session key exchange in modular cryptosystem drivers, allowing unauthenticated network actors to trigger heap layout destabilization.',
        pubDate: now - 1000 * 60 * 42,
        author: 'MITRE / NIST NVD',
        tags: ['CVE', 'Memory-Safety', 'Kernel', 'CVSS-9.8'],
        isRead: false,
        isBookmarked: true,
      },
      {
        id: 'rss-item-cve-2026-8812',
        feedId: 'feed-cve-mitre',
        title: 'CVE-2026-8812: BGP Route Leak Side-Channel in Autonomous Boundary Gateways',
        link: 'https://nvd.nist.gov/vuln/detail/CVE-2026-8812',
        description: 'Incorrect validation of RPKI cryptographically signed origin attributes enables transient prefix hijacking under high-throughput convergence scenarios.',
        pubDate: now - 1000 * 60 * 180,
        author: 'National Cyber Security Group',
        tags: ['CVE', 'BGP', 'Routing', 'RPKI'],
        isRead: false,
        isBookmarked: false,
      },
      {
        id: 'rss-item-thn-1',
        feedId: 'feed-thehackernews',
        title: 'Zero-Click iOS Sandbox Bypass Leveraged in Targeted Nation-State Surveillance Campaign',
        link: 'https://thehackernews.com/2026/08/zero-click-ios-sandbox-bypass.html',
        description: 'Security researchers have unmasked an intricate zero-click exploit chain abusing font rendering rasterizers and Apple neural engine IPC handlers to achieve unconstrained Mach port escalation.',
        pubDate: now - 1000 * 60 * 75,
        author: 'Ravie Lakshmanan',
        tags: ['Zero-Day', 'Exploit', 'iOS', 'Forensics'],
        isRead: false,
        isBookmarked: true,
      },
      {
        id: 'rss-item-thn-2',
        feedId: 'feed-thehackernews',
        title: 'Critical Flaw in OpenSSL Post-Quantum ML-KEM Algorithm Implementation Patched',
        link: 'https://thehackernews.com/2026/08/critical-flaw-in-openssl-post-quantum.html',
        description: 'The OpenSSL project team has released emergency security advisories mitigating a timing side-channel present in Kyber/ML-KEM-768 lattice polynomial reduction routines.',
        pubDate: now - 1000 * 60 * 320,
        author: 'Mohit Kumar',
        tags: ['Post-Quantum', 'ML-KEM', 'Lattice', 'Advisory'],
        isRead: true,
        isBookmarked: false,
      },
      {
        id: 'rss-item-krebs-1',
        feedId: 'feed-krebs',
        title: 'Dissecting the Infrastructure of the "PhantomVault" Ransomware Syndicate',
        link: 'https://krebsonsecurity.com/2026/08/dissecting-phantomvault-ransomware/',
        description: 'An investigative teardown of bulletproof hosting nodes, stolen certificate authorities, and multi-signature coin mixers utilized by top-tier adversary groups.',
        pubDate: now - 1000 * 60 * 60 * 8,
        author: 'Brian Krebs',
        tags: ['Cybercrime', 'Ransomware', 'OSINT', 'Infrastructure'],
        isRead: false,
        isBookmarked: false,
      },
      {
        id: 'rss-item-schneier-1',
        feedId: 'feed-schneier',
        title: 'Post-Quantum Transition Realities and Symmetric Entropy Degradation',
        link: 'https://www.schneier.com/blog/archives/2026/08/post-quantum-realities.html',
        description: 'Thoughts on the practical challenges of hybrid classical/lattice cryptosystems, protocol agility, and why hardware security modules remain the Achilles heel of modern encryption.',
        pubDate: now - 1000 * 60 * 60 * 14,
        author: 'Bruce Schneier',
        tags: ['Cryptography', 'Quantum', 'Privacy', 'Essay'],
        isRead: false,
        isBookmarked: true,
      },
      {
        id: 'rss-item-arxiv-1',
        feedId: 'feed-arxiv-cr',
        title: 'ZK-Mesh: Recursive SNARKs for Asynchronous P2P Byzantine Fault Tolerance',
        link: 'https://arxiv.org/abs/2608.14092',
        description: 'We present ZK-Mesh, a novel consensus protocol establishing state transition finality through Halo2 proof folding schemes, achieving sub-second settlement in adversarial peer networks.',
        pubDate: now - 1000 * 60 * 60 * 22,
        author: 'Elena Vance, Marcus Thorne, David S. Chen',
        tags: ['arXiv', 'ZK-SNARK', 'P2P', 'Consensus'],
        isRead: false,
        isBookmarked: false,
      },
      {
        id: 'rss-item-arxiv-2',
        feedId: 'feed-arxiv-cr',
        title: 'Formal Verification of TreeKEM Messaging Protocols in Asynchronous MLS Environments',
        link: 'https://arxiv.org/abs/2608.13854',
        description: 'A mechanized formal verification in Coq demonstrating post-compromise security and forward secrecy guarantees in dynamic ratchet tree structures subjected to active network partitions.',
        pubDate: now - 1000 * 60 * 60 * 36,
        author: 'Sophia Lindqvist, Aris Thorne',
        tags: ['arXiv', 'TreeKEM', 'MLS', 'Formal-Verification'],
        isRead: true,
        isBookmarked: false,
      },
    ];
  }

  /**
   * Persists active feeds array to localStorage.
   */
  private saveFeeds(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.feedsStorageKey, JSON.stringify(this.feeds));
      } catch (err) {
        console.error('[RSSImporter] Failed to save feeds:', err);
      }
    }
  }

  /**
   * Persists feed items array to localStorage.
   */
  private saveItems(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.itemsStorageKey, JSON.stringify(this.items));
      } catch (err) {
        console.error('[RSSImporter] Failed to save items:', err);
      }
    }
  }

  /**
   * Starts recurring 15-minute background auto-refresh cycle.
   */
  private startAutoRefreshSchedule(): void {
    if (this.autoRefreshTimerId) {
      clearInterval(this.autoRefreshTimerId);
    }
    // Check every 15 minutes
    this.autoRefreshTimerId = setInterval(() => {
      this.refreshAllFeeds().catch(err => {
        console.warn('[RSSImporter] Auto-refresh sync cycle completed with warnings:', err);
      });
    }, 15 * 60 * 1000);
  }

  /**
   * Fetches an external RSS or Atom feed using CORS proxy fallback and parses the XML payload.
   */
  public async fetchFeed(feed: RSSFeed): Promise<RSSItem[]> {
    const targetUrl = feed.url.trim();
    if (!targetUrl) return [];

    const proxyTarget = `${this.corsProxyUrl}${encodeURIComponent(targetUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(proxyTarget, {
        method: 'GET',
        headers: {
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status} fetching feed: ${targetUrl}`);
      }

      const xmlText = await response.text();
      if (!xmlText || xmlText.trim().length === 0) {
        throw new Error(`Empty response payload received for feed: ${targetUrl}`);
      }

      // Auto-detect feed flavor
      const isAtom = xmlText.includes('<feed') || xmlText.includes('<entry') || xmlText.includes('http://www.w3.org/2005/Atom');
      const parsedItems = isAtom ? this.parseAtomXML(xmlText, feed.id) : this.parseRSSXML(xmlText, feed.id);

      feed.lastFetched = Date.now();
      feed.itemCount = parsedItems.length;

      // Merge new items without overwriting existing user read/bookmark flags
      this.mergeItems(parsedItems);
      this.saveFeeds();
      this.saveItems();

      return parsedItems;
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`[RSSImporter] Network/Proxy fetch failed for "${feed.title}" (${targetUrl}):`, error);
      // Update last fetched timestamp even on failure to avoid endless retry storm
      feed.lastFetched = Date.now();
      this.saveFeeds();
      return [];
    }
  }

  /**
   * Merges incoming parsed items with local store, preserving bookmarks and read statuses.
   */
  private mergeItems(newItems: RSSItem[]): void {
    const existingMap = new Map<string, RSSItem>();
    for (const item of this.items) {
      existingMap.set(item.id, item);
      if (item.link) {
        existingMap.set(item.link, item);
      }
    }

    for (const fresh of newItems) {
      const existing = existingMap.get(fresh.id) || (fresh.link ? existingMap.get(fresh.link) : undefined);
      if (existing) {
        existing.title = fresh.title || existing.title;
        existing.description = fresh.description || existing.description;
        existing.pubDate = fresh.pubDate || existing.pubDate;
        existing.tags = fresh.tags && fresh.tags.length > 0 ? fresh.tags : existing.tags;
      } else {
        this.items.unshift(fresh);
      }
    }

    // Sort descending by publication timestamp
    this.items.sort((a, b) => b.pubDate - a.pubDate);

    // Limit to latest 300 items to conserve memory
    if (this.items.length > 300) {
      this.items = this.items.slice(0, 300);
    }
  }

  /**
   * Parses RSS 2.0 / RSS 1.0 / RDF XML strings into structured RSSItem models.
   * Employs DOMParser if available, backed by complete regex/token parsing fallback.
   */
  public parseRSSXML(xml: string, feedId: string): RSSItem[] {
    const items: RSSItem[] = [];
    if (!xml) return items;

    // Strategy 1: Browser DOMParser
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const parserErrors = doc.getElementsByTagName('parsererror');

        if (parserErrors.length === 0) {
          const itemNodes = doc.getElementsByTagName('item');
          for (let i = 0; i < itemNodes.length; i++) {
            const node = itemNodes[i];
            const title = stripHtml(node.getElementsByTagName('title')[0]?.textContent || 'Untitled Advisory');
            const link = (node.getElementsByTagName('link')[0]?.textContent || '').trim();
            const desc = stripHtml(
              node.getElementsByTagName('description')[0]?.textContent ||
              node.getElementsByTagName('content:encoded')[0]?.textContent ||
              ''
            );
            const pubDateStr =
              node.getElementsByTagName('pubDate')[0]?.textContent ||
              node.getElementsByTagName('dc:date')[0]?.textContent ||
              '';
            const author =
              node.getElementsByTagName('dc:creator')[0]?.textContent ||
              node.getElementsByTagName('author')[0]?.textContent ||
              'Intelligence Relay';

            const categoryNodes = node.getElementsByTagName('category');
            const tags: string[] = [];
            for (let c = 0; c < categoryNodes.length; c++) {
              const tagText = stripHtml(categoryNodes[c].textContent || '').replace(/^#/, '');
              if (tagText && !tags.includes(tagText)) tags.push(tagText);
            }

            const guid = node.getElementsByTagName('guid')[0]?.textContent || link || `${feedId}-${title}-${i}`;
            const id = `rss-${computeHashId(guid)}`;

            items.push({
              id,
              feedId,
              title: title || 'Untitled Intelligence Item',
              link: link || '#',
              description: desc.slice(0, 480),
              pubDate: parseDateString(pubDateStr),
              author: stripHtml(author),
              tags: tags.length > 0 ? tags.slice(0, 5) : ['Advisory', 'CyberSec'],
              isRead: false,
              isBookmarked: false,
            });
          }

          if (items.length > 0) return items;
        }
      } catch (err) {
        console.warn('[RSSImporter] DOMParser RSS failed, falling back to manual regex parser:', err);
      }
    }

    // Strategy 2: Manual Regex/String Tokenizer Fallback
    const itemRegex = /<item[\s\S]*?<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[0];
      const titleMatch = block.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link[\s\S]*?>([\s\S]*?)<\/link>/i);
      const descMatch = block.match(/<(?:description|content:encoded)[\s\S]*?>([\s\S]*?)<\/(?:description|content:encoded)>/i);
      const pubDateMatch = block.match(/<(?:pubDate|dc:date)[\s\S]*?>([\s\S]*?)<\/(?:pubDate|dc:date)>/i);
      const authorMatch = block.match(/<(?:dc:creator|author)[\s\S]*?>([\s\S]*?)<\/(?:dc:creator|author)>/i);
      const guidMatch = block.match(/<guid[\s\S]*?>([\s\S]*?)<\/guid>/i);

      const rawTitle = titleMatch ? titleMatch[1] : 'Untitled Advisory';
      const rawLink = linkMatch ? linkMatch[1] : '#';
      const rawDesc = descMatch ? descMatch[1] : '';
      const rawPubDate = pubDateMatch ? pubDateMatch[1] : '';
      const rawAuthor = authorMatch ? authorMatch[1] : 'Security Dispatch';
      const rawGuid = guidMatch ? guidMatch[1] : rawLink;

      // Extract all categories
      const tagRegex = /<category[\s\S]*?>([\s\S]*?)<\/category>/gi;
      let tagMatch: RegExpExecArray | null;
      const tags: string[] = [];
      while ((tagMatch = tagRegex.exec(block)) !== null) {
        const cleanTag = stripHtml(tagMatch[1]).replace(/^#/, '');
        if (cleanTag && !tags.includes(cleanTag)) {
          tags.push(cleanTag);
        }
      }

      const id = `rss-${computeHashId(rawGuid || rawTitle)}`;

      items.push({
        id,
        feedId,
        title: stripHtml(rawTitle),
        link: stripHtml(rawLink).trim(),
        description: stripHtml(rawDesc).slice(0, 480),
        pubDate: parseDateString(rawPubDate),
        author: stripHtml(rawAuthor),
        tags: tags.length > 0 ? tags.slice(0, 5) : ['Advisory'],
        isRead: false,
        isBookmarked: false,
      });
    }

    return items;
  }

  /**
   * Parses Atom 1.0 XML strings into structured RSSItem models.
   * Employs DOMParser if available, backed by manual regex parser fallback.
   */
  public parseAtomXML(xml: string, feedId: string): RSSItem[] {
    const items: RSSItem[] = [];
    if (!xml) return items;

    // Strategy 1: Browser DOMParser
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        const parserErrors = doc.getElementsByTagName('parsererror');

        if (parserErrors.length === 0) {
          const entryNodes = doc.getElementsByTagName('entry');
          for (let i = 0; i < entryNodes.length; i++) {
            const entry = entryNodes[i];
            const title = stripHtml(entry.getElementsByTagName('title')[0]?.textContent || 'Untitled Atom Entry');

            // Find link
            let link = '';
            const linkNodes = entry.getElementsByTagName('link');
            for (let l = 0; l < linkNodes.length; l++) {
              const href = linkNodes[l].getAttribute('href');
              const rel = linkNodes[l].getAttribute('rel');
              if (href && (!rel || rel === 'alternate')) {
                link = href;
                break;
              }
            }
            if (!link && linkNodes.length > 0) {
              link = linkNodes[0].getAttribute('href') || linkNodes[0].textContent || '';
            }

            const desc = stripHtml(
              entry.getElementsByTagName('summary')[0]?.textContent ||
              entry.getElementsByTagName('content')[0]?.textContent ||
              ''
            );
            const pubDateStr =
              entry.getElementsByTagName('published')[0]?.textContent ||
              entry.getElementsByTagName('updated')[0]?.textContent ||
              '';
            const author =
              entry.getElementsByTagName('author')[0]?.getElementsByTagName('name')[0]?.textContent ||
              entry.getElementsByTagName('author')[0]?.textContent ||
              'Cryptographic Intelligence';

            const categoryNodes = entry.getElementsByTagName('category');
            const tags: string[] = [];
            for (let c = 0; c < categoryNodes.length; c++) {
              const term = categoryNodes[c].getAttribute('term') || categoryNodes[c].textContent || '';
              const cleanTag = stripHtml(term).replace(/^#/, '');
              if (cleanTag && !tags.includes(cleanTag)) tags.push(cleanTag);
            }

            const idVal = entry.getElementsByTagName('id')[0]?.textContent || link || `${feedId}-${title}-${i}`;
            const id = `atom-${computeHashId(idVal)}`;

            items.push({
              id,
              feedId,
              title: title || 'Untitled Intelligence Bulletin',
              link: link || '#',
              description: desc.slice(0, 480),
              pubDate: parseDateString(pubDateStr),
              author: stripHtml(author),
              tags: tags.length > 0 ? tags.slice(0, 5) : ['Atom', 'Research'],
              isRead: false,
              isBookmarked: false,
            });
          }

          if (items.length > 0) return items;
        }
      } catch (err) {
        console.warn('[RSSImporter] DOMParser Atom failed, falling back to manual regex parser:', err);
      }
    }

    // Strategy 2: Manual Regex Parser Fallback
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    let match: RegExpExecArray | null;

    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[0];
      const titleMatch = block.match(/<title[\s\S]*?>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link[\s\S]*?href=["'](.*?)["']/i) || block.match(/<link[\s\S]*?>([\s\S]*?)<\/link>/i);
      const descMatch = block.match(/<(?:summary|content)[\s\S]*?>([\s\S]*?)<\/(?:summary|content)>/i);
      const pubDateMatch = block.match(/<(?:published|updated)[\s\S]*?>([\s\S]*?)<\/(?:published|updated)>/i);
      const authorMatch = block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i) || block.match(/<author>([\s\S]*?)<\/author>/i);
      const idMatch = block.match(/<id[\s\S]*?>([\s\S]*?)<\/id>/i);

      const rawTitle = titleMatch ? titleMatch[1] : 'Untitled Research Paper';
      const rawLink = linkMatch ? linkMatch[1] : '#';
      const rawDesc = descMatch ? descMatch[1] : '';
      const rawPubDate = pubDateMatch ? pubDateMatch[1] : '';
      const rawAuthor = authorMatch ? authorMatch[1] : 'Research Collective';
      const rawId = idMatch ? idMatch[1] : rawLink;

      const tagRegex = /<category[\s\S]*?term=["'](.*?)["']/gi;
      let tagMatch: RegExpExecArray | null;
      const tags: string[] = [];
      while ((tagMatch = tagRegex.exec(block)) !== null) {
        const cleanTag = stripHtml(tagMatch[1]).replace(/^#/, '');
        if (cleanTag && !tags.includes(cleanTag)) {
          tags.push(cleanTag);
        }
      }

      const id = `atom-${computeHashId(rawId || rawTitle)}`;

      items.push({
        id,
        feedId,
        title: stripHtml(rawTitle),
        link: stripHtml(rawLink).trim(),
        description: stripHtml(rawDesc).slice(0, 480),
        pubDate: parseDateString(rawPubDate),
        author: stripHtml(rawAuthor),
        tags: tags.length > 0 ? tags.slice(0, 5) : ['Research'],
        isRead: false,
        isBookmarked: false,
      });
    }

    return items;
  }

  /**
   * Refreshes all active RSS and Atom feeds in parallel.
   */
  public async refreshAllFeeds(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.lastSyncTime = Date.now();

    const activeFeeds = this.feeds.filter(f => f.isActive);

    try {
      const results = await Promise.allSettled(
        activeFeeds.map(feed => this.fetchFeed(feed))
      );

      let successCount = 0;
      results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
      });

      console.info(`[RSSImporter] Sync completed: ${successCount}/${activeFeeds.length} feeds successfully updated.`);
    } catch (err) {
      console.error('[RSSImporter] Error during refreshAllFeeds cycle:', err);
    } finally {
      this.isRefreshing = false;
      this.saveFeeds();
      this.saveItems();
    }
  }

  /**
   * Subscribes to a new feed URL with category classification and optional metadata.
   */
  public addFeed(url: string, category: string, title?: string, description?: string): void {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    // Avoid duplicate URLs
    const existing = this.feeds.find(f => f.url.toLowerCase() === cleanUrl.toLowerCase());
    if (existing) {
      existing.isActive = true;
      this.saveFeeds();
      this.fetchFeed(existing);
      return;
    }

    const validCategory = (['security', 'tech', 'crypto', 'research', 'custom'].includes(category)
      ? category
      : 'custom') as RSSFeed['category'];

    const inferredTitle = title && title.trim().length > 0
      ? title.trim()
      : `Feed: ${cleanUrl.replace(/^https?:\/\//i, '').split('/')[0]}`;

    const newFeed: RSSFeed = {
      id: `feed-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: cleanUrl,
      title: inferredTitle,
      description: description || 'Custom external threat intelligence relay',
      category: validCategory,
      lastFetched: undefined,
      itemCount: 0,
      isActive: true,
    };

    this.feeds.push(newFeed);
    this.saveFeeds();

    // Trigger immediate background ingestion
    this.fetchFeed(newFeed).catch(err => {
      console.warn('[RSSImporter] Initial fetch on added feed failed:', err);
    });
  }

  /**
   * Unsubscribes and permanently removes a feed and its orphaned items.
   */
  public removeFeed(id: string): void {
    this.feeds = this.feeds.filter(f => f.id !== id);
    this.items = this.items.filter(item => item.feedId !== id);
    this.saveFeeds();
    this.saveItems();
  }

  /**
   * Toggles the active monitoring status of a feed without deleting history.
   */
  public toggleFeedActive(id: string): void {
    const feed = this.feeds.find(f => f.id === id);
    if (feed) {
      feed.isActive = !feed.isActive;
      this.saveFeeds();
      if (feed.isActive) {
        this.fetchFeed(feed);
      }
    }
  }

  /**
   * Marks a specific intelligence item as read.
   */
  public markAsRead(itemId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.isRead = true;
      this.saveItems();
    }
  }

  /**
   * Toggles bookmark / star state for an item.
   */
  public toggleBookmark(itemId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.isBookmarked = !item.isBookmarked;
      this.saveItems();
    }
  }

  /**
   * Marks all items in the current view or specified category/feed as read.
   */
  public markAllAsRead(feedIdOrCategory?: string): void {
    for (const item of this.items) {
      if (!feedIdOrCategory || feedIdOrCategory === 'all') {
        item.isRead = true;
      } else {
        const feed = this.feeds.find(f => f.id === item.feedId);
        if (item.feedId === feedIdOrCategory || feed?.category === feedIdOrCategory) {
          item.isRead = true;
        }
      }
    }
    this.saveItems();
  }

  /**
   * Updates category filter.
   */
  public setCategory(category: string): void {
    this.selectedCategory = category;
  }

  /**
   * Updates search filter string.
   */
  public setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  /**
   * Toggles the UI Add Feed modal / dropdown.
   */
  public toggleAddFeedModal(open?: boolean): void {
    this.showAddFeedModal = typeof open === 'boolean' ? open : !this.showAddFeedModal;
  }

  /**
   * Retrieves an item by unique ID.
   */
  public getItem(itemId: string): RSSItem | undefined {
    return this.items.find(i => i.id === itemId);
  }

  /**
   * Retrieves a feed by unique ID.
   */
  public getFeed(feedId: string): RSSFeed | undefined {
    return this.feeds.find(f => f.id === feedId);
  }

  /**
   * Computes unread item count across all feeds or within a specific category.
   */
  public getUnreadCount(category?: string): number {
    return this.items.filter(i => {
      if (i.isRead) return false;
      if (!category || category === 'all') return true;
      const feed = this.getFeed(i.feedId);
      return feed?.category === category;
    }).length;
  }

  /**
   * Filters and sorts items based on active category and search queries.
   */
  public getFilteredItems(): RSSItem[] {
    const q = this.searchQuery.trim().toLowerCase();

    return this.items.filter(item => {
      // Category filter
      if (this.selectedCategory !== 'all') {
        if (this.selectedCategory === 'bookmarks') {
          if (!item.isBookmarked) return false;
        } else {
          const feed = this.getFeed(item.feedId);
          if (feed && feed.category !== this.selectedCategory) {
            return false;
          }
        }
      }

      // Search query filter
      if (q.length > 0) {
        const inTitle = item.title.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inAuthor = item.author?.toLowerCase().includes(q) || false;
        const inTags = item.tags?.some(t => t.toLowerCase().includes(q)) || false;
        const feed = this.getFeed(item.feedId);
        const inFeed = feed?.title.toLowerCase().includes(q) || false;
        return inTitle || inDesc || inAuthor || inTags || inFeed;
      }

      return true;
    });
  }

  /**
   * Renders the stylish compact sidebar button for RSS Feeds.
   */
  public renderRSSButton(): string {
    const unreadCount = this.getUnreadCount();
    const isSyncing = this.isRefreshing;

    return `
      <button id="btn-open-rss-panel" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-raised/80 hover:bg-surface-overlay border border-white/5 hover:border-cyphr/30 text-left transition-all duration-200 group shadow-sm">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded-lg bg-surface-overlay flex items-center justify-center text-sm border border-white/10 group-hover:border-cyphr/40 group-hover:text-cyphr transition-colors">
            ${isSyncing ? '<span class="animate-spin">🔄</span>' : '📰'}
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-200 group-hover:text-cyphr transition-colors">RSS Feeds</div>
            <div class="text-[10px] font-mono text-slate-400">Cyber Intelligence</div>
          </div>
        </div>
        ${
          unreadCount > 0
            ? `<span class="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-cyphr/20 text-cyphr border border-cyphr/40 animate-pulse">
                ${unreadCount > 99 ? '99+' : unreadCount}
               </span>`
            : `<span class="text-[10px] font-mono text-slate-500">Live</span>`
        }
      </button>
    `;
  }

  /**
   * Renders the complete, fully-interactive RSS Feed Aggregator & Monitor Panel.
   */
  public renderRSSPanel(): string {
    const filteredItems = this.getFilteredItems();
    const totalUnread = this.getUnreadCount();
    const activeFeedsCount = this.feeds.filter(f => f.isActive).length;

    const categories = [
      { key: 'all', label: 'All Feeds', icon: '🌐' },
      { key: 'security', label: 'Security', icon: '🛡️' },
      { key: 'crypto', label: 'Crypto & ZK', icon: '🔐' },
      { key: 'tech', label: 'Tech & Exploits', icon: '💻' },
      { key: 'research', label: 'Research Papers', icon: '📄' },
      { key: 'custom', label: 'Custom', icon: '⚡' },
      { key: 'bookmarks', label: 'Bookmarked', icon: '⭐' },
    ];

    return `
      <div id="rss-importer-container" class="w-full max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
        <!-- Top Header & Intelligence Dashboard Banner -->
        <div class="p-5 rounded-2xl bg-surface-raised border border-white/10 shadow-xl relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-56 h-56 bg-cyphr/5 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -left-16 -bottom-16 w-56 h-56 bg-aether/5 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div class="space-y-1">
              <div class="flex items-center space-x-2.5">
                <div class="w-9 h-9 rounded-xl bg-surface-overlay flex items-center justify-center text-lg border border-cyphr/30 shadow-inner">
                  📰
                </div>
                <div>
                  <h2 class="text-base md:text-lg font-bold text-slate-100 flex items-center space-x-2">
                    <span>Threat Intelligence & RSS Feeds</span>
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyphr/10 text-cyphr border border-cyphr/30">
                      Sovereign Aggregator
                    </span>
                  </h2>
                  <p class="text-xs text-slate-400">
                    Real-time ingestion of CVE disclosures, cryptographic papers, zero-days, and cyber forensics.
                  </p>
                </div>
              </div>
            </div>

            <!-- Global Action Toolbar -->
            <div class="flex items-center space-x-2 w-full md:w-auto justify-end flex-wrap gap-2">
              <div class="flex items-center space-x-2 text-[11px] font-mono text-signal bg-surface-base/80 px-2.5 py-1.5 rounded-lg border border-signal/20">
                <span class="w-2 h-2 rounded-full bg-signal ${this.isRefreshing ? 'animate-ping' : 'animate-pulse'}"></span>
                <span>${this.isRefreshing ? 'Syncing Network...' : 'Auto-Sync Active (15m)'}</span>
              </div>

              <button
                id="btn-rss-refresh-all"
                class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 hover:border-cyphr/40 text-xs font-semibold text-slate-200 hover:text-cyphr flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                title="Force refresh all subscribed feeds"
                ${this.isRefreshing ? 'disabled' : ''}
              >
                <span class="${this.isRefreshing ? 'animate-spin' : ''}">🔄</span>
                <span>${this.isRefreshing ? 'Syncing...' : 'Refresh All'}</span>
              </button>

              <button
                id="btn-rss-mark-all-read"
                class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight border border-white/10 hover:border-white/20 text-xs font-semibold text-slate-300 transition-all active:scale-95"
                title="Mark all current entries as read"
              >
                <span>✓ Mark All Read</span>
              </button>

              <button
                id="btn-rss-toggle-add-modal"
                class="px-3.5 py-1.5 rounded-lg bg-cyphr/20 hover:bg-cyphr/30 text-cyphr border border-cyphr/40 text-xs font-bold flex items-center space-x-1 transition-all shadow-sm active:scale-95"
              >
                <span>+ Add Feed</span>
              </button>
            </div>
          </div>

          <!-- Feed Subscriptions Quick Bar -->
          <div class="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400">Subscribed Relays (${activeFeedsCount}):</span>
            ${this.feeds.map(feed => {
              const meta = CATEGORY_MAP[feed.category] || CATEGORY_MAP.custom;
              const unreadInFeed = this.items.filter(i => i.feedId === feed.id && !i.isRead).length;
              return `
                <div class="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-surface-base border ${feed.isActive ? 'border-white/10' : 'border-white/5 opacity-50'} text-[11px] group transition-all">
                  <button
                    data-feed-id="${feed.id}"
                    class="btn-toggle-feed-status flex items-center space-x-1.5 text-slate-300 hover:text-cyphr transition-colors"
                    title="${feed.isActive ? 'Active (Click to pause)' : 'Paused (Click to resume)'}"
                  >
                    <span class="w-1.5 h-1.5 rounded-full ${feed.isActive ? 'bg-signal' : 'bg-slate-600'}"></span>
                    <span class="font-medium truncate max-w-[140px]">${escapeHtml(feed.title)}</span>
                  </button>
                  ${unreadInFeed > 0 ? `
                    <span class="px-1 rounded-full bg-cyphr/20 text-cyphr text-[9px] font-mono font-bold">${unreadInFeed}</span>
                  ` : ''}
                  <button
                    data-remove-feed-id="${feed.id}"
                    class="btn-remove-feed text-slate-500 hover:text-crimson ml-1 transition-colors"
                    title="Remove feed"
                  >
                    ×
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Collapsible / Floating Add Feed Panel -->
        ${this.showAddFeedModal ? `
          <div id="rss-add-feed-modal" class="p-4 rounded-xl bg-surface-raised border border-cyphr/30 shadow-2xl space-y-3 animate-in fade-in duration-150">
            <div class="flex items-center justify-between pb-2 border-b border-white/5">
              <span class="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
                <span class="text-cyphr">⚡</span>
                <span>Subscribe to New RSS / Atom Feed</span>
              </span>
              <button id="btn-rss-close-add-modal" aria-label="${t('modal.close', undefined, 'Close')}" title="${t('modal.close', undefined, 'Close')}" class="text-slate-400 hover:text-slate-200 text-sm font-mono transition-colors">✕</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div class="md:col-span-6 space-y-1">
                <label class="text-[10px] font-mono text-slate-400 uppercase">Feed XML / RSS / Atom URL *</label>
                <input
                  id="rss-input-url"
                  type="url"
                  placeholder="https://example.com/security-advisories.xml"
                  class="w-full px-3 py-2 rounded-lg bg-surface-base border border-white/10 focus:border-cyphr/50 focus:outline-none text-xs text-slate-100 font-mono"
                />
              </div>

              <div class="md:col-span-3 space-y-1">
                <label class="text-[10px] font-mono text-slate-400 uppercase">Category</label>
                <select
                  id="rss-input-category"
                  class="w-full px-3 py-2 rounded-lg bg-surface-base border border-white/10 focus:border-cyphr/50 focus:outline-none text-xs text-slate-100"
                >
                  <option value="security">🛡️ Security</option>
                  <option value="crypto">🔐 Cryptography & ZK</option>
                  <option value="tech">💻 Tech & Exploits</option>
                  <option value="research">📄 Research Papers</option>
                  <option value="custom" selected>⚡ Custom</option>
                </select>
              </div>

              <div class="md:col-span-3 space-y-1">
                <label class="text-[10px] font-mono text-slate-400 uppercase">Custom Title (Optional)</label>
                <input
                  id="rss-input-title"
                  type="text"
                  placeholder="e.g. Kernel Security Advisory"
                  class="w-full px-3 py-2 rounded-lg bg-surface-base border border-white/10 focus:border-cyphr/50 focus:outline-none text-xs text-slate-100"
                />
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <div class="text-[11px] font-mono text-slate-500">
                🔒 Ingested client-side via decentralized allOrigins proxy bridge.
              </div>
              <div class="flex items-center space-x-2">
                <button
                  id="btn-rss-cancel-add"
                  class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-xs text-slate-300 transition-colors"
                >
                  ${t('common.cancel', undefined, 'Cancel')}
                </button>
                <button
                  id="btn-rss-submit-add"
                  class="px-4 py-1.5 rounded-lg bg-cyphr/20 hover:bg-cyphr/30 text-cyphr border border-cyphr/50 text-xs font-bold transition-colors shadow-sm"
                >
                  + Add & Fetch Stream
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Filter Controls: Search & Category Tabs -->
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 rounded-xl bg-surface-raised border border-white/5">
          <!-- Category Tabs -->
          <div class="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            ${categories.map(cat => {
              const isActive = this.selectedCategory === cat.key;
              const unreadInCat = this.getUnreadCount(cat.key === 'bookmarks' ? undefined : cat.key);
              return `
                <button
                  data-category="${cat.key}"
                  class="btn-rss-tab px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-cyphr/20 text-cyphr border border-cyphr/40 shadow-sm'
                      : 'bg-surface-base/60 text-slate-400 hover:text-slate-200 hover:bg-surface-overlay border border-transparent'
                  }"
                >
                  <span>${cat.icon}</span>
                  <span>${cat.label}</span>
                  ${cat.key !== 'bookmarks' && unreadInCat > 0 ? `
                    <span class="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-white/10 text-slate-300">${unreadInCat}</span>
                  ` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Instant Search Box -->
          <div class="relative min-w-[220px]">
            <input
              id="rss-search-input"
              type="text"
              value="${escapeHtml(this.searchQuery)}"
              placeholder="Filter by keyword, CVE, author..."
              class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-base border border-white/10 focus:border-cyphr/40 focus:outline-none text-xs text-slate-200 font-sans"
            />
            <span class="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
            ${this.searchQuery ? `
              <button id="btn-clear-rss-search" class="absolute right-2 top-1.5 text-slate-400 hover:text-slate-200 text-xs">×</button>
            ` : ''}
          </div>
        </div>

        <!-- Feed Items List / Feed Stream -->
        <div class="space-y-3">
          ${
            filteredItems.length === 0
              ? `
                <div class="p-12 text-center rounded-2xl bg-surface-raised border border-white/5 space-y-3">
                  <div class="w-12 h-12 mx-auto rounded-2xl bg-surface-overlay flex items-center justify-center text-2xl text-slate-500">
                    📡
                  </div>
                  <div class="text-sm font-semibold text-slate-300">No Intelligence Bulletins Found</div>
                  <p class="text-xs text-slate-500 max-w-sm mx-auto">
                    ${this.searchQuery ? `No items matched your query "${escapeHtml(this.searchQuery)}". Try clearing filters.` : 'No feed articles available in this stream. Click "Refresh All" to synchronize.'}
                  </p>
                  ${this.searchQuery ? `
                    <button id="btn-reset-rss-filters" class="px-3 py-1.5 rounded-lg bg-surface-overlay hover:bg-surface-highlight text-xs text-cyphr border border-cyphr/20">
                      Clear Search Filters
                    </button>
                  ` : `
                    <button id="btn-empty-refresh" class="px-4 py-1.5 rounded-lg bg-cyphr/20 text-cyphr border border-cyphr/40 text-xs font-bold">
                      🔄 Sync Subscribed Relays
                    </button>
                  `}
                </div>
              `
              : filteredItems.map(item => this.renderItemCard(item)).join('')
          }
        </div>

        <!-- Footer Information Note -->
        <div class="p-3 rounded-xl bg-surface-base/50 border border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div>Displaying ${filteredItems.length} intelligence items (${totalUnread} unread)</div>
          <div class="flex items-center space-x-2">
            <span>Last Sync: ${formatFullDate(this.lastSyncTime)}</span>
            <span>•</span>
            <span class="text-cyphr">UREfy CyberSec Engine</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders a single rich intelligence item card.
   */
  private renderItemCard(item: RSSItem): string {
    const feed = this.getFeed(item.feedId);
    const categoryKey = feed?.category || 'custom';
    const meta = CATEGORY_MAP[categoryKey] || CATEGORY_MAP.custom;
    const isUnread = !item.isRead;

    return `
      <div
        data-item-id="${item.id}"
        class="rss-item-card p-4 rounded-xl bg-surface-raised border ${
          isUnread ? 'border-white/15 bg-surface-raised' : 'border-white/5 bg-surface-raised/70 opacity-90'
        } hover:border-cyphr/40 transition-all duration-200 space-y-3 group shadow-sm"
      >
        <!-- Card Header: Feed Source Badge, Category, Date, Status -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center space-x-2">
            <!-- Unread Blue Dot Indicator -->
            ${
              isUnread
                ? `<span class="w-2 h-2 rounded-full bg-cyphr animate-pulse" title="Unread bulletin"></span>`
                : `<span class="w-2 h-2 rounded-full bg-slate-700" title="Read"></span>`
            }

            <!-- Source Name -->
            <span class="text-xs font-bold text-slate-200">
              ${escapeHtml(feed?.title || 'Relay Stream')}
            </span>

            <!-- Category Badge -->
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full ${meta.bgClass} ${meta.colorClass} border ${meta.borderClass} flex items-center space-x-1">
              <span>${meta.icon}</span>
              <span>${meta.label}</span>
            </span>
          </div>

          <!-- Relative Timestamp & Author -->
          <div class="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
            ${item.author ? `<span>By ${escapeHtml(item.author)}</span><span>•</span>` : ''}
            <span title="${formatFullDate(item.pubDate)}">🕒 ${formatRelativeTime(item.pubDate)}</span>
          </div>
        </div>

        <!-- Article / Advisory Title -->
        <div>
          <a
            href="${sanitizeUrl(item.link)}"
            target="_blank"
            rel="noopener noreferrer"
            data-open-item-id="${item.id}"
            class="rss-item-link text-sm md:text-base font-bold text-slate-100 group-hover:text-cyphr transition-colors leading-snug flex items-start justify-between gap-2"
          >
            <span>${escapeHtml(item.title)}</span>
            <span class="text-slate-500 group-hover:text-cyphr text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">↗</span>
          </a>
        </div>

        <!-- Short Description / Abstract Excerpt -->
        ${
          item.description
            ? `
              <p class="text-xs text-slate-400 leading-relaxed line-clamp-3 font-sans">
                ${escapeHtml(item.description)}
              </p>
            `
            : ''
        }

        <!-- Tags & Footer Quick Actions -->
        <div class="pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <!-- Tags -->
          <div class="flex items-center space-x-1.5 flex-wrap gap-1">
            ${(item.tags || []).map(t => `
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-base text-slate-400 border border-white/5">
                #${escapeHtml(t)}
              </span>
            `).join('')}
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2">
            <button
              data-toggle-bookmark-id="${item.id}"
              class="btn-toggle-bookmark p-1.5 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 text-xs transition-colors ${
                item.isBookmarked ? 'text-amber border-amber/30' : 'text-slate-400 hover:text-amber'
              }"
              title="${item.isBookmarked ? 'Remove Bookmark' : 'Bookmark Item'}"
            >
              ${item.isBookmarked ? '★' : '☆'}
            </button>

            <button
              data-toggle-read-id="${item.id}"
              class="btn-toggle-read px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-overlay border border-white/10 text-[11px] font-mono text-slate-300 hover:text-cyphr transition-colors"
              title="${item.isRead ? 'Mark as Unread' : 'Mark as Read'}"
            >
              ${item.isRead ? 'Mark Unread' : '✓ Mark Read'}
            </button>

            <a
              href="${sanitizeUrl(item.link)}"
              target="_blank"
              rel="noopener noreferrer"
              data-open-item-id="${item.id}"
              class="rss-open-external px-2.5 py-1 rounded-lg bg-cyphr/10 hover:bg-cyphr/20 text-cyphr border border-cyphr/30 text-[11px] font-mono font-medium flex items-center space-x-1 transition-colors"
            >
              <span>Source</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Binds interactive DOM events to rendered RSS panel elements.
   */
  public attachEventListeners(rootElement?: Document | HTMLElement): void {
    const root = rootElement || (typeof document !== 'undefined' ? document : null);
    if (!root) return;

    // Refresh All button
    const refreshBtn = root.querySelector('#btn-rss-refresh-all');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshAllFeeds().then(() => {
          this.reRenderIfMounted();
        });
        this.reRenderIfMounted();
      });
    }

    // Empty state refresh
    const emptyRefreshBtn = root.querySelector('#btn-empty-refresh');
    if (emptyRefreshBtn) {
      emptyRefreshBtn.addEventListener('click', () => {
        this.refreshAllFeeds().then(() => this.reRenderIfMounted());
        this.reRenderIfMounted();
      });
    }

    // Mark all read button
    const markAllBtn = root.querySelector('#btn-rss-mark-all-read');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        this.markAllAsRead(this.selectedCategory);
        this.reRenderIfMounted();
      });
    }

    // Toggle add feed modal button
    const toggleAddModalBtn = root.querySelector('#btn-rss-toggle-add-modal');
    if (toggleAddModalBtn) {
      toggleAddModalBtn.addEventListener('click', () => {
        this.toggleAddFeedModal();
        this.reRenderIfMounted();
      });
    }

    // Close add modal button
    const closeAddModalBtn = root.querySelector('#btn-rss-close-add-modal');
    if (closeAddModalBtn) {
      closeAddModalBtn.addEventListener('click', () => {
        this.toggleAddFeedModal(false);
        this.reRenderIfMounted();
      });
    }

    const cancelAddBtn = root.querySelector('#btn-rss-cancel-add');
    if (cancelAddBtn) {
      cancelAddBtn.addEventListener('click', () => {
        this.toggleAddFeedModal(false);
        this.reRenderIfMounted();
      });
    }

    // Submit add feed
    const submitAddBtn = root.querySelector('#btn-rss-submit-add');
    if (submitAddBtn) {
      submitAddBtn.addEventListener('click', () => {
        const urlInput = root.querySelector('#rss-input-url') as HTMLInputElement | null;
        const catSelect = root.querySelector('#rss-input-category') as HTMLSelectElement | null;
        const titleInput = root.querySelector('#rss-input-title') as HTMLInputElement | null;

        if (urlInput && urlInput.value.trim().length > 0) {
          const feedUrl = urlInput.value.trim();
          const category = catSelect ? catSelect.value : 'custom';
          const feedTitle = titleInput ? titleInput.value.trim() : undefined;

          this.addFeed(feedUrl, category, feedTitle);
          this.toggleAddFeedModal(false);
          this.reRenderIfMounted();
        }
      });
    }

    // Category Tabs
    const catButtons = root.querySelectorAll('.btn-rss-tab');
    catButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const cat = target.getAttribute('data-category');
        if (cat) {
          this.setCategory(cat);
          this.reRenderIfMounted();
        }
      });
    });

    // Search Input
    const searchInput = root.querySelector('#rss-search-input') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const target = e.target as HTMLInputElement;
        this.searchQuery = target.value;
        this.reRenderIfMounted();
      });
    }

    const clearSearchBtn = root.querySelector('#btn-clear-rss-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.reRenderIfMounted();
      });
    }

    const resetFiltersBtn = root.querySelector('#btn-reset-rss-filters');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.selectedCategory = 'all';
        this.reRenderIfMounted();
      });
    }

    // Individual item toggle read
    const toggleReadBtns = root.querySelectorAll('.btn-toggle-read');
    toggleReadBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const itemId = target.getAttribute('data-toggle-read-id');
        if (itemId) {
          const item = this.getItem(itemId);
          if (item) {
            item.isRead = !item.isRead;
            this.saveItems();
            this.reRenderIfMounted();
          }
        }
      });
    });

    // Toggle bookmark
    const bookmarkBtns = root.querySelectorAll('.btn-toggle-bookmark');
    bookmarkBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const itemId = target.getAttribute('data-toggle-bookmark-id');
        if (itemId) {
          this.toggleBookmark(itemId);
          this.reRenderIfMounted();
        }
      });
    });

    // External links: automatically mark item as read on click
    const itemLinks = root.querySelectorAll('.rss-item-link, .rss-open-external');
    itemLinks.forEach(link => {
      link.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const itemId = target.getAttribute('data-open-item-id');
        if (itemId) {
          this.markAsRead(itemId);
        }
      });
    });

    // Toggle active state of feed
    const toggleFeedBtns = root.querySelectorAll('.btn-toggle-feed-status');
    toggleFeedBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const feedId = target.getAttribute('data-feed-id');
        if (feedId) {
          this.toggleFeedActive(feedId);
          this.reRenderIfMounted();
        }
      });
    });

    // Remove feed buttons
    const removeFeedBtns = root.querySelectorAll('.btn-remove-feed');
    removeFeedBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        const target = e.currentTarget as HTMLElement;
        const feedId = target.getAttribute('data-remove-feed-id');
        if (feedId) {
          this.removeFeed(feedId);
          this.reRenderIfMounted();
        }
      });
    });
  }

  /**
   * Helper to re-render in place if mounted inside a host container element.
   */
  private reRenderIfMounted(): void {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('rss-importer-container');
    if (container && container.parentElement) {
      const parent = container.parentElement;
      parent.innerHTML = this.renderRSSPanel();
      this.attachEventListeners(parent);
    }
  }
}

/**
 * Global singleton instance of the Sovereign RSS Importer.
 */
export const rssImporter = new RSSImporter();
