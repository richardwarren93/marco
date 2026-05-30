"use client";

// Shared cookbook chrome: paper texture, page-edge shading, ribbon bookmark,
// hand-drawn underlines/arrows/ornaments, and the dual-polaroid scrapbook
// element. Extracted from CookbookOpening so every onboarding page renders the
// same aesthetic. CookbookKeyframes must be mounted once per page (CookbookPage
// and CookbookOpening both include it) so the cookbook-* animations resolve.

import Image from "next/image";

export function CookbookKeyframes() {
  return (
    <style jsx global>{`
      @keyframes fold-shadow {
        0% { opacity: 0; }
        50% { opacity: 0.7; }
        100% { opacity: 0; }
      }
      @keyframes cookbook-draw-stroke {
        to { stroke-dashoffset: 0; }
      }
      @keyframes cookbook-ribbon-swing {
        0% { transform: translateY(-8px) rotate(-2deg); opacity: 0; }
        60% { transform: translateY(2px) rotate(1deg); opacity: 1; }
        100% { transform: translateY(0) rotate(0deg); opacity: 1; }
      }
      @keyframes cookbook-ink-fade-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cookbook-drop-cap-in {
        from { opacity: 0; transform: scale(0.7) rotate(-4deg); }
        to { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes cookbook-polaroid-place {
        from { opacity: 0; transform: rotate(2deg) translateY(20px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    `}</style>
  );
}

export function PaperTextureFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <filter id="paper-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
        <feColorMatrix
          values="0 0 0 0 0.92
                  0 0 0 0 0.86
                  0 0 0 0 0.74
                  0 0 0 0.05 0"
        />
        <feComposite in2="SourceGraphic" operator="in" />
        <feComposite in="SourceGraphic" operator="over" />
      </filter>
    </svg>
  );
}

export function PageStackEdge() {
  return (
    <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ width: 6 }}>
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to left, rgba(74, 50, 20, 0.25) 0%, rgba(245, 238, 226, 0) 100%)",
        }}
      />
      <div className="absolute inset-y-1 right-1" style={{ width: 1, background: "rgba(74, 50, 20, 0.18)" }} />
      <div className="absolute inset-y-2 right-2.5" style={{ width: 1, background: "rgba(74, 50, 20, 0.12)" }} />
    </div>
  );
}

export function CornerFrame() {
  const stroke = "rgba(28, 26, 23, 0.35)";
  return (
    <svg
      className="absolute inset-5 pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
      stroke={stroke}
      strokeWidth="0.4"
      strokeLinecap="round"
      style={{ animation: "cookbook-ink-fade-in 1s ease-out 0.6s both" }}
    >
      <path d="M 2 8 Q 2 2, 8 2 L 16 2" />
      <path d="M 84 2 Q 90 2, 92 8 L 92 16" />
      <path d="M 92 84 Q 92 92, 84 92 L 76 92" />
      <path d="M 16 92 Q 8 92, 8 84 L 8 76" />
    </svg>
  );
}

export function DrawnArrow() {
  return (
    <svg width="46" height="22" viewBox="0 0 46 22" fill="none" stroke="#1C1A17" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M 2 11 Q 16 4, 30 11 Q 36 14, 40 11"
        style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: "cookbook-draw-stroke 0.9s ease-out 1.1s forwards" }}
      />
      <path
        d="M 34 6 L 42 11 L 34 16"
        style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "cookbook-draw-stroke 0.4s ease-out 1.7s forwards" }}
      />
    </svg>
  );
}

export function Ribbon() {
  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        top: -2,
        right: 32,
        width: 22,
        height: 64,
        background: "#E5462E",
        boxShadow: "1px 1px 2px rgba(0,0,0,0.18)",
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
        animation: "cookbook-ribbon-swing 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
      }}
    />
  );
}

export function HandUnderline({ width = 100 }: { width?: number }) {
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none">
      <path
        d={`M 2 5 Q ${width * 0.25} 2, ${width * 0.5} 4 T ${width - 2} 4`}
        stroke="#1C1A17"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity={0.75}
        style={{ strokeDasharray: width * 1.2, strokeDashoffset: width * 1.2, animation: "cookbook-draw-stroke 0.9s ease-out 0.7s forwards" }}
      />
    </svg>
  );
}

export function Dot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 3,
        height: 3,
        borderRadius: "50%",
        background: "currentColor",
        opacity: 0.5,
      }}
    />
  );
}

export function SmallOrnament() {
  return (
    <svg width="20" height="6" viewBox="0 0 20 6" fill="none" stroke="rgba(28, 26, 23, 0.4)" strokeWidth="0.8" strokeLinecap="round">
      <path d="M 2 3 Q 6 1, 10 3 Q 14 5, 18 3" />
    </svg>
  );
}

export function DualPolaroid({
  src,
  caption,
  width,
  aspectRatio = "1 / 1",
  rotation,
  tapeOffset,
  tapeRotation,
  grayscale = false,
}: {
  src: string;
  caption: string | null;
  width: number;
  aspectRatio?: string;
  rotation: number;
  tapeOffset: number;
  tapeRotation: number;
  grayscale?: boolean;
}) {
  return (
    <div
      className="relative"
      style={{
        width,
        padding: "12px 12px 24px 12px",
        background: "#FBFAF5",
        boxShadow: "0 10px 28px rgba(74, 50, 20, 0.28), 0 1px 0 rgba(0,0,0,0.04)",
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: -10,
          left: tapeOffset,
          width: 78,
          height: 20,
          background:
            "repeating-linear-gradient(45deg, rgba(232, 163, 61, 0.55) 0 4px, rgba(232, 163, 61, 0.35) 4px 8px)",
          transform: `rotate(${tapeRotation}deg)`,
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      />
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio, background: "#E5D5B0" }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={`${width}px`}
          style={{
            objectFit: "cover",
            filter: grayscale
              ? "grayscale(1) sepia(0.35) contrast(1.05) brightness(0.96)"
              : "saturate(0.92) contrast(1.02)",
          }}
        />
      </div>
      {caption && (
        <div
          className="text-center mt-2"
          style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 600,
            fontSize: "17px",
            color: "rgba(28, 26, 23, 0.78)",
            lineHeight: 1.1,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
