// ===========================================================================
// Cloudflare Pages Functions Well-Known Router: /.well-known/aetheris-node
// Standard discovery endpoint for sovereign node federation
// ===========================================================================

import { onRequestGet, onRequest } from '../api/federation.js';

export { onRequestGet, onRequest };
