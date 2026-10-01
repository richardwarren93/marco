import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pluginConfig } from "@/lib/mcp/config";
import { z } from "zod";

export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function account(clientId: string) {
  if (!pluginConfig().clients.includes(clientId)) return null;
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

export async function GET(request: Request) {
  try {
    const clientId = new URL(request.url).searchParams.get("client_id") ?? "";
    const user = await account(clientId);
    if (!user) return reply({ error: "Sign in to Marco to manage this connection." }, 401);
    const { data, error } = await createAdminClient().from("marco_plugin_permissions")
      .select("recipe_save_enabled").eq("user_id", user.id).eq("client_id", clientId).maybeSingle();
    if (error) throw error;
    return reply({ enabled: data?.recipe_save_enabled === true });
  } catch { return reply({ error: "Permissions could not be loaded. Try again shortly." }, 503); }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== pluginConfig().origin) return reply({ error: "Origin not allowed." }, 403);
    const parsed = z.object({ client_id: z.uuid(), enabled: z.boolean() }).strict().safeParse(await request.json());
    if (!parsed.success) return reply({ error: "Invalid permission request." }, 400);
    const { client_id, enabled } = parsed.data;
    const user = await account(client_id);
    if (!user) return reply({ error: "Sign in to Marco to manage this connection." }, 401);
    const { error } = await createAdminClient().from("marco_plugin_permissions").upsert({
      user_id: user.id, client_id, recipe_save_enabled: enabled, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,client_id" });
    if (error) throw error;
    return reply({ enabled });
  } catch { return reply({ error: "Permission could not be changed. Try again shortly." }, 503); }
}
