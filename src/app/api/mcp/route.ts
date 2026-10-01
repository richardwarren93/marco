import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { pluginConfig } from "@/lib/mcp/config";
import { bearerToken, verifyPluginToken } from "@/lib/mcp/auth";
import { createPluginData } from "@/lib/mcp/data";
import { createMarcoServer } from "@/lib/mcp/server";
import { handleMcpRequest } from "@/lib/mcp/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let config;
  try { config = pluginConfig(); }
  catch { return Response.json({ error: "Marco plugin is not configured." }, { status: 503 }); }
  const origin = request.headers.get("origin");
  if (origin && ![config.origin, "https://chatgpt.com"].includes(origin)) {
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  }
  const unauthorized = () => Response.json({ error: "Connect your Marco account to continue." }, {
    status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": `Bearer resource_metadata="${config.metadata}", scope="openid email"` },
  });
  const token = bearerToken(request);
  if (!token) return unauthorized();
  let userId;
  let clientId;
  try {
    ({ userId, clientId } = await verifyPluginToken(token, config));
    // Validate against the live Auth service as well as verifying the JWT.
    // Grant-revocation behavior must be exercised in the deployment smoke test.
    const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await auth.auth.getUser(token);
    if (error || data.user?.id !== userId) return unauthorized();
  } catch { return unauthorized(); }
  return handleMcpRequest(request, createMarcoServer(createPluginData(createAdminClient(), userId, config.origin, clientId), `${config.origin}/connect/recipe-saving?client_id=${encodeURIComponent(clientId)}`));
}

// No persistent SSE sessions or DELETE operations in this stateless server.
export function GET() { return new Response(null, { status: 405, headers: { Allow: "POST" } }); }
export const DELETE = GET;
