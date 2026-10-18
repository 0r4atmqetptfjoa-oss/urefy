import type { D1Database } from './_db.js';

export const SUPPORTED_REACTIONS = ['👍', '🔥', '❤️', '⚡', '💡', '🛡️', '🎯', '🚀', '🤔', '🎉'] as const;
export const SUPPORTED_AWARDS = ['SILVER', 'GOLD', 'GUARDIAN_CHOICE', 'ZK_VERIFIED', 'PLATINUM', 'BRONZE', 'COMMUNITY_PICK'] as const;

/** Each desired-state write and its denormalized counter commit in one D1 transaction. */
export async function setPostInteraction(db: D1Database, fingerprint: string, body: Record<string, any>): Promise<Response> {
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  const { targetId, action, active, value } = body;
  const targetType = body.targetType || 'post';

  if (
    body.scope !== 'urefy-interaction-v1' ||
    !['post', 'comment'].includes(targetType) ||
    typeof targetId !== 'string' ||
    !targetId ||
    targetId.length > 256 ||
    typeof active !== 'boolean' ||
    !['like', 'repost', 'bookmark', 'reaction', 'award'].includes(action)
  ) {
    return json({ success: false, error: 'Invalid interaction payload' }, 400);
  }

  if (targetType === 'comment' && !['like', 'award'].includes(action)) {
    return json({ success: false, error: 'Only likes and awards are supported on comments' }, 400);
  }

  if (action === 'reaction' && !SUPPORTED_REACTIONS.includes(value)) {
    return json({ success: false, error: 'Choose a supported reaction' }, 400);
  }

  if (action === 'award' && !SUPPORTED_AWARDS.includes(value)) {
    return json({ success: false, error: 'Choose a supported award tier' }, 400);
  }

  // Check quarantine status
  const role = await db.prepare('SELECT is_quarantined FROM user_roles WHERE fingerprint = ?').bind(fingerprint).first<{ is_quarantined: number }>();
  if (role?.is_quarantined) {
    return json({ success: false, error: 'This account cannot interact while restricted' }, 403);
  }

  // Target validation
  let targetAuthorId = '';
  if (targetType === 'post') {
    const post = await db.prepare("SELECT id, author_id FROM posts WHERE id = ? AND status IN ('published', 'pinned')").bind(targetId).first<{ id: string; author_id: string }>();
    if (!post) return json({ success: false, error: 'This post is no longer available' }, 404);
    targetAuthorId = post.author_id;
  } else {
    const comment = await db.prepare("SELECT c.id, c.author_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = ? AND p.status IN ('published', 'pinned')").bind(targetId).first<{ id: string; author_id: string }>();
    if (!comment) return json({ success: false, error: 'This comment is no longer available' }, 404);
    targetAuthorId = comment.author_id;
  }

  // Award rules: anti-self-awarding & anti-duplicate
  if (action === 'award') {
    if (targetAuthorId && targetAuthorId === fingerprint) {
      return json({ success: false, error: `You cannot award your own ${targetType}` }, 400);
    }
    const existingAward = await db.prepare(
      'SELECT id FROM interactions WHERE target_type = ? AND target_id = ? AND user_fingerprint = ? AND interaction_type = ? AND value = ?'
    ).bind(targetType, targetId, fingerprint, 'award', value).first();
    if (existingAward) {
      return json({ success: false, error: 'You have already bestowed this award tier' }, 400);
    }

    const awardId = `act_${crypto.randomUUID()}`;
    const statements = [
      db.prepare(
        'INSERT INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(awardId, targetType, targetId, fingerprint, 'award', value, Date.now()),
      db.prepare(
        'SELECT COUNT(*) AS cnt FROM interactions WHERE target_type = ? AND target_id = ? AND interaction_type = ?'
      ).bind(targetType, targetId, 'award'),
    ];
    const results = await db.batch(statements);
    if (results.some(result => result.success === false)) throw new Error('Award transaction failed');
    const count = Number((results.at(-1)?.results?.[0] as any)?.cnt) || 0;
    return json({ success: true, targetId, targetType, action: 'award', active: true, value, newCount: count });
  }

  // Standard toggle interactions (like, repost, bookmark, reaction)
  const statements = [
    db.prepare('DELETE FROM interactions WHERE target_type = ? AND target_id = ? AND user_fingerprint = ? AND interaction_type = ?').bind(targetType, targetId, fingerprint, action)
  ];

  if (active) {
    statements.push(
      db.prepare('INSERT INTO interactions (id, target_type, target_id, user_fingerprint, interaction_type, value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(`act_${crypto.randomUUID()}`, targetType, targetId, fingerprint, action, action === 'reaction' ? value : null, Date.now())
    );
  }

  if (targetType === 'post') {
    if (action === 'repost') {
      statements.push(db.prepare("UPDATE posts SET boost_count = (SELECT COUNT(*) FROM interactions WHERE target_type = 'post' AND target_id = ? AND interaction_type = 'repost') WHERE id = ?").bind(targetId, targetId));
    }
    if (action === 'like') {
      statements.push(db.prepare("UPDATE posts SET merit_votes = (SELECT COUNT(*) FROM interactions WHERE target_type = 'post' AND target_id = ? AND interaction_type = 'like') WHERE id = ?").bind(targetId, targetId));
    }
  }

  statements.push(
    db.prepare('SELECT COUNT(*) AS cnt FROM interactions WHERE target_type = ? AND target_id = ? AND interaction_type = ?').bind(targetType, targetId, action)
  );

  const results = await db.batch(statements);
  if (results.some(result => result.success === false)) throw new Error('Interaction transaction failed');
  const count = Number((results.at(-1)?.results?.[0] as any)?.cnt) || 0;
  return json({ success: true, targetId, targetType, action, active, value, newCount: count });
}
