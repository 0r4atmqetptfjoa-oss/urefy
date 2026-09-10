/**
 * UREfy Local IndexedDB Storage Engine
 * High-performance, 100% functional client-side storage replacing localStorage for large datasets.
 * Features TF-IDF vector-space full-text indexing, multi-store transactions, and status monitoring.
 */

import './window-augmentation.js';
import { serviceRegistry, SERVICES } from './service-registry.js';

export interface PostRecord {
  id: string;
  content: string;
  authorFP: string;
  channelId: string;
  createdAt: number;
  score: number;
  title?: string;
  flair?: 'VERIFIED RELEASE' | 'SECURITY ADVISORY' | 'TECH DISCUSSION' | 'MICRO-PULSE' | 'ASK COMMUNITY' | string;
  tags?: string[];
  replyCount?: number;
  boostCount?: number;
  meritVotes?: number;
  userVoted?: number;
  attachment?: {
    fileName: string;
    sha256: string;
    byteSize: number;
    entropy: number;
    verdict: string;
    merkleRoot: string;
  };
  [key: string]: any;
}

export interface DraftRecord {
  key: string;
  content: string;
  title: string;
  updatedAt: number;
  channelId?: string;
  flair?: string;
  tags?: string[];
  [key: string]: any;
}

export interface BookmarkRecord {
  id: string;
  postId: string;
  tags: string[];
  notes: string;
  savedAt: number;
  postSnapshot?: Partial<PostRecord>;
  [key: string]: any;
}

export interface MessageRecord {
  id: string;
  channelId: string;
  content: string;
  authorFP: string;
  timestamp: number;
  encryptedPayload?: string;
  isMine?: boolean;
  status?: string;
  [key: string]: any;
}

export interface PreferenceRecord {
  key: string;
  value: any;
  updatedAt: number;
  [key: string]: any;
}

export interface SearchIndexRecord {
  id: string;
  postId: string;
  tokens: string[];
  tfidf: Record<string, number>;
  totalTokens?: number;
  updatedAt?: number;
  [key: string]: any;
}

export interface AetherisDBSchema {
  posts: PostRecord;
  drafts: DraftRecord;
  bookmarks: BookmarkRecord;
  messages: MessageRecord;
  preferences: PreferenceRecord;
  search_index: SearchIndexRecord;
}

export type StoreName = keyof AetherisDBSchema;

export interface DBStats {
  isOpen: boolean;
  dbName: string;
  version: number;
  stores: Record<string, number>;
  totalDocuments: number;
  estimatedBytes: number;
  quotaBytes: number;
  usagePercent: number;
  storageFormatted: string;
}

const STOP_WORDS: Set<string> = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does',
  'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t',
  'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t',
  'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve',
  'your', 'yours', 'yourself', 'yourselves', 'si', 'la', 'in', 'cu', 'pe', 'de', 'din', 'pentru'
]);

export class AetherisDB {
  public db: IDBDatabase | null = null;
  public version: number = 1;
  public readonly dbName: string = 'aetheris_omnisphere_db';
  private initPromise: Promise<void> | null = null;

  // In-memory fallback map for non-browser/SSR environments
  private memoryFallback: Map<string, Map<string, any>> = new Map();

  constructor() {
    this.initFallbackStores();
  }

  private initFallbackStores(): void {
    const storeNames: StoreName[] = ['posts', 'drafts', 'bookmarks', 'messages', 'preferences', 'search_index'];
    for (const name of storeNames) {
      if (!this.memoryFallback.has(name)) {
        this.memoryFallback.set(name, new Map<string, any>());
      }
    }
  }

