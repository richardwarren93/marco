import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";

export type PluginAuthConfig = { issuer: string; resource: string; clients: string[] };
const keys = new Map<string, JWTVerifyGetKey>();

// Only resource-bound OAuth tokens are accepted. Normal Marco sessions and
// tokens for another OAuth client must never become plugin credentials.
export async function verifyPluginToken(token: string, config: PluginAuthConfig, testKey?: JWTVerifyGetKey) {
  let key = testKey ?? keys.get(config.issuer);
  if (!key) {
    key = createRemoteJWKSet(new URL(`${config.issuer}/.well-known/jwks.json`));
    keys.set(config.issuer, key);
  }
  const { payload } = await jwtVerify(token, key, {
    issuer: config.issuer,
    audience: config.resource,
    algorithms: ["ES256", "RS256"],
    requiredClaims: ["sub", "exp", "iat", "client_id", "marco_access"],
  });
  if (!z.uuid().safeParse(payload.sub).success ||
      typeof payload.client_id !== "string" || !config.clients.includes(payload.client_id) ||
      payload.marco_access !== "read") {
    throw new Error("Invalid plugin credentials");
  }
  return { userId: payload.sub!, clientId: payload.client_id };
}

export function bearerToken(request: Request) {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  return match?.[1] ?? null;
}
