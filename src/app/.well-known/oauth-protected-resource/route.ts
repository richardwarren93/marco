import { pluginConfig } from "@/lib/mcp/config";

export function GET() {
  try {
    const config = pluginConfig();
    return Response.json({ resource: config.resource, authorization_servers: [config.issuer],
      scopes_supported: ["openid", "email"], bearer_methods_supported: ["header"],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Marco plugin is not configured." }, { status: 503 });
  }
}
