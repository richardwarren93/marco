"use client";

import { useId } from "react";

/* Compact brand glyphs for the "where do you get your recipes" flow. Kept as
   inline SVG so they're crisp at any size and need no asset files. */

export function Instagram({ size = 22 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id={id} cx="0.3" cy="1.05" r="1.1">
          <stop offset="0" stopColor="#FED576" />
          <stop offset="0.26" stopColor="#F47133" />
          <stop offset="0.61" stopColor="#BC3081" />
          <stop offset="1" stopColor="#4C63D2" />
        </radialGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#${id})`} />
      <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="4.2" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="17" cy="7" r="1.25" fill="#fff" />
    </svg>
  );
}

export function TikTok({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6.5" fill="#000" />
      <path
        d="M16.6 6.7c-.86-.56-1.43-1.5-1.55-2.58V3.8h-2.3v9.55c0 1.06-.86 1.92-1.92 1.92a1.92 1.92 0 0 1-.36-3.81V9.1a4.2 4.2 0 1 0 4.94 4.13V8.86a5.06 5.06 0 0 0 3 .98V7.5a3.03 3.03 0 0 1-1.86-.8Z"
        fill="#fff"
      />
    </svg>
  );
}

export function Facebook({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        d="M13.5 21v-7h2.3l.35-2.7H13.5V9.6c0-.78.22-1.3 1.33-1.3h1.47V5.95c-.25-.03-1.1-.1-2.1-.1-2.07 0-3.5 1.27-3.5 3.6V11.3H8.6V14h2.6v7h2.3Z"
        fill="#fff"
      />
    </svg>
  );
}

export function Pinterest({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#E60023" />
      <path
        d="M12.2 5.5c-3.6 0-5.9 2.5-5.9 5.4 0 1.4.78 3.05 2 3.55.18.08.28.04.32-.14.03-.13.1-.43.14-.56.05-.18.03-.24-.1-.4-.36-.43-.6-1-.6-1.78 0-2.3 1.72-4.35 4.48-4.35 2.44 0 3.78 1.5 3.78 3.5 0 2.63-1.16 4.85-2.9 4.85-.95 0-1.67-.79-1.44-1.76.27-1.16.8-2.4.8-3.24 0-.75-.4-1.37-1.23-1.37-.98 0-1.76 1.01-1.76 2.36 0 .86.29 1.44.29 1.44l-1.17 4.96c-.35 1.47-.05 3.28-.03 3.46.01.1.14.13.2.05.08-.11 1.16-1.44 1.53-2.77.1-.38.6-2.35.6-2.35.3.57 1.17 1.07 2.1 1.07 2.76 0 4.64-2.52 4.64-5.9 0-2.55-2.16-4.93-5.45-4.93Z"
        fill="#fff"
      />
    </svg>
  );
}

export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

export function Camera({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6.5" fill="#8E8E93" />
      <path
        d="M9.2 7.5l-.7 1.1H6.6c-.66 0-1.2.54-1.2 1.2v5.3c0 .66.54 1.2 1.2 1.2h10.8c.66 0 1.2-.54 1.2-1.2V9.8c0-.66-.54-1.2-1.2-1.2h-1.9l-.7-1.1H9.2z"
        fill="#fff"
      />
      <circle cx="12" cy="12.7" r="2.6" fill="#8E8E93" />
      <circle cx="12" cy="12.7" r="2.6" fill="none" stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}
