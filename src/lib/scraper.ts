import * as cheerio from "cheerio";

export async function scrapeUrl(url: string): Promise<string> {
  if (url.includes("instagram.com")) {
    return scrapeInstagram(url);
  }
  if (url.includes("tiktok.com")) {
    return scrapeTikTok(url);
  }
  return scrapeGeneric(url);
}

async function scrapeInstagram(url: string): Promise<string> {
  const parts: string[] = [];

  // Try oembed endpoint
  try {
    const oembedResp = await fetch(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (oembedResp.ok) {
      const oembed = await oembedResp.json();
      if (oembed.title) parts.push(`Caption: ${oembed.title}`);
      if (oembed.author_name) parts.push(`Author: ${oembed.author_name}`);
    }
  } catch {
    // oembed failed, continue with page scrape
  }

  // Scrape the page for meta tags and content
  try {
    const pageContent = await fetchPage(url);
    const meta = extractMetaTags(pageContent);
    if (meta.description) parts.push(`Description: ${meta.description}`);
    if (meta.title) parts.push(`Page Title: ${meta.title}`);
    const text = extractVisibleText(pageContent);
    if (text) parts.push(`Page Content: ${text}`);
  } catch {
    // page scrape failed
  }

  return parts.join("\n\n") || "Could not extract content from Instagram URL";
}

async function scrapeTikTok(url: string): Promise<string> {
  const parts: string[] = [];

  // TikTok oembed is reliable
  try {
    const oembedResp = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (oembedResp.ok) {
      const oembed = await oembedResp.json();
      if (oembed.title) parts.push(`Title: ${oembed.title}`);
      if (oembed.author_name) parts.push(`Author: ${oembed.author_name}`);
    }
  } catch {
    // oembed failed
  }

  // Also scrape the page
  try {
    const pageContent = await fetchPage(url);
    const meta = extractMetaTags(pageContent);
    if (meta.description) parts.push(`Description: ${meta.description}`);
    const text = extractVisibleText(pageContent);
    if (text) parts.push(`Page Content: ${text}`);
  } catch {
    // page scrape failed
  }

  return parts.join("\n\n") || "Could not extract content from TikTok URL";
}

async function scrapeGeneric(url: string): Promise<string> {
  const pageContent = await fetchPage(url);
  const meta = extractMetaTags(pageContent);
  const text = extractVisibleText(pageContent);
  const jsonLd = extractJsonLd(pageContent);

  const parts: string[] = [];
  if (meta.title) parts.push(`Title: ${meta.title}`);
  if (meta.description) parts.push(`Description: ${meta.description}`);
  if (jsonLd) parts.push(`Structured Data: ${jsonLd}`);
  if (text) parts.push(`Content: ${text}`);

  return parts.join("\n\n") || "Could not extract content";
}

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });
  return resp.text();
}

function extractMetaTags(html: string): {
  title: string;
  description: string;
} {
  const $ = cheerio.load(html);
  return {
    title:
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      "",
    description:
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "",
  };
}

function extractVisibleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  // Limit to first 3000 chars to avoid huge payloads
  return text.slice(0, 3000);
}

function extractJsonLd(html: string): string {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');
  const results: string[] = [];
  scripts.each((_, el) => {
    const text = $(el).html();
    if (text) {
      try {
        const data = JSON.parse(text);
        // Only include recipe-related JSON-LD
        if (
          data["@type"] === "Recipe" ||
          (Array.isArray(data["@graph"]) &&
            data["@graph"].some(
              (item: { "@type": string }) => item["@type"] === "Recipe"
            ))
        ) {
          results.push(JSON.stringify(data, null, 2).slice(0, 2000));
        }
      } catch {
        // invalid JSON-LD
      }
    }
  });
  return results.join("\n");
}

export function detectPlatform(
  url: string
): "instagram" | "tiktok" | "other" {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com")) return "tiktok";
  return "other";
}
