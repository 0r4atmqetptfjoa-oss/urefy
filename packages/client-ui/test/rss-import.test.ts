import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RSSImporter, rssImporter, type RSSFeed, type RSSItem } from '../src/rss-import.js';

/**
 * In-memory LocalStorage mock for headless testing environments.
 */
class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('Sovereign RSS / Atom Feed Aggregator (RSSImporter)', () => {
  let localStorageMock: LocalStorageMock;

  beforeEach(() => {
    localStorageMock = new LocalStorageMock();

    (globalThis as any).window = {
      localStorage: localStorageMock,
    };
    (globalThis as any).localStorage = localStorageMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. INITIALIZATION & DEFAULT FEEDS ─────────────────────────────────────

  describe('1. Initialization & Default Feeds', () => {
    it('should initialize with 5 default cyber intelligence feeds', () => {
      const importer = new RSSImporter();
      expect(importer.feeds.length).toBe(5);

      const feedIds = importer.feeds.map((f: RSSFeed) => f.id);
      expect(feedIds).toContain('feed-cve-mitre');
      expect(feedIds).toContain('feed-krebs');
      expect(feedIds).toContain('feed-schneier');
      expect(feedIds).toContain('feed-thehackernews');
      expect(feedIds).toContain('feed-arxiv-cr');

      // All default feeds should be active
      importer.feeds.forEach((feed: RSSFeed) => {
        expect(feed.isActive).toBe(true);
        expect(feed.url).toMatch(/^https?:\/\//);
        expect(feed.title.length).toBeGreaterThan(0);
      });
    });

    it('should assign correct default categories to feeds', () => {
      const importer = new RSSImporter();
      const cveFeed = importer.getFeed('feed-cve-mitre');
      const krebsFeed = importer.getFeed('feed-krebs');
      const schneierFeed = importer.getFeed('feed-schneier');
      const thnFeed = importer.getFeed('feed-thehackernews');
      const arxivFeed = importer.getFeed('feed-arxiv-cr');

      expect(cveFeed?.category).toBe('security');
      expect(krebsFeed?.category).toBe('security');
      expect(schneierFeed?.category).toBe('crypto');
      expect(thnFeed?.category).toBe('tech');
      expect(arxivFeed?.category).toBe('research');
    });

    it('should initialize with default high-fidelity seed items', () => {
      const importer = new RSSImporter();
      expect(importer.items.length).toBe(8);

      const itemIds = importer.items.map((i: RSSItem) => i.id);
      expect(itemIds).toContain('rss-item-cve-2026-9041');
      expect(itemIds).toContain('rss-item-cve-2026-8812');
      expect(itemIds).toContain('rss-item-thn-1');
      expect(itemIds).toContain('rss-item-krebs-1');
      expect(itemIds).toContain('rss-item-schneier-1');
      expect(itemIds).toContain('rss-item-arxiv-1');

      // Verify item shape
      const firstItem = importer.items[0];
      expect(firstItem.feedId).toBeDefined();
      expect(firstItem.title).toBeDefined();
      expect(firstItem.link).toBeDefined();
      expect(firstItem.description).toBeDefined();
      expect(typeof firstItem.pubDate).toBe('number');
      expect(Array.isArray(firstItem.tags)).toBe(true);
      expect(typeof firstItem.isRead).toBe('boolean');
      expect(typeof firstItem.isBookmarked).toBe('boolean');
    });

    it('should export a singleton rssImporter instance', () => {
      expect(rssImporter).toBeDefined();
      expect(rssImporter).toBeInstanceOf(RSSImporter);
      expect(rssImporter.feeds.length).toBeGreaterThanOrEqual(5);
    });

    it('should restore stored feeds and items from localStorage if present', () => {
      const customFeeds: RSSFeed[] = [
        {
          id: 'feed-custom-stored',
          url: 'https://stored-feed.example.com/rss.xml',
          title: 'Stored Custom Security Feed',
          category: 'security',
          isActive: true,
        },
      ];
      const customItems: RSSItem[] = [
        {
          id: 'rss-item-stored-1',
          feedId: 'feed-custom-stored',
          title: 'Stored Zero-Day Report',
          link: 'https://stored-feed.example.com/item-1',
          description: 'Memory corruption in hypervisor.',
          pubDate: 1770000000000,
          isRead: false,
          isBookmarked: true,
        },
      ];

      localStorageMock.setItem('aetheris_rss_feeds_v2', JSON.stringify(customFeeds));
      localStorageMock.setItem('aetheris_rss_items_v2', JSON.stringify(customItems));

      const importer = new RSSImporter();
      expect(importer.feeds.length).toBe(1);
      expect(importer.feeds[0].id).toBe('feed-custom-stored');
      expect(importer.items.length).toBe(1);
      expect(importer.items[0].id).toBe('rss-item-stored-1');
    });
  });

  // ─── 2. RSS 2.0 XML PARSING ────────────────────────────────────────────────

  describe('2. parseRSSXML Parsing Engine', () => {
    const sampleRSSXML = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
        <channel>
          <title>Threat Intel Feed</title>
          <link>https://threatintel.example.com</link>
          <description>Daily Cyber Threat Dispatch</description>
          <item>
            <title><![CDATA[CVE-2026-1122: Remote Code Execution in TLS Parser]]></title>
            <link>https://threatintel.example.com/advisory/1122</link>
            <description><![CDATA[A critical heap corruption flaw was identified in the ASN.1 parser.]]></description>
            <pubDate>Mon, 24 Aug 2026 14:30:00 GMT</pubDate>
            <dc:creator>Alice Sentinel</dc:creator>
            <category>Vulnerability</category>
            <category>TLS</category>
            <guid>https://threatintel.example.com/advisory/1122</guid>
          </item>
          <item>
            <title>State-Sponsored APT Campaign Targeting Zero-Knowledge Proof Infrastructure</title>
            <link>https://threatintel.example.com/apt/zk-target</link>
            <description>Adversaries are targeting witness generation clusters using compromised supply chains.</description>
            <pubDate>Sun, 23 Aug 2026 09:15:00 GMT</pubDate>
            <author>bob@threatintel.example.com (Bob Vance)</author>
            <category>#ZeroKnowledge</category>
            <category>#SupplyChain</category>
            <guid>apt-zk-2026-88</guid>
          </item>
        </channel>
      </rss>`;

    it('should parse valid RSS 2.0 XML and extract items correctly', () => {
      const importer = new RSSImporter();
      const items = importer.parseRSSXML(sampleRSSXML, 'feed-threat-intel');

      expect(items.length).toBe(2);

      // Item 1
      const item1 = items[0];
      expect(item1.feedId).toBe('feed-threat-intel');
      expect(item1.title).toBe('CVE-2026-1122: Remote Code Execution in TLS Parser');
      expect(item1.link).toBe('https://threatintel.example.com/advisory/1122');
      expect(item1.description).toContain('heap corruption flaw');
      expect(item1.author).toContain('Alice Sentinel');
      expect(item1.tags).toContain('Vulnerability');
      expect(item1.tags).toContain('TLS');
      expect(item1.isRead).toBe(false);
      expect(item1.isBookmarked).toBe(false);
      expect(item1.pubDate).toBeGreaterThan(0);

      // Item 2
      const item2 = items[1];
      expect(item2.title).toContain('State-Sponsored APT');
      expect(item2.link).toBe('https://threatintel.example.com/apt/zk-target');
      expect(item2.description).toContain('witness generation');
      expect(item2.tags).toContain('ZeroKnowledge');
      expect(item2.tags).toContain('SupplyChain');
    });

    it('should handle empty or invalid XML gracefully without throwing', () => {
      const importer = new RSSImporter();
      expect(importer.parseRSSXML('', 'feed-test')).toEqual([]);
      expect(importer.parseRSSXML('   ', 'feed-test')).toEqual([]);
      expect(importer.parseRSSXML('<broken>xml without item</broken>', 'feed-test')).toEqual([]);
    });

    it('should parse content encoded tags and strip HTML markup and entities cleanly', () => {
      const htmlRSS = `
        <rss version="2.0">
          <channel>
            <item>
              <title><![CDATA[Exploit &amp; Advisory <b>Update</b>]]></title>
              <link>https://example.com/exploit</link>
              <content:encoded><![CDATA[<p>Summary of <strong>malware</strong> payload &nbsp; analysis.</p>]]></content:encoded>
              <pubDate>2026-08-20T10:00:00Z</pubDate>
              <guid>guid-encoded-1</guid>
            </item>
          </channel>
        </rss>
      `;

      const importer = new RSSImporter();
      const items = importer.parseRSSXML(htmlRSS, 'feed-encoded');

      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Exploit & Advisory Update');
      expect(items[0].description).toBe('Summary of malware payload analysis.');
    });
  });

  // ─── 3. ATOM 1.0 XML PARSING ───────────────────────────────────────────────

  describe('3. parseAtomXML Parsing Engine', () => {
    const sampleAtomXML = `<?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Cryptography &amp; Formal Methods Archive</title>
        <link href="https://crypto.example.org"/>
        <updated>2026-08-25T18:00:00Z</updated>
        <entry>
          <title type="html"><![CDATA[Recursive Proofs of Solvency via Multi-Prover SNARKs]]></title>
          <link rel="alternate" type="text/html" href="https://crypto.example.org/papers/solvency-snark"/>
          <id>urn:crypto:paper:2026:solvency</id>
          <published>2026-08-25T12:00:00Z</published>
          <summary>We introduce a fault-tolerant multi-prover rollup scheme verifying exchange reserves without leakage.</summary>
          <author>
            <name>Dr. Satoshi Thorne</name>
          </author>
          <category term="ZK-SNARK"/>
          <category term="Cryptoeconomics"/>
        </entry>
        <entry>
          <title>Automated Synthesis of Constant-Time Montgomery Multipliers</title>
          <link href="https://crypto.example.org/papers/montgomery-ct"/>
          <id>urn:crypto:paper:2026:montgomery</id>
          <updated>2026-08-24T16:00:00Z</updated>
          <content type="text">A formal verification framework eliminating microarchitectural cache side-channels.</content>
          <author>
            <name>Elena Rostova</name>
          </author>
          <category term="FormalVerification"/>
        </entry>
      </feed>`;

    it('should parse valid Atom 1.0 XML and extract entries properly', () => {
      const importer = new RSSImporter();
      const items = importer.parseAtomXML(sampleAtomXML, 'feed-atom-crypto');

      expect(items.length).toBe(2);

      // Entry 1
      const entry1 = items[0];
      expect(entry1.feedId).toBe('feed-atom-crypto');
      expect(entry1.title).toBe('Recursive Proofs of Solvency via Multi-Prover SNARKs');
      expect(entry1.link).toBe('https://crypto.example.org/papers/solvency-snark');
      expect(entry1.description).toContain('fault-tolerant multi-prover rollup');
      expect(entry1.author).toContain('Satoshi Thorne');
      expect(entry1.tags).toContain('ZK-SNARK');
      expect(entry1.tags).toContain('Cryptoeconomics');
      expect(entry1.pubDate).toBeGreaterThan(0);

      // Entry 2
      const entry2 = items[1];
      expect(entry2.title).toContain('Constant-Time Montgomery');
      expect(entry2.link).toBe('https://crypto.example.org/papers/montgomery-ct');
      expect(entry2.description).toContain('microarchitectural cache side-channels');
      expect(entry2.author).toContain('Elena Rostova');
      expect(entry2.tags).toContain('FormalVerification');
    });

    it('should return empty list on empty or invalid Atom XML', () => {
      const importer = new RSSImporter();
      expect(importer.parseAtomXML('', 'feed-test')).toEqual([]);
      expect(importer.parseAtomXML('   ', 'feed-test')).toEqual([]);
      expect(importer.parseAtomXML('<feed></feed>', 'feed-test')).toEqual([]);
    });
  });

  // ─── 4. FEED MANAGEMENT (addFeed, removeFeed, toggleFeedActive) ────────────

  describe('4. Feed Management (addFeed, removeFeed, toggleFeedActive)', () => {
    it('should add a new feed with custom category and title', () => {
      const importer = new RSSImporter();
      const initialCount = importer.feeds.length;

      importer.addFeed(
        'https://darkreading.com/rss.xml',
        'tech',
        'Dark Reading Security',
        'Cyber security news and defense strategies'
      );

      expect(importer.feeds.length).toBe(initialCount + 1);

      const added = importer.feeds.find(f => f.url === 'https://darkreading.com/rss.xml');
      expect(added).toBeDefined();
      expect(added?.title).toBe('Dark Reading Security');
      expect(added?.category).toBe('tech');
      expect(added?.description).toBe('Cyber security news and defense strategies');
      expect(added?.isActive).toBe(true);
    });

    it('should prevent adding duplicate feed URLs', () => {
      const importer = new RSSImporter();
      const initialCount = importer.feeds.length;

      // Existing feed URL (Krebs)
      importer.addFeed('https://krebsonsecurity.com/feed/', 'security', 'Duplicate Krebs');
      expect(importer.feeds.length).toBe(initialCount);
    });

    it('should ignore empty or whitespace-only feed URLs', () => {
      const importer = new RSSImporter();
      const initialCount = importer.feeds.length;

      importer.addFeed('', 'custom');
      importer.addFeed('   ', 'custom');
      expect(importer.feeds.length).toBe(initialCount);
    });

    it('should remove a feed and its associated items', () => {
      const importer = new RSSImporter();
      const targetFeedId = 'feed-cve-mitre';

      expect(importer.getFeed(targetFeedId)).toBeDefined();
      expect(importer.items.some(i => i.feedId === targetFeedId)).toBe(true);

      importer.removeFeed(targetFeedId);

      expect(importer.getFeed(targetFeedId)).toBeUndefined();
      expect(importer.items.some(i => i.feedId === targetFeedId)).toBe(false);
    });

    it('should toggle feed active status between true and false', () => {
      const importer = new RSSImporter();
      const feed = importer.feeds[0];
      const feedId = feed.id;

      expect(feed.isActive).toBe(true);

      importer.toggleFeedActive(feedId);
      expect(importer.getFeed(feedId)?.isActive).toBe(false);

      importer.toggleFeedActive(feedId);
      expect(importer.getFeed(feedId)?.isActive).toBe(true);
    });
  });

  // ─── 5. ITEM MANAGEMENT (markAsRead, toggleBookmark, markAllAsRead) ────────

  describe('5. Item Operations (markAsRead, toggleBookmark, markAllAsRead)', () => {
    it('should mark a specific item as read', () => {
      const importer = new RSSImporter();
      const targetItem = importer.items.find(i => !i.isRead);
      expect(targetItem).toBeDefined();

      const itemId = targetItem!.id;
      importer.markAsRead(itemId);

      const updated = importer.getItem(itemId);
      expect(updated?.isRead).toBe(true);
    });

    it('should toggle bookmark status for an item', () => {
      const importer = new RSSImporter();
      const item = importer.items[0];
      const initialBookmark = item.isBookmarked;

      importer.toggleBookmark(item.id);
      expect(importer.getItem(item.id)?.isBookmarked).toBe(!initialBookmark);

      importer.toggleBookmark(item.id);
      expect(importer.getItem(item.id)?.isBookmarked).toBe(initialBookmark);
    });

    it('should mark all items as read globally', () => {
      const importer = new RSSImporter();
      expect(importer.getUnreadCount()).toBeGreaterThan(0);

      importer.markAllAsRead('all');

      expect(importer.getUnreadCount()).toBe(0);
      importer.items.forEach(item => {
        expect(item.isRead).toBe(true);
      });
    });

    it('should mark all items as read for a specific feed or category', () => {
      const importer = new RSSImporter();
      importer.markAllAsRead('feed-cve-mitre');

      const cveItems = importer.items.filter(i => i.feedId === 'feed-cve-mitre');
      cveItems.forEach(i => expect(i.isRead).toBe(true));
    });
  });

  // ─── 6. FILTERING, SEARCH & UNREAD METRICS ─────────────────────────────────

  describe('6. Filtering, Search & Metrics', () => {
    it('should filter items by category', () => {
      const importer = new RSSImporter();

      importer.setCategory('crypto');
      const cryptoItems = importer.getFilteredItems();

      cryptoItems.forEach(item => {
        const feed = importer.getFeed(item.feedId);
        expect(feed?.category).toBe('crypto');
      });
    });

    it('should filter items by bookmarked status', () => {
      const importer = new RSSImporter();
      importer.setCategory('bookmarks');

      const bookmarkedItems = importer.getFilteredItems();
      expect(bookmarkedItems.length).toBeGreaterThan(0);
      bookmarkedItems.forEach(item => {
        expect(item.isBookmarked).toBe(true);
      });
    });

    it('should filter items matching search queries across titles, tags, and authors', () => {
      const importer = new RSSImporter();

      // Search by CVE keyword
      importer.setSearchQuery('WireGuard');
      const cveResults = importer.getFilteredItems();
      expect(cveResults.length).toBeGreaterThanOrEqual(1);
      expect(cveResults[0].title).toContain('WireGuard');

      // Search by author
      importer.setSearchQuery('Schneier');
      const authorResults = importer.getFilteredItems();
      expect(authorResults.length).toBeGreaterThanOrEqual(1);

      // Search by tag
      importer.setSearchQuery('Post-Quantum');
      const tagResults = importer.getFilteredItems();
      expect(tagResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate unread counts accurately overall and by category', () => {
      const importer = new RSSImporter();
      const totalUnread = importer.getUnreadCount();
      const securityUnread = importer.getUnreadCount('security');
      const cryptoUnread = importer.getUnreadCount('crypto');

      expect(totalUnread).toBeGreaterThan(0);
      expect(securityUnread).toBeGreaterThan(0);
      expect(cryptoUnread).toBeGreaterThanOrEqual(0);
      expect(totalUnread).toBeGreaterThanOrEqual(securityUnread + cryptoUnread);
    });
  });

  // ─── 7. UI RENDERING (renderRSSPanel & renderRSSButton) ─────────────────────

  describe('7. HTML UI Rendering (renderRSSPanel & renderRSSButton)', () => {
    it('should render the compact sidebar RSS button with unread count and styles', () => {
      const importer = new RSSImporter();
      const buttonHtml = importer.renderRSSButton();

      expect(buttonHtml).toContain('id="btn-open-rss-panel"');
      expect(buttonHtml).toContain('RSS Feeds');
      expect(buttonHtml).toContain('Cyber Intelligence');
      expect(buttonHtml).toContain('bg-surface-raised/80');
      expect(buttonHtml).toContain('text-cyphr');
    });

    it('should render the comprehensive RSS intelligence panel with header, toolbar, categories, and items', () => {
      const importer = new RSSImporter();
      const panelHtml = importer.renderRSSPanel();

      // Top container & Header
      expect(panelHtml).toContain('id="rss-importer-container"');
      expect(panelHtml).toContain('Threat Intelligence & RSS Feeds');
      expect(panelHtml).toContain('Sovereign Aggregator');

      // Toolbar buttons
      expect(panelHtml).toContain('id="btn-rss-refresh-all"');
      expect(panelHtml).toContain('id="btn-rss-mark-all-read"');
      expect(panelHtml).toContain('id="btn-rss-toggle-add-modal"');

      // Category tab bar
      expect(panelHtml).toContain('All Feeds');
      expect(panelHtml).toContain('Security');
      expect(panelHtml).toContain('Crypto & ZK');
      expect(panelHtml).toContain('Tech & Exploits');
      expect(panelHtml).toContain('Research Papers');
      expect(panelHtml).toContain('Bookmarked');

      // Subscribed relays
      expect(panelHtml).toContain('Subscribed Relays');
      expect(panelHtml).toContain('CVE MITRE');
      expect(panelHtml).toContain('Krebs on Security');

      // Item card elements
      expect(panelHtml).toContain('rss-item-card');
      expect(panelHtml).toContain('btn-toggle-bookmark');
      expect(panelHtml).toContain('btn-toggle-read');
      expect(panelHtml).toContain('Aetheris CyberSec Engine');
    });

    it('should render the Add Feed modal when showAddFeedModal is true', () => {
      const importer = new RSSImporter();
      importer.toggleAddFeedModal(true);

      const modalHtml = importer.renderRSSPanel();
      expect(modalHtml).toContain('id="rss-add-feed-modal"');
      expect(modalHtml).toContain('id="rss-input-url"');
      expect(modalHtml).toContain('id="rss-input-category"');
      expect(modalHtml).toContain('id="rss-input-title"');
      expect(modalHtml).toContain('id="btn-rss-submit-add"');
    });

    it('should render empty state gracefully when no items match search query', () => {
      const importer = new RSSImporter();
      importer.setSearchQuery('NonExistentKeywordZeroMatch12345');

      const emptyHtml = importer.renderRSSPanel();
      expect(emptyHtml).toContain('No Intelligence Bulletins Found');
      expect(emptyHtml).toContain('id="btn-reset-rss-filters"');
    });
  });

  // ─── 8. DOM EVENT BINDING ──────────────────────────────────────────────────

  describe('8. DOM Event Listeners (attachEventListeners)', () => {
    it('should attach event listeners safely to DOM nodes without throwing', () => {
      const importer = new RSSImporter();

      // In Node.js environment where document may be mocked or partially present
      expect(() => importer.attachEventListeners()).not.toThrow();
    });
  });

  // ─── 9. XSS SANITIZATION & SECURITY HARDENING ──────────────────────────────

  describe('9. XSS Sanitization & Malicious Feed Payload Defense', () => {
    it('should neutralize javascript:, data:, and HTML tags in external feed items', () => {
      const importer = new RSSImporter();
      importer.items = [
        {
          id: 'xss-item-1',
          feedId: 'feed-cve-mitre',
          title: '<script>alert("xss")</script>CVE-2026-XSS',
          link: 'javascript:alert(document.cookie)',
          description: '<img src=x onerror=alert(1)>Malicious description payload',
          pubDate: Date.now(),
          author: '<script>evil()</script>',
          tags: ['<script>tag</script>', 'NormalTag'],
          isRead: false,
          isBookmarked: false,
        },
      ];

      const html = importer.renderRSSPanel();

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('href="javascript:');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should parse and strip dangerous tags in raw XML payloads safely', () => {
      const importer = new RSSImporter();
      const maliciousRSS = `
        <rss version="2.0">
          <channel>
            <title>&lt;script&gt;Evil Feed&lt;/script&gt;</title>
            <item>
              <title>&lt;script&gt;alert(1)&lt;/script&gt;Payload</title>
              <link>javascript:alert(1)</link>
              <description>&lt;img src=x onerror=alert(1)&gt;Text</description>
            </item>
          </channel>
        </rss>
      `;

      const parsed = importer.parseRSSXML(maliciousRSS, 'feed-test');
      expect(parsed.length).toBe(1);
      expect(parsed[0].title).not.toContain('<script>');
    });
  });
});
