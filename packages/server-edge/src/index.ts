import { AetherisServer } from './server.js';

export * from './server.js';
export * from './db/database.js';
export * from './rollback.js';
export * from './waf-defense.js';
export * from './payload-sanitizer.js';
export * from './threat-honeypot.js';
export * from './relay-durable-object.js';
export * from './durable-hibernation.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  const server = new AetherisServer({ port: PORT });
  server.listen(PORT).then(() => {
    console.log(`[Aetheris Edge Server] Running on http://localhost:${PORT} (WebSocket on ws://localhost:${PORT})`);
  });
}
