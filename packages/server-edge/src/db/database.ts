import { DatabaseSync } from 'node:sqlite';

export interface IdentityRecord {
  fingerprint: string;
  publicKeyHex: string;
  nullifier: string;
  role: string;
  isQuarantined: number;
  createdAt: number;
}

export interface ChannelRecord {
  id: string;
  space: 'relays' | 'vault' | 'pulse';
  name: string;
  description: string;
  isEncrypted: number;
  createdAt: number;
}

export interface MessageRecord {
  id: string;
  channelId: string;
  authorFingerprint: string;
  ciphertext: string;
  iv: string;
  epoch: string;
  x: string;
  y: string;
  nullifier: string;
  signature: string;
  status: 'VISIBLE' | 'HIDDEN' | 'DELETED';
  createdAt: number;
}

export interface NanopublicationRecord {
  id: string;
  channelId: string;
  title: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  crc32: string;
  entropy: number;
  verdict: string;
  merkleRoot: string;
  seederCount: number;
  createdAt: number;
}

export interface AuditRecord {
  id?: number;
  actionType: string;
  actorFingerprint: string;
  targetId: string;
  payloadJson: string;
  timestamp: number;
}

export interface RevocationRecord {
  nullifier: string;
  breachedEpoch: string;
  timestamp: number;
}

export class AetherisDatabase {
  private db: DatabaseSync;

