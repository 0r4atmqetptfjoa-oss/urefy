// ===========================================================================
// Cloudflare Pages Functions Catch-all Subpath Router: /api/federation/*
// Maps subpaths (/api/federation/nodeinfo, /actor, /inbox, /outbox) to federation.ts
// ===========================================================================

import { onRequestGet, onRequestPost, onRequest } from '../federation.js';

export { onRequestGet, onRequestPost, onRequest };
