import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function handleMcpRequest(request: Request, server: McpServer) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 32768,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    // JSON mode: consume before closing the per-request transport.
    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(body.byteLength ? body : null, { status: response.status, headers });
  } finally {
    await server.close();
  }
}
