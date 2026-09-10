import { canonicalizeJson } from '@aetheris/core-crypto';
import { requireSignedEnvelope } from './_auth.js';
import { getD1Database, type Env, type D1Database } from './_db.js';

interface ProposalRow {
  id: string;
  author_fingerprint: string;
  title: string;
  description: string;
  category: string;
  quorum: number;
  created_at: number;
  expires_at: number;
  envelope_json: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  voters: number;
}

const scope = 'urefy-governance-v1';
const categories = ['protocol', 'community', 'security', 'funding'];
const choices = ['for', 'against', 'abstain'];
const validId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function snapshot(database: D1Database, fingerprint: string) {
  const rows = await database.prepare(`SELECT proposal.*,
    COALESCE(SUM(vote.choice = 'for'), 0) AS votes_for,
    COALESCE(SUM(vote.choice = 'against'), 0) AS votes_against,
    COALESCE(SUM(vote.choice = 'abstain'), 0) AS votes_abstain,
    COUNT(vote.voter_fingerprint) AS voters
    FROM (SELECT * FROM governance_proposals ORDER BY created_at DESC, id DESC LIMIT 100) proposal
    LEFT JOIN governance_votes vote ON vote.proposal_id = proposal.id
    GROUP BY proposal.id ORDER BY proposal.created_at DESC, proposal.id DESC`).all<ProposalRow>();
  const own = await database.prepare(`SELECT vote.* FROM governance_votes vote
    JOIN (SELECT id FROM governance_proposals ORDER BY created_at DESC, id DESC LIMIT 100) proposal ON proposal.id = vote.proposal_id
    WHERE vote.voter_fingerprint = ?`).bind(fingerprint).all<{ proposal_id: string; voter_fingerprint: string; choice: string; created_at: number; envelope_json: string }>();
  return {
    success: true,
    proposals: rows.results.map(row => ({
      id: row.id, title: row.title, description: row.description, authorFP: row.author_fingerprint,
      category: row.category, quorumRequired: row.quorum, createdAt: row.created_at, expiresAt: row.expires_at,
      status: row.expires_at > Date.now() ? 'active' : row.voters < row.quorum ? 'expired' : row.votes_for > row.votes_against ? 'passed' : 'rejected',
      votes: { for: row.votes_for, against: row.votes_against, abstain: row.votes_abstain, totalVoters: row.voters },
    })),
    myVotes: own.results.map(row => ({ proposalId: row.proposal_id, voterFP: row.voter_fingerprint,
      choice: row.choice, weight: 1, timestamp: row.created_at, signedEnvelope: JSON.parse(row.envelope_json) })),
  };
}

export async function onRequestPost(context: { request: Request; env?: Env }): Promise<Response> {
  const database = getD1Database(context.env);
  if (!database) return json({ success: false, error: 'Governance storage is unavailable' }, 503);
  let envelope;
  try {
    const reader = context.request.body?.getReader();
    if (!reader) throw new Error('Body required');
    const decoder = new TextDecoder();
    let text = '';
    let bytes = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > 64 * 1024) { await reader.cancel(); throw new Error('Body too large'); }
      text += decoder.decode(result.value, { stream: true });
    }
    envelope = JSON.parse(text + decoder.decode());
  } catch { return json({ success: false, error: 'Invalid or oversized governance request' }, 400); }
  const auth = await requireSignedEnvelope(context, envelope);
  if (!auth.authorized) return auth.response!;
  const payload = auth.payload;
  const fingerprint = auth.fingerprint!;
  if (!payload || payload.scope !== scope) return json({ success: false, error: 'Invalid governance scope' }, 400);
  try {
    if (payload.action === 'list') return json(await snapshot(database, fingerprint));
    const role = await database.prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?').bind(fingerprint).first<{ is_quarantined: number }>();
    if (role?.is_quarantined) return json({ success: false, error: 'This identity is restricted' }, 403);
    const freeze = await database.prepare('SELECT value FROM system_config WHERE key = ?').bind('emergencyFreeze').first<{ value: string }>();
    if (freeze?.value === 'true') return json({ success: false, error: 'Governance writes are paused' }, 503);

    if (payload.action === 'create') {
      if (!validId(payload.id) || typeof payload.title !== 'string' || !payload.title.trim() || payload.title.length > 200
        || typeof payload.description !== 'string' || !payload.description.trim() || payload.description.length > 10000
        || !categories.includes(payload.category) || !Number.isInteger(payload.quorum) || payload.quorum < 1 || payload.quorum > 100000
        || !Number.isInteger(payload.durationHours) || payload.durationHours < 1 || payload.durationHours > 720) {
        return json({ success: false, error: 'Invalid proposal fields' }, 400);
      }
      const now = Date.now();
      await database.prepare(`INSERT OR IGNORE INTO governance_proposals
        (id, author_fingerprint, title, description, category, quorum, created_at, expires_at, envelope_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(payload.id, fingerprint, payload.title.trim(), payload.description.trim(),
          payload.category, payload.quorum, now, now + payload.durationHours * 3600000, JSON.stringify(envelope)).run();
      const stored = await database.prepare('SELECT author_fingerprint, envelope_json FROM governance_proposals WHERE id = ?')
        .bind(payload.id).first<{ author_fingerprint: string; envelope_json: string }>();
      if (!stored || stored.author_fingerprint !== fingerprint || canonicalizeJson(JSON.parse(stored.envelope_json).payload) !== canonicalizeJson(payload)) {
        return json({ success: false, error: 'Proposal ID conflict' }, 409);
      }
      return json(await snapshot(database, fingerprint), 201);
    }

    if (payload.action === 'vote') {
      if (!validId(payload.proposalId) || !choices.includes(payload.choice) || Object.keys(payload).some(key => !['scope', 'action', 'proposalId', 'choice'].includes(key))) {
        return json({ success: false, error: 'Invalid ballot; every identity has one vote' }, 400);
      }
      const result = await database.prepare(`INSERT INTO governance_votes (proposal_id, voter_fingerprint, choice, created_at, envelope_json)
        SELECT id, ?, ?, ?, ? FROM governance_proposals WHERE id = ? AND expires_at > ?
        ON CONFLICT(proposal_id, voter_fingerprint) DO UPDATE SET choice = excluded.choice, created_at = excluded.created_at, envelope_json = excluded.envelope_json`)
        .bind(fingerprint, payload.choice, Date.now(), JSON.stringify(envelope), payload.proposalId, Date.now()).run();
      if (!result.meta?.changes) return json({ success: false, error: 'Proposal is unavailable or voting has closed' }, 409);
      return json(await snapshot(database, fingerprint));
    }
    return json({ success: false, error: 'Unknown governance action' }, 400);
  } catch { return json({ success: false, error: 'Governance storage could not complete the request' }, 503); }
}