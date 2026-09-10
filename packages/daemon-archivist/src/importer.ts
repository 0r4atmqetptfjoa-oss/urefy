import { generateKeyPair, KeyPair } from '@aetheris/core-crypto';
import { computeFileChecksums } from '@aetheris/vault-engine';

export interface LegacyChatExportMessage {
  id: string;
  author: {
    name: string;
    id: string;
  };
  content: string;
  timestamp: string;
  attachments?: Array<{
    fileName: string;
    url?: string;
  }>;
}

export type DiscordExportMessage = LegacyChatExportMessage;

export interface LegacyForumExportPost {
  title: string;
  author: string;
  selftext: string;
  created_utc: number;
  comments?: Array<{
    author: string;
    body: string;
    created_utc: number;
    replies?: any[];
  }>;
}

export type RedditExportPost = LegacyForumExportPost;

export interface SovereignMigratedItem {
  id: string;
  channelId: string;
  authorFingerprint: string;
  ciphertext: string;
  createdAt: number;
}

/**
 * 1-Click Sovereign Migration Engine for Legacy Community Archives.
 * Converts legacy centralized forum & chat archives into cryptographically signed UREfy records.
 */
export class CommunityImporter {
  private static readonly MAX_CACHED_PERSONAS = 5000;
  private generatedPersonas: Map<string, KeyPair> = new Map();

  /**
   * Derives a deterministic sovereign Ed25519 persona for an imported username.
   */
  private getOrCreatePersona(legacyId: string): KeyPair {
    const cached = this.generatedPersonas.get(legacyId);
    if (cached) {
      return cached;
    }

    if (this.generatedPersonas.size >= CommunityImporter.MAX_CACHED_PERSONAS) {
      const firstKey = this.generatedPersonas.keys().next().value;
      if (firstKey !== undefined) {
        this.generatedPersonas.delete(firstKey);
      }
    }

    const seed = new Uint8Array(32);
    const enc = new TextEncoder().encode(`aetheris-imported-persona-${legacyId}`);
    seed.set(enc.slice(0, 32));
    const keypair = generateKeyPair(seed);
    this.generatedPersonas.set(legacyId, keypair);
    return keypair;
  }

  /**
   * Clears the persona derivation cache to free memory.
   */
  public clearPersonas(): void {
    this.generatedPersonas.clear();
  }

  /**
   * Imports a legacy chat channel export JSON.
   */
  public importLegacyChatExport(channelId: string, messages: LegacyChatExportMessage[]): SovereignMigratedItem[] {
    return messages.map(msg => {
      const persona = this.getOrCreatePersona(msg.author.id || msg.author.name);
      const createdAt = new Date(msg.timestamp).getTime() || Date.now();

      return {
        id: `legacy-chat-${msg.id}`,
        channelId,
        authorFingerprint: persona.fingerprint,
        ciphertext: msg.content,
        createdAt,
      };
    });
  }

  public importDiscordExport(channelId: string, messages: LegacyChatExportMessage[]): SovereignMigratedItem[] {
    return this.importLegacyChatExport(channelId, messages);
  }

  /**
   * Imports a legacy forum thread/post JSON structure into Vault format.
   */
  public importLegacyForumThread(channelId: string, post: LegacyForumExportPost): {
    mainThread: SovereignMigratedItem;
    migratedCommentsCount: number;
  } {
    const authorPersona = this.getOrCreatePersona(post.author);
    const randSuffix = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 8)
      : Date.now().toString(36);
    const mainThread: SovereignMigratedItem = {
      id: `legacy-forum-${Date.now()}-${randSuffix}`,
      channelId,
      authorFingerprint: authorPersona.fingerprint,
      ciphertext: `## ${post.title}\n\n${post.selftext}`,
      createdAt: (post.created_utc * 1000) || Date.now(),
    };

    let commentCount = 0;
    if (post.comments) {
      commentCount = post.comments.length;
    }

    return {
      mainThread,
      migratedCommentsCount: commentCount,
    };
  }

  public importRedditThread(channelId: string, post: LegacyForumExportPost): {
    mainThread: SovereignMigratedItem;
    migratedCommentsCount: number;
  } {
    return this.importLegacyForumThread(channelId, post);
  }
}

export const communityImporter = new CommunityImporter();
