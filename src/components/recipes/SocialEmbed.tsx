"use client";

import { useEffect, useState, useRef } from "react";

interface SocialEmbedProps {
  sourceUrl: string;
  sourcePlatform: string;
}

export default function SocialEmbed({
  sourceUrl,
  sourcePlatform,
}: SocialEmbedProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchEmbed() {
      try {
        let oembedUrl = "";
        if (sourcePlatform === "instagram") {
          oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(sourceUrl)}&omitscript=true`;
        } else if (sourcePlatform === "tiktok") {
          oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(sourceUrl)}`;
        } else {
          setError(true);
          setLoading(false);
          return;
        }

        const resp = await fetch(oembedUrl);
        if (!resp.ok) throw new Error("oEmbed fetch failed");
        const data = await resp.json();

        if (data.html) {
          setEmbedHtml(data.html);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchEmbed();
  }, [sourceUrl, sourcePlatform]);

  // Load platform embed scripts after HTML is inserted
  useEffect(() => {
    if (!embedHtml || !containerRef.current) return;

    if (sourcePlatform === "instagram") {
      // Load Instagram embed.js
      const existing = document.querySelector(
        'script[src*="instagram.com/embed.js"]'
      );
      if (existing) {
        // Re-process embeds if script already loaded
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).instgrm?.Embeds?.process();
      } else {
        const script = document.createElement("script");
        script.src = "https://www.instagram.com/embed.js";
        script.async = true;
        document.body.appendChild(script);
      }
    } else if (sourcePlatform === "tiktok") {
      // Load TikTok embed.js
      const existing = document.querySelector(
        'script[src*="tiktok.com/embed.js"]'
      );
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.tiktok.com/embed.js";
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [embedHtml, sourcePlatform]);

  if (error || (!loading && !embedHtml)) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-400 text-sm">
        Loading original post...
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        Original Post
      </h2>
      <div
        ref={containerRef}
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: embedHtml! }}
      />
    </div>
  );
}
