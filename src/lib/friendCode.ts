import { randomBytes } from "crypto";

// 30 chars — no ambiguous 0/O/1/I/L
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateFriendCode(): string {
  const bytes = randomBytes(4);
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return `MARCO-${code}`;
}

export function normalizeFriendCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "");
  if (cleaned.startsWith("MARCO-")) return cleaned;
  if (cleaned.length === 4) return `MARCO-${cleaned}`;
  return cleaned;
}

export function isValidFriendCode(code: string): boolean {
  return /^MARCO-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(code);
}
