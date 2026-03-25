import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase storage (user uploads, recipe images)
      {
        protocol: "https",
        hostname: "jwioqapvtejfjckrjwcv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Instagram CDN
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      // TikTok CDN
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      // Generic fallback for any https image
      { protocol: "https", hostname: "**" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 7, // cache optimized images for 7 days
  },
};

export default nextConfig;
