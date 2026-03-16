"use client";

import { useEffect, useRef, useState } from "react";

interface SocialEmbedProps {
  sourceUrl: string;
  sourcePlatform: string;
}

function extractTikTokVideoId(url: string): string | null {
  // Match /video/1234567890 pattern
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

function cleanInstagramUrl(url: string): string {
  // Remove query params and ensure trailing slash
  const clean = url.split("?")[0];
  return clean.endsWith("/") ? clean : clean + "/";
}

export default function SocialEmbed({
  sourceUrl,
  sourcePlatform,
}: SocialEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (sourcePlatform === "instagram") {
      // Load Instagram embed.js and process
      const loadAndProcess = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instgrm = (window as any).instgrm;
        if (instgrm?.Embeds?.process) {
          instgrm.Embeds.process();
          setLoaded(true);
        }
      };

      const existing = document.querySelector(
        'script[src*="instagram.com/embed.js"]'
      );
      if (existing) {
        loadAndProcess();
      } else {
        const script = document.createElement("script");
        script.src = "https://www.instagram.com/embed.js";
        script.async = true;
        script.onload = () => {
          setTimeout(loadAndProcess, 100);
        };
        document.body.appendChild(script);
      }
    } else if (sourcePlatform === "tiktok") {
      // TikTok uses an iframe — no script needed
      setLoaded(true);
    }
  }, [sourcePlatform, sourceUrl]);

  if (sourcePlatform !== "instagram" && sourcePlatform !== "tiktok") {
    return null;
  }

  const cleanUrl = cleanInstagramUrl(sourceUrl);
  const tiktokVideoId = extractTikTokVideoId(sourceUrl);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        Original Post
      </h2>
      <div ref={containerRef} className="flex justify-center">
        {sourcePlatform === "instagram" && (
          <blockquote
            className="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink={cleanUrl}
            data-instgrm-version="14"
            style={{
              background: "#FFF",
              border: 0,
              borderRadius: "3px",
              boxShadow:
                "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
              margin: "1px",
              maxWidth: "540px",
              minWidth: "326px",
              padding: 0,
              width: "calc(100% - 2px)",
            }}
          >
            <a
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 text-center text-sm text-gray-500"
            >
              {!loaded && "Loading Instagram post..."}
            </a>
          </blockquote>
        )}

        {sourcePlatform === "tiktok" && tiktokVideoId && (
          <iframe
            src={`https://www.tiktok.com/embed/v2/${tiktokVideoId}`}
            style={{
              width: "325px",
              height: "578px",
              border: "none",
            }}
            allowFullScreen
            allow="encrypted-media"
            title="TikTok video"
          />
        )}

        {sourcePlatform === "tiktok" && !tiktokVideoId && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:underline"
          >
            View on TikTok →
          </a>
        )}
      </div>
    </div>
  );
}
