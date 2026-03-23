import * as cheerio from "cheerio";

export interface ScrapeResult {
  content: string;
  image_url: string | null;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  if (url.includes("instagram.com")) {
    return scrapeInstagram(url);
  }
  if (url.includes("tiktok.com")) {
    return scrapeTikTok(url);
  }
  return scrapeGeneric(url);
}

async function scrapeInstagram(url: string): Promise<ScrapeResult> {
  const parts: string[] = [];
  let image_url: string | null = null;

  // Strategy 1: Meta Graph API oembed (requires app token, returns thumbnail_url)
  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const token = appId && appSecret ? `${appId}|${appSecret}` : null;
    const oembedUrl = token
      ? `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${token}&fields=thumbnail_url,title,author_name`
      : `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedResp = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
    if (oembedResp.ok) {
      const oembed = await oembedResp.json();
      if (oembed.title) parts.push(`Caption: ${oembed.title}`);
      if (oembed.author_name) parts.push(`Author: ${oembed.author_name}`);
      if (oembed.thumbnail_url) image_url = oembed.thumbnail_url;
    }
  } catch {
    // oembed failed, continue
  }

  // Strategy 2: Scrape the main page for meta tags and embedded data
  try {
    const pageContent = await fetchPage(url);
    const meta = extractMetaTags(pageContent);
    if (!image_url && meta.image) image_url = meta.image;
    if (meta.description) parts.push(`Description: ${meta.description}`);
    if (meta.title) parts.push(`Page Title: ${meta.title}`);

    // Look for embedded JSON data in script tags
    const embeddedData = extractInstagramEmbeddedData(pageContent);
    if (embeddedData) parts.push(`Post Data: ${embeddedData}`);

    const text = extractVisibleText(pageContent);
    if (text) parts.push(`Page Content: ${text}`);
  } catch {
    // page scrape failed
  }

  // Strategy 3: Try the embed page which renders more content server-side
  try {
    const embedUrl = getInstagramEmbedUrl(url);
    if (embedUrl) {
      const embedContent = await fetchPage(embedUrl);
      const embedData = extractInstagramEmbedPageData(embedContent);
      if (embedData) parts.push(`Embed Content: ${embedData}`);
      // Try to get image from embed page if we don't have one
      if (!image_url) {
        const embedMeta = extractMetaTags(embedContent);
        if (embedMeta.image) image_url = embedMeta.image;
      }
    }
  } catch {
    // embed page scrape failed
  }

  // Strategy 4: Try fetching with a mobile user agent for potentially different content
  if (parts.length <= 1) {
    try {
      const mobileContent = await fetchPageMobile(url);
      const mobileMeta = extractMetaTags(mobileContent);
      if (mobileMeta.description && !parts.some(p => p.includes(mobileMeta.description))) {
        parts.push(`Mobile Description: ${mobileMeta.description}`);
      }
      if (!image_url && mobileMeta.image) image_url = mobileMeta.image;

      // Try to find additional data in mobile page
      const mobileEmbedded = extractInstagramEmbeddedData(mobileContent);
      if (mobileEmbedded && !parts.some(p => p.includes(mobileEmbedded))) {
        parts.push(`Mobile Data: ${mobileEmbedded}`);
      }
    } catch {
      // mobile scrape failed
    }
  }

  const content = parts.join("\n\n");
  console.log("Instagram scrape result length:", content.length, "parts:", parts.length);

  return {
    content: content || "Could not extract content from Instagram URL. This is an Instagram reel - please provide the best recipe interpretation based on the URL and any available metadata.",
    image_url,
  };
}

function getInstagramEmbedUrl(url: string): string | null {
  // Extract the post/reel path and create an embed URL
  const match = url.match(/instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
  if (match) {
    const [, type, shortcode] = match;
    return `https://www.instagram.com/${type}/${shortcode}/embed/`;
  }
  return null;
}

function extractInstagramEmbedPageData(html: string): string {
  const $ = cheerio.load(html);
  const parts: string[] = [];

  // The embed page often has the caption in a specific div
  $(".Caption, .CaptionUsername, .CaptionComment").each((_, el) => {
    const text = $(el).text().trim();
    if (text) parts.push(text);
  });

  // Look for any visible text content in the embed
  $(".EmbedCaption, .Embed .Caption, [class*='caption'], [class*='Caption']").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !parts.includes(text)) parts.push(text);
  });

  // Get all meaningful text from the embed body
  $("script, style, nav, footer, header, noscript, link, meta").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  if (bodyText && bodyText.length > 20) {
    parts.push(bodyText.slice(0, 2000));
  }

  return parts.join("\n");
}

