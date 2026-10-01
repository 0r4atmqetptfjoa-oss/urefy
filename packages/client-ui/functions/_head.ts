/** Reuse a public GET handler so HEAD retains its visibility checks and status. */
export function headHandler<T>(get: (context: T) => Promise<Response> | Response): (context: T) => Promise<Response> {
  return async context => {
    const response = await get(context);
    // HTMLRewriter bodies are streams; discard them without sending a HEAD body.
    if (response.body) await response.body.cancel().catch(() => {});
    return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}
