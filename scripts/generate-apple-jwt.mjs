// Generate the Apple "Sign in with Apple" client secret JWT.
//
// Supabase's Apple OAuth provider expects a JWT (not the raw .p8 file)
// as the "Secret Key (for OAuth)" field. The JWT is signed with your
// .p8 private key, encodes your Apple Team ID + Services ID + Key ID,
// and is valid for up to 6 months. Apple rotates the requirement, so
// re-run this script every ~5 months to get a fresh JWT and paste it
// back into Supabase to avoid expiry.
//
// Uses Node's built-in crypto module — no npm install needed.
//
// Usage (from repo root):
//   node scripts/generate-apple-jwt.mjs \
//     --team-id ABCDE12345 \
//     --key-id ABCDE67890 \
//     --services-id com.ACGC.crave.signin \
//     --key-path ./AuthKey_ABCDE67890.p8
//
// Output: the JWT printed to stdout. Copy and paste into Supabase
// Dashboard → Authentication → Providers → Apple → Secret Key.

import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { argv, exit } from "node:process";

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = argv[i + 1];
  }
  return args;
}

const { teamId, keyId, servicesId, keyPath } = parseArgs();

if (!teamId || !keyId || !servicesId || !keyPath) {
  console.error("Missing required args.\n");
  console.error("Usage:");
  console.error("  node scripts/generate-apple-jwt.mjs \\");
  console.error("    --team-id <APPLE_TEAM_ID> \\");
  console.error("    --key-id <APPLE_KEY_ID> \\");
  console.error("    --services-id <APPLE_SERVICES_ID> \\");
  console.error("    --key-path <PATH_TO_P8_FILE>");
  exit(1);
}

const base64url = (input) =>
  Buffer.from(typeof input === "string" ? input : JSON.stringify(input))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const header = { alg: "ES256", kid: keyId, typ: "JWT" };
const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: teamId,
  iat: now,
  // Apple caps this at ~6 months (180 days). We use 180 days minus a
  // few hours to leave some buffer against clock skew on Apple's side.
  exp: now + 60 * 60 * 24 * 180 - 60 * 60,
  aud: "https://appleid.apple.com",
  sub: servicesId,
};

const signingInput = `${base64url(header)}.${base64url(payload)}`;
const privateKey = readFileSync(keyPath, "utf8");

// dsaEncoding: 'ieee-p1363' is required — JWT signatures use raw r||s
// concatenation (64 bytes for ES256), not DER encoding (Node's default).
// Without this, the JWT signature is malformed and Apple rejects it.
const signature = createSign("SHA256")
  .update(signingInput)
  .sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

const jwt = `${signingInput}.${signature
  .toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")}`;

console.log(jwt);
console.error(
  `\nJWT generated. Expires: ${new Date(payload.exp * 1000).toISOString()}`
);
