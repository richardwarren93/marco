import { resolve4 } from "node:dns/promises";
import { get } from "node:https";
import * as cheerio from "cheerio";

export function publicIPv4(ip: string) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = p;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19));
}

// Resolve and pin a public address on every hop, retaining TLS hostname checks.
// No cookies, credentials, images, or arbitrary page subresources are fetched.
export async function fetchRecipePage(input: string, redirects = 0): Promise<{ text: string; structured: string[] }> {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443" || redirects > 3) throw new Error("Unsupported URL");
  const addresses = await resolve4(url.hostname);
  if (!addresses.length || addresses.some(ip => !publicIPv4(ip))) throw new Error("Unsupported host");
  const result = await new Promise<{ location?: string; html?: string }>((resolve, reject) => {
    const req = get(url, {
      family: 4,
      headers: { "User-Agent": "MarcoRecipeBot/1.0", Accept: "text/html" },
      lookup: (_host, options, cb) => {
        if (options.all) cb(null, [{ address: addresses[0], family: 4 }]);
        else cb(null, addresses[0], 4);
      },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        response.resume(); resolve({ location: response.headers.location }); return;
      }
      if (response.statusCode !== 200 || !response.headers["content-type"]?.includes("text/html")) { response.resume(); reject(new Error("Recipe page unavailable")); return; }
      let size = 0; const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 2_000_000) req.destroy(new Error("Page too large")); else chunks.push(chunk); });
      response.on("error", reject);
      response.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
    });
    const timer = setTimeout(() => req.destroy(new Error("Page timed out")), 15_000);
    req.on("close", () => clearTimeout(timer)); req.on("error", reject);
  });
  if (result.location) return fetchRecipePage(new URL(result.location, url).href, redirects + 1);
  if (!result.html) throw new Error("Recipe page unavailable");
  const $ = cheerio.load(result.html);
  const structured = $('script[type="application/ld+json"]').map((_, el) => $(el).text()).get();
  $("script, style, nav, footer, header").remove();
  return { structured, text: $("body").text().replace(/\s+/g, " ").slice(0, 40000) };
}
