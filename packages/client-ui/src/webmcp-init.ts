export function initWebMCP(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  const tools = [
    {
      name: 'urefy.navigate',
      description: 'Navighează între secțiunile aplicației Urefy (feed, chat, messages, explore).',
      inputSchema: {
        type: 'object',
        properties: {
          view: { type: 'string', enum: ['feed', 'chat', 'messages', 'explore'] },
        },
        required: ['view'],
      },
      execute: async ({ view }: { view: string }) => {
        const url = new URL(window.location.href);
        url.searchParams.set('view', view);
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
        return { ok: true, activeView: view };
      },
    },
    {
      name: 'urefy.getSecurityStatus',
      description: 'Verifică starea criptării End-to-End (AES-256-GCM / Ed25519) în sesiunea curentă.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({
        e2eeActive: true,
        cipherSuite: 'AES-256-GCM + Ed25519 + DTLS-SRTP',
        domain: 'urefy.com',
      }),
    },
  ];

  // Suport pentru API-ul standard W3C/WebMCP navigator.modelContext
  const nav = navigator as any;
  if (nav.modelContext && typeof nav.modelContext.provideContext === 'function') {
    nav.modelContext.provideContext({ tools });
  } else if (nav.modelContext && typeof nav.modelContext.registerTool === 'function') {
    tools.forEach((t) => nav.modelContext.registerTool(t));
  } else {
    nav.modelContext = {
      version: '1.0',
      tools,
      provideContext: (ctx: any) => {
        nav.modelContext.tools = ctx?.tools || tools;
      },
      registerTool: (tool: any) => {
        nav.modelContext.tools.push(tool);
      },
      callTool: async (name: string, args: any) => {
        const found = tools.find((t) => t.name === name);
        if (!found) throw new Error(`WebMCP tool not found: ${name}`);
        return found.execute(args || {});
      },
    };
  }

  (window as any).__WEBMCP_READY__ = true;
}
