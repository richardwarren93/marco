export function pluginConfig() {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clients = (process.env.MARCO_MCP_CLIENT_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!app || !supabase || !clients.length) throw new Error("Marco plugin is not configured");
  const origin = new URL(app).origin;
  if (new URL(origin).protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("Marco plugin requires HTTPS");
  }
  return {
    origin,
    resource: `${origin}/api/mcp`,
    metadata: `${origin}/.well-known/oauth-protected-resource`,
    issuer: `${supabase.replace(/\/$/, "")}/auth/v1`,
    clients,
  };
}
