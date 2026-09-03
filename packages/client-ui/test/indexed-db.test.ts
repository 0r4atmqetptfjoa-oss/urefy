import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AetherisDB,
  aethDB,
  type PostRecord,
  type DraftRecord,
  type BookmarkRecord,
  type MessageRecord,
  type PreferenceRecord,
  type SearchIndexRecord,
  type DBStats
} from '../src/indexed-db.js';

describe('AetherisDB — Sovereign Local IndexedDB Storage & Search Engine', () => {
  let db: AetherisDB;

  beforeEach(async () => {
    db = new AetherisDB();
    await db.open();
  });

  describe('1. Engine Initialization & Structure', () => {
    it('should initialize with correct database name and schema version', () => {
      expect(db.dbName).toBe('aetheris_omnisphere_db');
      expect(db.version).toBe(1);
    });

    it('should verify singleton export is an instance of AetherisDB', () => {
      expect(aethDB).toBeDefined();
      expect(aethDB).toBeInstanceOf(AetherisDB);
    });

    it('should open database successfully and be idempotent', async () => {
      await expect(db.open()).resolves.toBeUndefined();
      // Second open should resolve immediately
      await expect(db.open()).resolves.toBeUndefined();
    });
  });

  describe('2. CRUD Operations (put, get, getAll, delete, count, clear, putBatch)', () => {
    it('should insert and retrieve a PostRecord by ID', async () => {
      const post: PostRecord = {
        id: 'post-zk-001',
        title: 'Zero-Knowledge Cryptography in Aetheris',
        content: 'Deep dive into BN254 SNARKs and Halo2 recursion.',
        authorFP: 'fp-8f92a1',
        channelId: 'crypto-dev',
        createdAt: 1700000000000,
        score: 42,
        flair: 'SECURITY ADVISORY',
        tags: ['zk', 'snarks', 'cryptography']
      };

      await db.put<PostRecord>('posts', post);
      const retrieved = await db.get<PostRecord>('posts', 'post-zk-001');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('post-zk-001');
      expect(retrieved?.title).toBe('Zero-Knowledge Cryptography in Aetheris');
      expect(retrieved?.authorFP).toBe('fp-8f92a1');
      expect(retrieved?.score).toBe(42);
    });

    it('should return null when retrieving a non-existent key', async () => {
      const nonExistent = await db.get<PostRecord>('posts', 'non-existent-id-999');
      expect(nonExistent).toBeNull();
    });

    it('should insert and retrieve DraftRecord with custom keyPath "key"', async () => {
      const draft: DraftRecord = {
        key: 'draft_channel_dev',
        title: 'Drafting Protocol v2',
        content: 'Draft notes on MLS protocol integration...',
        updatedAt: Date.now(),
        channelId: 'channel_dev'
      };

      await db.put<DraftRecord>('drafts', draft);
      const retrieved = await db.get<DraftRecord>('drafts', 'draft_channel_dev');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.key).toBe('draft_channel_dev');
      expect(retrieved?.title).toBe('Drafting Protocol v2');
    });

    it('should insert and retrieve BookmarkRecord and MessageRecord', async () => {
      const bookmark: BookmarkRecord = {
        id: 'bm-101',
        postId: 'post-zk-001',
        tags: ['starred', 'zk'],
        notes: 'Critical research paper',
        savedAt: Date.now()
      };
      await db.put<BookmarkRecord>('bookmarks', bookmark);

      const message: MessageRecord = {
        id: 'msg-501',
        channelId: 'general',
        content: 'Hello sovereign mesh network!',
        authorFP: 'fp-alice',
        timestamp: Date.now(),
        isMine: true
      };
      await db.put<MessageRecord>('messages', message);

      const retrievedBookmark = await db.get<BookmarkRecord>('bookmarks', 'bm-101');
      const retrievedMessage = await db.get<MessageRecord>('messages', 'msg-501');

      expect(retrievedBookmark?.postId).toBe('post-zk-001');
      expect(retrievedMessage?.content).toBe('Hello sovereign mesh network!');
    });

    it('should retrieve all records from a store via getAll', async () => {
      await db.clear('posts');

      const p1: PostRecord = { id: 'p-1', content: 'Post 1', authorFP: 'fp1', channelId: 'c1', createdAt: 100, score: 1 };
      const p2: PostRecord = { id: 'p-2', content: 'Post 2', authorFP: 'fp2', channelId: 'c1', createdAt: 200, score: 5 };
      const p3: PostRecord = { id: 'p-3', content: 'Post 3', authorFP: 'fp3', channelId: 'c2', createdAt: 300, score: 10 };

      await db.put<PostRecord>('posts', p1);
      await db.put<PostRecord>('posts', p2);
      await db.put<PostRecord>('posts', p3);

      const all = await db.getAll<PostRecord>('posts');
      expect(all.length).toBe(3);
      const ids = all.map(p => p.id);
      expect(ids).toContain('p-1');
      expect(ids).toContain('p-2');
      expect(ids).toContain('p-3');
    });

    it('should delete a record by key', async () => {
      const post: PostRecord = { id: 'p-del', content: 'To delete', authorFP: 'fp', channelId: 'c', createdAt: 1, score: 0 };
      await db.put('posts', post);

      let fetched = await db.get<PostRecord>('posts', 'p-del');
      expect(fetched).not.toBeNull();

      await db.delete('posts', 'p-del');
      fetched = await db.get<PostRecord>('posts', 'p-del');
      expect(fetched).toBeNull();
    });

    it('should count records in a store', async () => {
      await db.clear('preferences');
      expect(await db.count('preferences')).toBe(0);

      await db.put<PreferenceRecord>('preferences', { key: 'theme', value: 'obsidian-cyber', updatedAt: Date.now() });
      await db.put<PreferenceRecord>('preferences', { key: 'zen_mode', value: true, updatedAt: Date.now() });

      expect(await db.count('preferences')).toBe(2);
    });

    it('should clear all records from an object store', async () => {
      await db.put('posts', { id: 'post-clr-1', content: 'a', authorFP: 'fp', channelId: 'c', createdAt: 1, score: 0 });
      await db.put('posts', { id: 'post-clr-2', content: 'b', authorFP: 'fp', channelId: 'c', createdAt: 2, score: 0 });

      expect(await db.count('posts')).toBeGreaterThanOrEqual(2);
      await db.clear('posts');
      expect(await db.count('posts')).toBe(0);
    });

    it('should batch insert records with putBatch', async () => {
      await db.clear('messages');
      const messages: MessageRecord[] = Array.from({ length: 15 }, (_, i) => ({
        id: `batch-msg-${i}`,
        channelId: 'relay-pulse',
        content: `Encrypted batch message #${i}`,
        authorFP: `fp-${i % 3}`,
        timestamp: Date.now() + i
      }));

      await db.putBatch('messages', messages);
      expect(await db.count('messages')).toBe(15);

      const all = await db.getAll<MessageRecord>('messages');
      expect(all.length).toBe(15);
    });

    it('should query records matching index value', async () => {
      await db.clear('posts');
      await db.put('posts', { id: 'qp-1', content: 'c1 post', authorFP: 'fp-alice', channelId: 'alpha', createdAt: 1, score: 1 });
      await db.put('posts', { id: 'qp-2', content: 'c2 post', authorFP: 'fp-bob', channelId: 'beta', createdAt: 2, score: 2 });
      await db.put('posts', { id: 'qp-3', content: 'c3 post', authorFP: 'fp-alice', channelId: 'alpha', createdAt: 3, score: 3 });

      const alphaPosts = await db.query<PostRecord>('posts', 'channelId', 'alpha');
      expect(alphaPosts.length).toBe(2);
      expect(alphaPosts.every(p => p.channelId === 'alpha')).toBe(true);

      const bobPosts = await db.query<PostRecord>('posts', 'authorFP', 'fp-bob');
      expect(bobPosts.length).toBe(1);
      expect(bobPosts[0].id).toBe('qp-2');
    });
  });

  describe('3. Text Tokenizer (tokenize)', () => {
    it('should tokenize text into lowercase terms', () => {
      const tokens = db.tokenize('Aetheris Omni-Sphere Platform');
      expect(tokens).toContain('aetheris');
      expect(tokens).toContain('omni-sphere');
      expect(tokens).toContain('platform');
    });

    it('should remove diacritics and accents', () => {
      const tokens = db.tokenize('Școală învățământ ZK-Puls securitate');
      expect(tokens).toContain('scoala');
      expect(tokens).toContain('invatamant');
      expect(tokens).toContain('zk-puls');
      expect(tokens).toContain('securitate');
    });

    it('should filter out stop words (English and Romanian)', () => {
      const tokens = db.tokenize('this is a verified advisory for the network and din nou pentru securitate');
      expect(tokens).not.toContain('this');
      expect(tokens).not.toContain('is');
      expect(tokens).not.toContain('a');
      expect(tokens).not.toContain('for');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('and');
      expect(tokens).not.toContain('din');
      expect(tokens).not.toContain('pentru');
      expect(tokens).toContain('verified');
      expect(tokens).toContain('advisory');
      expect(tokens).toContain('network');
      expect(tokens).toContain('securitate');
    });

    it('should filter out single character tokens', () => {
      const tokens = db.tokenize('x y z hello w world');
      expect(tokens).toEqual(['hello', 'world']);
    });

    it('should handle empty or invalid inputs', () => {
      expect(db.tokenize('')).toEqual([]);
      expect(db.tokenize('   ')).toEqual([]);
      expect(db.tokenize(null as unknown as string)).toEqual([]);
      expect(db.tokenize(undefined as unknown as string)).toEqual([]);
    });
  });

  describe('4. TF-IDF Indexing & Full-Text Search (indexPost & searchPosts)', () => {
    beforeEach(async () => {
      await db.clear('posts');
      await db.clear('search_index');
    });

    it('should index a post and generate term frequency index record', async () => {
      const post = {
        id: 'post-search-1',
        title: 'Post-Quantum Lattice Cryptography',
        content: 'Kyber and Dilithium algorithms implemented with zero knowledge proof verification.',
        tags: ['post-quantum', 'kyber', 'lattice'],
        flair: 'SECURITY ADVISORY',
        authorFP: 'fp-crypto-master',
        score: 100
      };

      await db.indexPost(post);

      // Verify post was saved in 'posts'
      const savedPost = await db.get<PostRecord>('posts', 'post-search-1');
      expect(savedPost).not.toBeNull();
      expect(savedPost?.title).toBe('Post-Quantum Lattice Cryptography');

      // Verify term frequencies saved in 'search_index'
      const indexEntry = await db.get<SearchIndexRecord>('search_index', 'post-search-1');
      expect(indexEntry).not.toBeNull();
      expect(indexEntry?.postId).toBe('post-search-1');
      expect(indexEntry?.tokens).toContain('lattice');
      expect(indexEntry?.tokens).toContain('cryptography');
      expect(indexEntry?.tokens).toContain('kyber');
      expect(indexEntry?.tfidf['kyber']).toBeGreaterThan(0);
    });

    it('should return all posts sorted by creation date when search query is empty', async () => {
      await db.indexPost({ id: 'p-old', title: 'Older Post', content: 'Content', createdAt: 1000 });
      await db.indexPost({ id: 'p-new', title: 'Newer Post', content: 'Content', createdAt: 9000 });
      await db.indexPost({ id: 'p-mid', title: 'Middle Post', content: 'Content', createdAt: 5000 });

      const results = await db.searchPosts('');
      expect(results.length).toBe(3);
      expect(results[0].id).toBe('p-new');
      expect(results[1].id).toBe('p-mid');
      expect(results[2].id).toBe('p-old');
    });

    it('should find posts by keyword and assign search relevance scores', async () => {
      await db.indexPost({
        id: 'post-audio',
        title: 'Spatial Audio DSP Synthesizer',
        content: 'Web Audio API spatial 3D audio listener node positioning.'
      });

      await db.indexPost({
        id: 'post-zk',
        title: 'Zero Knowledge Merkle Tree Validator',
        content: 'Merkle tree root verification using Groth16 SNARK proofs.'
      });

      await db.indexPost({
        id: 'post-p2p',
        title: 'WebRTC P2P Gossip Mesh Protocol',
        content: 'Decentralized peer discovery using epidemic gossip and Kademlia DHT.'
      });

      const audioResults = await db.searchPosts('spatial audio synthesizer');
      expect(audioResults.length).toBeGreaterThanOrEqual(1);
      expect(audioResults[0].id).toBe('post-audio');
      expect(audioResults[0]._searchScore).toBeGreaterThan(0);

      const zkResults = await db.searchPosts('merkle snark');
      expect(zkResults.length).toBeGreaterThanOrEqual(1);
      expect(zkResults[0].id).toBe('post-zk');

      const dhtResults = await db.searchPosts('kademlia gossip');
      expect(dhtResults.length).toBeGreaterThanOrEqual(1);
      expect(dhtResults[0].id).toBe('post-p2p');
    });

    it('should rank documents with higher term frequency or unique terms higher', async () => {
      await db.indexPost({
        id: 'post-mentions-once',
        title: 'General Update',
        content: 'We added security to the client UI today.'
      });

      await db.indexPost({
        id: 'post-mentions-multiple',
        title: 'Security Vulnerability Advisory: Security Hardening',
        content: 'Security protocol patch for security validation of zero knowledge keys.'
      });

      const results = await db.searchPosts('security');
      expect(results.length).toBe(2);
      expect(results[0].id).toBe('post-mentions-multiple');
      expect(results[0]._searchScore).toBeGreaterThan(results[1]._searchScore);
    });

    it('should return empty list when no matches are found', async () => {
      await db.indexPost({ id: 'p-1', title: 'React Tailwind App', content: 'Frontend development' });

      const results = await db.searchPosts('nonexistentxyzterm123');
      expect(results).toEqual([]);
    });
  });

  describe('5. Database Export & Import', () => {
    it('should export all stores to JSON structure and import back', async () => {
      await db.clear('posts');
      await db.clear('drafts');
      await db.clear('preferences');

      await db.put<PostRecord>('posts', { id: 'exp-p1', title: 'Export Post', content: 'Exp', authorFP: 'fp', channelId: 'c', createdAt: 1, score: 0 });
      await db.put<DraftRecord>('drafts', { key: 'exp-d1', title: 'Export Draft', content: 'Exp', updatedAt: 1 });
      await db.put<PreferenceRecord>('preferences', { key: 'theme', value: 'cyberpunk-neon', updatedAt: 1 });

      const exported = await db.exportDatabase();
      expect(exported.posts.length).toBe(1);
      expect(exported.drafts.length).toBe(1);
      expect(exported.preferences.length).toBe(1);

      // Create new clean DB and import
      const newDB = new AetherisDB();
      await newDB.clear('posts');
      await newDB.clear('drafts');
      await newDB.clear('preferences');

      await newDB.importDatabase(exported);

      const importedPost = await newDB.get<PostRecord>('posts', 'exp-p1');
      expect(importedPost).not.toBeNull();
      expect(importedPost?.title).toBe('Export Post');

      const importedDraft = await newDB.get<DraftRecord>('drafts', 'exp-d1');
      expect(importedDraft?.title).toBe('Export Draft');
    });
  });

  describe('6. Stats & UI Status Widget Rendering', () => {
    it('should calculate DBStats with store breakdowns and storage format', async () => {
      await db.clear('posts');
      await db.clear('drafts');

      await db.put('posts', { id: 'stat-p1', content: 'a', authorFP: 'f', channelId: 'c', createdAt: 1, score: 0 });
      await db.put('posts', { id: 'stat-p2', content: 'b', authorFP: 'f', channelId: 'c', createdAt: 2, score: 0 });
      await db.put('drafts', { key: 'stat-d1', title: 't', content: 'c', updatedAt: 1 });

      const stats: DBStats = await db.getStats();
      expect(stats.dbName).toBe('aetheris_omnisphere_db');
      expect(stats.version).toBe(1);
      expect(stats.stores.posts).toBe(2);
      expect(stats.stores.drafts).toBe(1);
      expect(stats.totalDocuments).toBeGreaterThanOrEqual(3);
      expect(stats.storageFormatted).toContain('/');
    });

    it('should render database status widget markup with cyberpunk styling and metric grid', () => {
      const widgetHtml = db.renderDBStatusWidget();

      expect(widgetHtml).toContain('id="aetheris-db-status-card"');
      expect(widgetHtml).toContain('bg-surface-raised');
      expect(widgetHtml).toContain('text-cyphr');
      expect(widgetHtml).toContain('Zero-Knowledge Local DB');
      expect(widgetHtml).toContain('TF-IDF');
      expect(widgetHtml).toContain('posts');
      expect(widgetHtml).toContain('messages');
      expect(widgetHtml).toContain('drafts');
      expect(widgetHtml).toContain('bookmarks');
      expect(widgetHtml).toContain('id="btn-refresh-db-stats"');
      expect(widgetHtml).toContain('Sync Stats');
    });
  });
});