  /**
   * Opens or initializes the IndexedDB database with all object stores and secondary indexes.
   */
  public async open(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        // Fallback gracefully to in-memory store in non-browser environments
        this.initFallbackStores();
        resolve();
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Posts Object Store
        if (!db.objectStoreNames.contains('posts')) {
          const postStore = db.createObjectStore('posts', { keyPath: 'id' });
          postStore.createIndex('channelId', 'channelId', { unique: false });
          postStore.createIndex('authorFP', 'authorFP', { unique: false });
          postStore.createIndex('createdAt', 'createdAt', { unique: false });
          postStore.createIndex('score', 'score', { unique: false });
          postStore.createIndex('flair', 'flair', { unique: false });
        }

        // 2. Drafts Object Store
        if (!db.objectStoreNames.contains('drafts')) {
          const draftStore = db.createObjectStore('drafts', { keyPath: 'key' });
          draftStore.createIndex('channelId', 'channelId', { unique: false });
          draftStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 3. Bookmarks Object Store
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bookmarkStore.createIndex('postId', 'postId', { unique: false });
          bookmarkStore.createIndex('savedAt', 'savedAt', { unique: false });
        }

        // 4. Messages Object Store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('channelId', 'channelId', { unique: false });
          messageStore.createIndex('authorFP', 'authorFP', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 5. Preferences Object Store
        if (!db.objectStoreNames.contains('preferences')) {
          const prefStore = db.createObjectStore('preferences', { keyPath: 'key' });
          prefStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 6. Search Index Object Store
        if (!db.objectStoreNames.contains('search_index')) {
          const searchStore = db.createObjectStore('search_index', { keyPath: 'id' });
          searchStore.createIndex('postId', 'postId', { unique: false });
          searchStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
        };
        resolve();
      };

      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        // Fallback to memory store if IndexedDB access is blocked or restricted
        this.initFallbackStores();
        resolve();
      };

      request.onblocked = () => {
        resolve();
      };
    });

    return this.initPromise;
  }

  /**
   * Internal guard ensuring database is initialized before executing operations.
   */
  private async ensureOpen(): Promise<void> {
    if (!this.db && typeof window !== 'undefined' && window.indexedDB) {
      await this.open();
    }
  }

  /**
   * Inserts or updates a record in the specified object store.
   */
  public async put<T>(store: string, record: T): Promise<void> {
    await this.ensureOpen();

    if (!this.db) {
      if (!this.memoryFallback.has(store)) {
        this.memoryFallback.set(store, new Map());
      }
      const rec = record as any;
      const key = rec.id || rec.key || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this.memoryFallback.get(store)!.set(key, record);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readwrite');
        const objectStore = tx.objectStore(store);
        const request = objectStore.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to put record into ${store}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves a single record by primary key.
   */
  public async get<T>(store: string, key: string): Promise<T | null> {
    await this.ensureOpen();

    if (!this.db) {
      const storeMap = this.memoryFallback.get(store);
      return (storeMap?.get(key) as T) || null;
    }

    return new Promise<T | null>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readonly');
        const objectStore = tx.objectStore(store);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          resolve(request.result !== undefined ? (request.result as T) : null);
        };
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to get key ${key} from ${store}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Retrieves all records from the specified object store.
   */
  public async getAll<T>(store: string): Promise<T[]> {
    await this.ensureOpen();

    if (!this.db) {
      const storeMap = this.memoryFallback.get(store);
      if (!storeMap) return [];
      return Array.from(storeMap.values()) as T[];
    }

    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readonly');
        const objectStore = tx.objectStore(store);
        const request = objectStore.getAll();

        request.onsuccess = () => {
          resolve((request.result as T[]) || []);
        };
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to getAll from ${store}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Deletes a record from the specified object store by key.
   */
  public async delete(store: string, key: string): Promise<void> {
    await this.ensureOpen();

    if (!this.db) {
      const storeMap = this.memoryFallback.get(store);
      if (storeMap) storeMap.delete(key);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readwrite');
        const objectStore = tx.objectStore(store);
        const request = objectStore.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to delete key ${key} from ${store}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Queries records using a secondary index and key value.
   */
  public async query<T>(store: string, index: string, value: IDBValidKey): Promise<T[]> {
    await this.ensureOpen();

    if (!this.db) {
      const storeMap = this.memoryFallback.get(store);
      if (!storeMap) return [];
      const results: T[] = [];
      for (const item of storeMap.values()) {
        if (item && item[index] === value) {
          results.push(item);
        }
      }
      return results;
    }

    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readonly');
        const objectStore = tx.objectStore(store);
        const idx = objectStore.index(index);
        const request = idx.getAll(value);

        request.onsuccess = () => {
          resolve((request.result as T[]) || []);
        };
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to query ${store} by index ${index}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Clears all records from a given object store.
   */
  public async clear(store: string): Promise<void> {
    await this.ensureOpen();

    if (!this.db) {
      const storeMap = this.memoryFallback.get(store);
      if (storeMap) storeMap.clear();
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readwrite');
        const objectStore = tx.objectStore(store);
        const request = objectStore.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to clear store ${store}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Counts the total number of records in an object store.
   */
  public async count(store: string): Promise<number> {
    await this.ensureOpen();

    if (!this.db) {
      const storeMap = this.memoryFallback.get(store);
      return storeMap ? storeMap.size : 0;
    }

    return new Promise<number>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readonly');
        const objectStore = tx.objectStore(store);
        const request = objectStore.count();

        request.onsuccess = () => {
          resolve(request.result || 0);
        };
        request.onerror = () => reject(request.error || new Error(`IndexedDB: Failed to count records in ${store}`));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Batch inserts or updates multiple records in a single transaction.
   */
  public async putBatch<T>(store: string, records: T[]): Promise<void> {
    if (records.length === 0) return;
    await this.ensureOpen();

    if (!this.db) {
      for (const rec of records) {
        await this.put(store, rec);
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(store, 'readwrite');
        const objectStore = tx.objectStore(store);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error(`IndexedDB: Batch put failed for ${store}`));

        for (const record of records) {
          objectStore.put(record);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Tokenizes text into normalized, clean, diacritic-free terms filtering out stop words.
   */
  public tokenize(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .map(term => term.trim())
      .filter(term => term.length >= 2 && !STOP_WORDS.has(term));
  }

  /**
   * Tokenizes and indexes a post into the local search index using TF-IDF term vectors.
   */
  public async indexPost(post: any): Promise<void> {
    if (!post) return;
    const postId = String(post.id || (post.key ? post.key : `post_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`));
    
    // Ensure the post is stored in the posts store
    const fullPost: PostRecord = {
      id: postId,
      content: post.content || '',
      authorFP: post.authorFP || post.authorFingerprint || 'anon',
      channelId: post.channelId || 'general',
      createdAt: post.createdAt || Date.now(),
      score: typeof post.score === 'number' ? post.score : (post.meritVotes || 0),
      title: post.title || '',
      flair: post.flair || 'TECH DISCUSSION',
      tags: Array.isArray(post.tags) ? post.tags : [],
      replyCount: post.replyCount || 0,
      boostCount: post.boostCount || 0,
      attachment: post.attachment
    };

    await this.put<PostRecord>('posts', fullPost);

    // Build indexing text
    const textCorpus = [
      fullPost.title || '',
      fullPost.content || '',
      (fullPost.tags || []).join(' '),
      fullPost.flair || '',
      fullPost.authorFP || ''
    ].join(' ');

    const tokens = this.tokenize(textCorpus);
    const termCounts: Record<string, number> = {};
    for (const token of tokens) {
      termCounts[token] = (termCounts[token] || 0) + 1;
    }

    const totalTokens = tokens.length || 1;
    const tfMap: Record<string, number> = {};
    for (const [token, count] of Object.entries(termCounts)) {
      // Normalized Term Frequency
      tfMap[token] = count / totalTokens;
    }

    const indexEntry: SearchIndexRecord = {
      id: postId,
      postId: postId,
      tokens: Object.keys(termCounts),
      tfidf: tfMap,
      totalTokens,
      updatedAt: Date.now()
    };

    await this.put<SearchIndexRecord>('search_index', indexEntry);
  }

  /**
   * Searches posts using full-text BM25 / TF-IDF scoring and returns relevant posts sorted descending.
   */
  public async searchPosts(query: string): Promise<any[]> {
    await this.ensureOpen();
    const queryTokens = this.tokenize(query);

    // If query is empty, return all posts ordered by creation time descending
    if (queryTokens.length === 0) {
      const allPosts = await this.getAll<PostRecord>('posts');
      return allPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    const allIndexes = await this.getAll<SearchIndexRecord>('search_index');
    if (allIndexes.length === 0) {
      // If index is empty, try on-the-fly search over posts directly
      const rawPosts = await this.getAll<PostRecord>('posts');
      const matches = rawPosts.filter(p => {
        const contentMatch = p.content && p.content.toLowerCase().includes(query.toLowerCase());
        const titleMatch = p.title && p.title.toLowerCase().includes(query.toLowerCase());
        return contentMatch || titleMatch;
      });
      return matches;
    }

    const N = allIndexes.length;
    
    // 1. Calculate Document Frequency (DF) for each query token
    const docFrequency: Record<string, number> = {};
    for (const token of queryTokens) {
      let count = 0;
      for (const idx of allIndexes) {
        if (idx.tokens && idx.tokens.includes(token)) {
          count++;
        }
      }
      docFrequency[token] = count;
    }

    // 2. Score each document based on TF-IDF
    const scoredDocs: { postId: string; score: number }[] = [];

    for (const idx of allIndexes) {
      let docScore = 0;
      for (const token of queryTokens) {
        const tf = idx.tfidf ? (idx.tfidf[token] || 0) : 0;
        if (tf > 0) {
          const df = docFrequency[token] || 1;
          // Smooth IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          docScore += tf * (idf > 0 ? idf : 0.1);
        }
      }

      if (docScore > 0) {
        scoredDocs.push({ postId: idx.postId || idx.id, score: docScore });
      }
    }

    // Sort by relevance score descending
    scoredDocs.sort((a, b) => b.score - a.score);

    // 3. Fetch matched post records
    const results: any[] = [];
    for (const scored of scoredDocs) {
      const post = await this.get<PostRecord>('posts', scored.postId);
      if (post) {
        results.push({
          ...post,
          _searchScore: parseFloat(scored.score.toFixed(4))
        });
      }
    }

    return results;
  }

  /**
   * Gathers comprehensive database statistics including store counts and storage estimation.
   */
  public async getStats(): Promise<DBStats> {
    await this.ensureOpen();
    const stores: Record<string, number> = {};
    const storeNames: StoreName[] = ['posts', 'drafts', 'bookmarks', 'messages', 'preferences', 'search_index'];
    
    let totalDocs = 0;
    for (const s of storeNames) {
      const c = await this.count(s);
      stores[s] = c;
      totalDocs += c;
    }

    let estimatedBytes = 0;
    let quotaBytes = 50 * 1024 * 1024 * 1024; // Default 50GB quota assumption

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        estimatedBytes = estimate.usage || (totalDocs * 1024);
        quotaBytes = estimate.quota || quotaBytes;
      } catch {
        estimatedBytes = totalDocs * 1024;
      }
    } else {
      estimatedBytes = totalDocs * 1024;
    }

    const usagePercent = quotaBytes > 0 ? parseFloat(((estimatedBytes / quotaBytes) * 100).toFixed(2)) : 0;
    const formatBytes = (b: number) => {
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
      return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    return {
      isOpen: !!this.db,
      dbName: this.dbName,
      version: this.version,
      stores,
      totalDocuments: totalDocs,
      estimatedBytes,
      quotaBytes,
      usagePercent,
      storageFormatted: `${formatBytes(estimatedBytes)} / ${formatBytes(quotaBytes)}`
    };
  }

  /**
   * Generates a fully styled dark-theme status widget for the footer or status bar.
   * Complies with UREfy UI design specs and Tailwind color mappings.
   */
  public renderDBStatusWidget(): string {
    const isOnline = !!this.db;
    const statusDotClass = isOnline ? 'bg-signal shadow-[0_0_8px_#22c55e]' : 'bg-amber shadow-[0_0_8px_#f59e0b]';
    const statusText = isOnline ? 'IDB: ONLINE' : 'IDB: MEMORY';

    return `
      <div id="aetheris-db-status-card" class="bg-surface-raised border border-white/5 rounded-lg p-3 text-xs font-mono select-none transition-all hover:bg-surface-overlay">
        <!-- Header -->
        <div class="flex items-center justify-between border-subtle-b pb-2 mb-2">
          <div class="flex items-center space-x-2">
            <span class="inline-block w-2 h-2 rounded-full ${statusDotClass} animate-pulse"></span>
            <span class="font-bold tracking-wider text-cyphr">${statusText}</span>
            <span class="text-[10px] text-slate-500">v${this.version}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="text-aether text-[10px] font-semibold uppercase tracking-tight">Zero-Knowledge Local DB</span>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-3 gap-2 text-center py-1">
          <div class="bg-surface-base border border-white/5 rounded p-1.5 flex flex-col items-center">
            <span class="text-slate-400 text-[10px] uppercase">Storage</span>
            <span id="db-widget-storage-val" class="text-signal font-semibold mt-0.5">~Dynamic</span>
          </div>
          <div class="bg-surface-base border border-white/5 rounded p-1.5 flex flex-col items-center">
            <span class="text-slate-400 text-[10px] uppercase">Indexed Docs</span>
            <span id="db-widget-docs-val" class="text-cyphr font-semibold mt-0.5">Active</span>
          </div>
          <div class="bg-surface-base border border-white/5 rounded p-1.5 flex flex-col items-center">
            <span class="text-slate-400 text-[10px] uppercase">Vector Engine</span>
            <span class="text-aether font-semibold mt-0.5">TF-IDF</span>
          </div>
        </div>

        <!-- Stores Summary Badges -->
        <div class="mt-2.5 pt-2 border-subtle-b flex flex-wrap gap-1.5 items-center justify-between text-[10px] text-slate-400">
          <div class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-cyphr"></span>
            <span>posts</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-signal"></span>
            <span>messages</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-aether"></span>
            <span>drafts</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber"></span>
            <span>bookmarks</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>search_idx</span>
          </div>
        </div>

        <!-- Controls / Actions -->
        <div class="mt-2.5 flex items-center justify-between pt-1">
          <span class="text-[10px] text-slate-500">Autonomous IndexedDB Sync</span>
          <button 
            id="btn-refresh-db-stats" data-action="call-global" data-raw-click="window.__aetherisRefreshDB && window.__aetherisRefreshDB()" 
            class="px-2 py-0.5 rounded bg-surface-highlight hover:bg-surface-overlay text-cyphr border border-white/10 hover:border-cyphr/30 text-[10px] transition-all cursor-pointer">
            Sync Stats
          </button>
        </div>
      </div>
    `.trim();
  }

  /**
   * Exports the entire database stores to a JSON serializable dictionary.
   */
  public async exportDatabase(): Promise<Record<string, any[]>> {
    await this.ensureOpen();
    const exportData: Record<string, any[]> = {};
    const storeNames: StoreName[] = ['posts', 'drafts', 'bookmarks', 'messages', 'preferences', 'search_index'];
    
    for (const name of storeNames) {
      exportData[name] = await this.getAll(name);
    }
    return exportData;
  }

  /**
   * Imports JSON-exported records into the database with transaction isolation.
   */
  public async importDatabase(data: Record<string, any[]>): Promise<void> {
    await this.ensureOpen();
    for (const [storeName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        await this.putBatch(storeName, records);
      }
    }
  }
}

// Global Singleton Export
export const aethDB = new AetherisDB();
export const indexedDBEngine = aethDB;

serviceRegistry.registerInstance(SERVICES.IndexedDB, aethDB);

// Global Window helper hook for UI refresh if running in browser
if (typeof window !== 'undefined') {
  window.__aetherisDB = aethDB;
  window.__aetherisRefreshDB = async () => {
    try {
      const stats = await aethDB.getStats();
      const storageEl = document.getElementById('db-widget-storage-val');
      const docsEl = document.getElementById('db-widget-docs-val');
      if (storageEl) storageEl.textContent = stats.storageFormatted.split('/')[0].trim();
      if (docsEl) docsEl.textContent = String(stats.totalDocuments);
    } catch (e) {
      console.warn('[AetherisDB] Failed to refresh UI status:', e);
    }
  };
}
