import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalSearchIndex,
  stemToken,
  levenshteinDistance,
} from '../src/search-index.js';
import type { ClientPost } from '../src/client-state.js';

describe('Phase 2: BM25 Offline Search Engine with Fuzzy Typo-Tolerance', () => {
  let searchIndex: LocalSearchIndex;

  beforeEach(() => {
    searchIndex = new LocalSearchIndex();
  });

  describe('1. Tokenization, Stemming & Levenshtein Distance', () => {
    it('should stem plurals and common suffixes accurately', () => {
      expect(stemToken('relays')).toBe('relay');
      expect(stemToken('nodes')).toBe('node');
      expect(stemToken('encrypted')).toBe('encrypt');
      expect(stemToken('broadcasting')).toBe('broadcast');
      expect(stemToken('cryptography')).toBe('cryptography');
    });

    it('should compute Levenshtein distance correctly', () => {
      expect(levenshteinDistance('crypto', 'crypto')).toBe(0);
      expect(levenshteinDistance('crypto', 'cryto')).toBe(1); // 1 deletion
      expect(levenshteinDistance('crypto', 'cryptos')).toBe(1); // 1 insertion
      expect(levenshteinDistance('crypto', 'crupto')).toBe(1); // 1 substitution
      expect(levenshteinDistance('pipewire', 'pipewir')).toBe(1);
      expect(levenshteinDistance('short', 'completelydifferentword')).toBe(999);
    });

    it('should normalize diacritics while preserving international words', () => {
      expect(searchIndex.tokenize('Criptografie românească și rețele suverane'))
        .toEqual(['criptografie', 'romaneasca', 'si', 'retele', 'suverane']);
      expect(searchIndex.tokenize('暗号化されたネットワーク')).toEqual(['暗号化されたネットワーク']);
    });
  });

  describe('2. Post Indexing & BM25 Scoring', () => {
    const samplePosts: ClientPost[] = [
      {
        id: 'p-pipewire',
        channelId: 'relays-general',
        authorFingerprint: 'id:genesis-core',
        authorRole: 'SENTINEL',
        title: 'Zero-Copy PipeWire & Desktop Duplication Streaming on Ultrawide',
        content: 'Testing hardware-accelerated video streaming with zero telemetry and real-time buffer analysis on sovereign networks.',
        flair: 'TECH DISCUSSION',
        meritVotes: 489,
        replyCount: 12,
        boostCount: 45,
        userVoted: 1,
        isExpanded: false,
        createdAt: 1000,
      },
      {
        id: 'p-treekem',
        channelId: 'relays-general',
        authorFingerprint: 'id:c3dc28cb',
        authorRole: 'NODE OPERATOR',
        title: 'MLS TreeKEM RFC 9420 Formal Verification in Agda',
        content: 'Formally proving asynchronous forward secrecy and post-compromise security across decentralized mesh clusters.',
        flair: 'TECH DISCUSSION',
        meritVotes: 342,
        replyCount: 8,
        boostCount: 20,
        userVoted: 0,
        isExpanded: false,
        createdAt: 2000,
      },
      {
        id: 'p-rln',
        channelId: 'relays-general',
        authorFingerprint: 'id:a89104fa',
        authorRole: 'ARCHON',
        title: 'Zero-Knowledge Rate-Limiting Nullifiers (ZK-RLN) on Edge',
        content: 'Slashing spam on decentralized relays without revealing author identity using Shamir secret sharing.',
        flair: 'SECURITY ADVISORY',
        meritVotes: 276,
        replyCount: 5,
        boostCount: 15,
        userVoted: 0,
        isExpanded: false,
        createdAt: 3000,
      },
    ];

    beforeEach(() => {
      searchIndex.indexPosts(samplePosts);
    });

    it('should index all sample posts correctly', () => {
      expect(searchIndex.size()).toBe(3);
    });

    it('should return exact match with high BM25 score as first result', () => {
      const results = searchIndex.searchPosts('PipeWire');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].doc.id).toBe('p-pipewire');
      expect(results[0].score).toBeGreaterThan(0.5);
    });

    it('should find results with typo tolerance (fuzzy search)', () => {
      // "pipewir" instead of "PipeWire" (1 character difference)
      const results = searchIndex.searchPosts('pipewir');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].doc.id).toBe('p-pipewire');

      // "treekm" instead of "TreeKEM" (1 character difference)
      const results2 = searchIndex.searchPosts('treekm');
      expect(results2.length).toBeGreaterThanOrEqual(1);
      expect(results2[0].doc.id).toBe('p-treekem');
    });

    it('should support prefix queries for search-as-you-type', () => {
      const results = searchIndex.searchPosts('stream');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].doc.id).toBe('p-pipewire');
    });

    it('should filter noise stopwords without diluting search results', () => {
      const resultsWithStopwords = searchIndex.searchPosts('the PipeWire streaming with');
      expect(resultsWithStopwords.length).toBeGreaterThanOrEqual(1);
      expect(resultsWithStopwords[0].doc.id).toBe('p-pipewire');
    });

    it('should generate snippet with HTML <mark> term highlighting', () => {
      const results = searchIndex.searchPosts('PipeWire');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const snippet = results[0].snippet;
      expect(snippet).toContain('<mark');
      expect(snippet).toContain('PipeWire');
    });

    it('should HTML-escape untrusted snippet content before highlighting', () => {
      const snippet = searchIndex.highlightTerms('<img src=x onerror=alert(1)> secure', ['secure']);
      expect(snippet).not.toContain('<img');
      expect(snippet).toContain('&lt;img');
      expect(snippet).toContain('<mark');
    });
  });
});
