import { decodeJwt } from "jose";

// Deny-only check. Signature verification remains Supabase's responsibility.
// A plugin bearer token must not be repackaged as a first-party cookie session
// to reach Marco's existing write APIs, which use service-role queries.
export function isPluginCredential(header: string | null) {
  const token = /^Bearer (.+)$/i.exec(header ?? "")?.[1];
  if (!token) return false;
  try { return decodeJwt(token).marco_access !== undefined; }
  catch { return false; }
}

export const firstPartyFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  if (isPluginCredential(headers.get("authorization"))) {
    return Response.json({ message: "Plugin credentials cannot access browser APIs", code: "bad_jwt" }, { status: 401 });
  }
  return fetch(input, init);
};