  constructor(dbPath: string = ':memory:') {
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS identities (
        fingerprint TEXT PRIMARY KEY,
        publicKeyHex TEXT NOT NULL,
        nullifier TEXT NOT NULL,
        role TEXT DEFAULT 'MEMBER',
        isQuarantined INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        space TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        isEncrypted INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        channelId TEXT NOT NULL,
        authorFingerprint TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        epoch TEXT NOT NULL,
        x TEXT NOT NULL,
        y TEXT NOT NULL,
        nullifier TEXT NOT NULL,
        signature TEXT NOT NULL,
        status TEXT DEFAULT 'VISIBLE',
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nanopublications (
        id TEXT PRIMARY KEY,
        channelId TEXT NOT NULL,
        title TEXT NOT NULL,
        fileName TEXT NOT NULL,
        byteSize INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        crc32 TEXT NOT NULL,
        entropy REAL NOT NULL,
        verdict TEXT NOT NULL,
        merkleRoot TEXT NOT NULL,
        seederCount INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS revocations (
        nullifier TEXT PRIMARY KEY,
        breachedEpoch TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actionType TEXT NOT NULL,
        actorFingerprint TEXT NOT NULL,
        targetId TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_channel_status_created ON messages(channelId, status, createdAt);
      CREATE INDEX IF NOT EXISTS idx_nanopublications_channel_created ON nanopublications(channelId, createdAt);
      CREATE INDEX IF NOT EXISTS idx_identities_nullifier ON identities(nullifier);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    `);

    // Seed default channels if empty
    this.seedDefaultChannels();
  }

  private seedDefaultChannels(): void {
    const check = this.db.prepare('SELECT count(*) as count FROM channels').get() as { count: number };
    if (check.count === 0) {
      const stmt = this.db.prepare(`
        INSERT INTO channels (id, space, name, description, isEncrypted, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const now = Date.now();
      stmt.run('relays-general', 'relays', 'general', 'Sovereign E2EE live voice & text', 1, now);
      stmt.run('relays-dev', 'relays', 'dev-core', 'Core cryptography & low-level discussions', 1, now);
      stmt.run('vault-releases', 'vault', 'releases', 'Verified software releases & clean binaries', 0, now);
      stmt.run('vault-guides', 'vault', 'security-guides', 'In-depth research, reversing & operational security', 0, now);
      stmt.run('pulse-global', 'pulse', 'chrono-feed', 'Uncensored chronological sovereign microblogging', 0, now);
    }
  }

  // Identity methods
  public upsertIdentity(id: IdentityRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO identities (fingerprint, publicKeyHex, nullifier, role, isQuarantined, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(fingerprint) DO UPDATE SET
        role = excluded.role,
        isQuarantined = excluded.isQuarantined
    `);
    stmt.run(id.fingerprint, id.publicKeyHex, id.nullifier, id.role, id.isQuarantined, id.createdAt);
  }

  public getIdentity(fingerprint: string): IdentityRecord | undefined {
    const stmt = this.db.prepare('SELECT * FROM identities WHERE fingerprint = ?');
    return stmt.get(fingerprint) as IdentityRecord | undefined;
  }

  public setQuarantine(nullifier: string, isQuarantined: boolean): void {
    const stmt = this.db.prepare('UPDATE identities SET isQuarantined = ? WHERE nullifier = ?');
    stmt.run(isQuarantined ? 1 : 0, nullifier);
  }

  // Channel methods
  public getChannels(space?: string): ChannelRecord[] {
    if (space) {
      const stmt = this.db.prepare('SELECT * FROM channels WHERE space = ? ORDER BY createdAt ASC');
      return stmt.all(space) as unknown as ChannelRecord[];
    }
    const stmt = this.db.prepare('SELECT * FROM channels ORDER BY createdAt ASC');
    return stmt.all() as unknown as ChannelRecord[];
  }

  // Message methods
  public insertMessage(msg: MessageRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, channelId, authorFingerprint, ciphertext, iv, epoch, x, y, nullifier, signature, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.id,
      msg.channelId,
      msg.authorFingerprint,
      msg.ciphertext,
      msg.iv,
      msg.epoch,
      msg.x,
      msg.y,
      msg.nullifier,
      msg.signature,
      msg.status,
      msg.createdAt
    );
  }

  public getMessages(channelId: string, limit: number = 50): MessageRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE channelId = ? AND status = 'VISIBLE'
      ORDER BY createdAt ASC 
      LIMIT ?
    `);
    return stmt.all(channelId, limit) as unknown as MessageRecord[];
  }

  public updateMessageStatus(id: string, status: 'VISIBLE' | 'HIDDEN' | 'DELETED'): void {
    const stmt = this.db.prepare('UPDATE messages SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  // Nanopublications
  public insertNanopublication(nano: NanopublicationRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO nanopublications (id, channelId, title, fileName, byteSize, sha256, crc32, entropy, verdict, merkleRoot, seederCount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      nano.id,
      nano.channelId,
      nano.title,
      nano.fileName,
      nano.byteSize,
      nano.sha256,
      nano.crc32,
      nano.entropy,
      nano.verdict,
      nano.merkleRoot,
      nano.seederCount,
      nano.createdAt
    );
  }

  public getNanopublications(channelId?: string): NanopublicationRecord[] {
    if (channelId) {
      const stmt = this.db.prepare('SELECT * FROM nanopublications WHERE channelId = ? ORDER BY createdAt DESC');
      return stmt.all(channelId) as unknown as NanopublicationRecord[];
    }
    const stmt = this.db.prepare('SELECT * FROM nanopublications ORDER BY createdAt DESC');
    return stmt.all() as unknown as NanopublicationRecord[];
  }

  // Revocations (RLN Slashing table)
  public addRevocation(rev: RevocationRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO revocations (nullifier, breachedEpoch, timestamp)
      VALUES (?, ?, ?)
    `);
    stmt.run(rev.nullifier, rev.breachedEpoch, rev.timestamp);
    this.setQuarantine(rev.nullifier, true);
  }

  public isRevoked(nullifier: string): boolean {
    const stmt = this.db.prepare('SELECT count(*) as count FROM revocations WHERE nullifier = ?');
    const result = stmt.get(nullifier) as { count: number };
    return result.count > 0;
  }

  // Audit Log
  public recordAudit(audit: AuditRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (actionType, actorFingerprint, targetId, payloadJson, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(audit.actionType, audit.actorFingerprint, audit.targetId, audit.payloadJson, audit.timestamp);
  }

  public getAuditActionsByActor(actorFingerprint: string, sinceTimestamp: number): AuditRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_log 
      WHERE actorFingerprint = ? AND timestamp >= ?
      ORDER BY timestamp DESC
    `);
    return stmt.all(actorFingerprint, sinceTimestamp) as unknown as AuditRecord[];
  }

  public close(): void {
    this.db.close();
  }
}