function extractInstagramEmbeddedData(html: string): string {
  const parts: string[] = [];

  // Look for various patterns Instagram uses to embed data
  const patterns = [
    new RegExp('window\\._sharedData\\s*=\\s*({.+?});</script>', 's'),
    new RegExp('window\\.__additionalDataLoaded\\s*\\([^,]*,\\s*({.+?})\\s*\\);</script>', 's'),
    /"caption"\s*:\s*\{[^}]*"text"\s*:\s*"([^"]+)"/,
    /"edge_media_to_caption"\s*:\s*\{[^}]*"text"\s*:\s*"([^"]+)"/,
    /"accessibility_caption"\s*:\s*"([^"]+)"/,
    /"alt_text"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        // If it's a JSON blob, try to extract useful fields
        if (match[1]?.startsWith("{")) {
          const data = JSON.parse(match[1]);
          const caption = extractCaptionFromJson(data);
          if (caption) parts.push(`Caption: ${caption}`);
        } else if (match[1]) {
          // It's a direct string match (caption text, alt text, etc.)
          const decoded = match[1]
            .replace(/\\n/g, "\n")
            .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
            .replace(/\\"/g, '"');
          parts.push(`Content: ${decoded}`);
        }
      } catch {
        // JSON parse failed, use raw match
        if (match[1] && match[1].length < 500) {
          parts.push(`Raw: ${match[1]}`);
        }
      }
    }
  }

  // Also look for JSON-LD data
  const $ = cheerio.load(html);
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).html();
    if (text) {
      try {
        const data = JSON.parse(text);
        if (data.caption) parts.push(`Caption: ${data.caption}`);
        if (data.description) parts.push(`LD Description: ${data.description}`);
        if (data.name) parts.push(`LD Name: ${data.name}`);
        if (data.articleBody) parts.push(`Article: ${data.articleBody}`);
      } catch {
        // invalid JSON-LD
      }
    }
  });

  return parts.join("\n");
}

function extractCaptionFromJson(data: Record<string, unknown>): string {
  // Recursively search for caption text in Instagram's JSON structures
  const searchPaths = [
    "entry_data.PostPage[0].graphql.shortcode_media.edge_media_to_caption.edges[0].node.text",
    "graphql.shortcode_media.edge_media_to_caption.edges[0].node.text",
    "caption.text",
    "media.caption.text",
  ];

  for (const path of searchPaths) {
    const value = getNestedValue(data, path);
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  // Brute force: search for any "text" field that looks like a caption
  const found = findCaptionText(data, 0);
  return found || "";
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]];
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2])];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
}

function findCaptionText(obj: unknown, depth: number): string {
  if (depth > 8 || !obj || typeof obj !== "object") return "";

  const record = obj as Record<string, unknown>;

  // Look for caption-like fields
  for (const key of ["text", "caption", "description", "accessibility_caption"]) {
    if (typeof record[key] === "string" && (record[key] as string).length > 10) {
      return record[key] as string;
    }
  }

  // Recurse into objects and arrays
  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      const found = findCaptionText(value, depth + 1);
      if (found) return found;
    }
  }

  return "";
}

async function scrapeTikTok(url: string): Promise<ScrapeResult> {
  const parts: string[] = [];
  let image_url: string | null = null;

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
      if (oembed.thumbnail_url) image_url = oembed.thumbnail_url;
    }
  } catch {
    // oembed failed
  }

  // Also scrape the page
  try {
    const pageContent = await fetchPage(url);
    const meta = extractMetaTags(pageContent);
    if (!image_url && meta.image) image_url = meta.image;
    if (meta.description) parts.push(`Description: ${meta.description}`);
    const text = extractVisibleText(pageContent);
    if (text) parts.push(`Page Content: ${text}`);
  } catch {
    // page scrape failed
  }

  return {
    content: parts.join("\n\n") || "Could not extract content from TikTok URL",
    image_url,
  };
}

async function scrapeGeneric(url: string): Promise<ScrapeResult> {
  const pageContent = await fetchPage(url);
  const meta = extractMetaTags(pageContent);
  const text = extractVisibleText(pageContent);
  const jsonLd = extractJsonLd(pageContent);

  const parts: string[] = [];
  if (meta.title) parts.push(`Title: ${meta.title}`);
  if (meta.description) parts.push(`Description: ${meta.description}`);
  if (jsonLd) parts.push(`Structured Data: ${jsonLd}`);
  if (text) parts.push(`Content: ${text}`);

  return {
    content: parts.join("\n\n") || "Could not extract content",
    image_url: meta.image || null,
  };
}

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  return resp.text();
}

async function fetchPageMobile(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });
  return resp.text();
}

function extractMetaTags(html: string): {
  title: string;
  description: string;
  image: string;
} {
  const $ = cheerio.load(html);
  return {
    title:
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      "",
    description:
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "",
    image:
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
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
