// ===========================================================================
// UREfy — PASS 9: CONTENT REGISTRY
// Maintains an internal audit registry of all synthetic content generated
// during the beta (posts, comments, communities, messages, reports).
// Ensures 100% traceability and clean post-beta removal.
// ===========================================================================

import fs from 'node:fs';
import path from 'node:path';

const REGISTRY_FILE = path.resolve('tmp/synthetic-beta/content-registry.json');

function ensureRegistry() {
  const dir = path.dirname(REGISTRY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(REGISTRY_FILE)) {
    const initial = {
      posts: [],
      comments: [],
      communities: [],
      messages: [],
      reports: [],
      reactions: [],
      follows: [],
    };
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  } catch {
    return { posts: [], comments: [], communities: [], messages: [], reports: [], reactions: [], follows: [] };
  }
}

function saveRegistry(data) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function registerPost(item) {
  const reg = ensureRegistry();
  reg.posts.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function registerComment(item) {
  const reg = ensureRegistry();
  reg.comments.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function registerCommunity(item) {
  const reg = ensureRegistry();
  reg.communities.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function registerMessage(item) {
  const reg = ensureRegistry();
  reg.messages.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function registerReport(item) {
  const reg = ensureRegistry();
  reg.reports.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function registerFollow(item) {
  const reg = ensureRegistry();
  reg.follows.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function registerReaction(item) {
  const reg = ensureRegistry();
  reg.reactions.push({ ...item, registeredAt: Date.now() });
  saveRegistry(reg);
}

export function getRegistry() {
  return ensureRegistry();
}
