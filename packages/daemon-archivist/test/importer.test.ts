import { describe, it, expect } from 'vitest';
import { CommunityImporter } from '../src/importer.js';

describe('1-Click Sovereign Community Importer', () => {
  it('migrates legacy chat JSON export into signed sovereign items', () => {
    const importer = new CommunityImporter();

    const sampleChat = [
      {
        id: '109283748291029384',
        author: { name: 'SovereignDev', id: 'legacy-user-1' },
        content: 'Migrating our community from legacy chat to Aetheris!',
        timestamp: '2026-08-29T14:20:00.000Z',
      },
      {
        id: '109283748291029385',
        author: { name: 'AliceCrypto', id: 'legacy-user-2' },
        content: 'No more Electron bloat and zero KYC exposure.',
        timestamp: '2026-08-29T14:21:00.000Z',
      },
    ];

    const result = importer.importLegacyChatExport('relays-general', sampleChat);

    expect(result.length).toBe(2);
    expect(result[0].id).toBe('legacy-chat-109283748291029384');
    expect(result[0].authorFingerprint.length).toBe(16);
    expect(result[0].ciphertext).toBe('Migrating our community from legacy chat to Aetheris!');
    expect(result[1].ciphertext).toBe('No more Electron bloat and zero KYC exposure.');
  });

  it('migrates legacy forum thread dump into structured Vault format', () => {
    const importer = new CommunityImporter();

    const sampleForum = {
      title: 'Guide: Zero-Knowledge Privacy on Modern Networks',
      author: 'cypherpunk_legend',
      selftext: 'Here is the complete architectural guide for sovereign networking.',
      created_utc: 1724945000,
      comments: [
        {
          author: 'fellow_dev',
          body: 'Great writeup. Especially the ZK-RLN rate-limiting explanation.',
          created_utc: 1724945200,
        },
      ],
    };

    const result = importer.importLegacyForumThread('vault-guides', sampleForum);

    expect(result.mainThread.ciphertext).toContain('Guide: Zero-Knowledge Privacy');
    expect(result.mainThread.authorFingerprint.length).toBe(16);
    expect(result.migratedCommentsCount).toBe(1);
  });
});
