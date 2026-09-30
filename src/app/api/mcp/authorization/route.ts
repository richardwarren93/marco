import { createClient } from "@/lib/supabase/server";
import { pluginConfig } from "@/lib/mcp/config";
import { z } from "zod";

export const dynamic = "force-dynamic";
const invalid = () => Response.json({ error: "Invalid or expired Marco connection request." }, { status: 400 });

async function authorization(id: string) {
  const config = pluginConfig();
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data, error } = await client.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) throw new Error("Invalid authorization");
  // Supabase may return an already approved redirect; it validates the client
  // and redirect URI itself. New grants are restricted to configured clients.
  if (!("redirect_url" in data)) {
    if (!config.clients.includes(data.client.id)) throw new Error("Unsupported client");
    if (data.scope.split(/\s+/).filter(Boolean).some(scope => !["openid", "email"].includes(scope))) {
      throw new Error("Unsupported permissions");
    }
  }
  return { client, data };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("authorization_id");
  if (!id || id.length > 256) return invalid();
  try {
    const { data } = await authorization(id);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return invalid(); }
}

export async function POST(request: Request) {
  try {
    // Cookie-authenticated decisions must originate from our consent page.
    if (request.headers.get("origin") !== pluginConfig().origin) {
      return Response.json({ error: "Origin not allowed." }, { status: 403 });
    }
    const body = z.object({ authorization_id: z.string().min(1).max(256), decision: z.enum(["approve", "deny"]) }).strict().parse(await request.json());
    const { client, data: details } = await authorization(body.authorization_id);
    if ("redirect_url" in details) return Response.json(details, { headers: { "Cache-Control": "no-store" } });
    const { data, error } = body.decision === "approve"
      ? await client.auth.oauth.approveAuthorization(body.authorization_id, { skipBrowserRedirect: true })
      : await client.auth.oauth.denyAuthorization(body.authorization_id, { skipBrowserRedirect: true });
    if (error) return invalid();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return invalid(); }
}
