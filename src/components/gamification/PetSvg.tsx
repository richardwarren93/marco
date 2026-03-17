import type { PetMood } from "@/types";

interface PetSvgProps {
  mood: PetMood;
  className?: string;
}

/**
 * Mini chef blob pet — a simplified round version of the Marco chef mascot.
 * Mood changes the face expression: happy (big smile + sparkles), content (gentle smile),
 * hungry (neutral + sweat), sad (frown), very_sad (X-eyes + frown).
 */
export default function PetSvg({ mood, className = "w-24 h-24" }: PetSvgProps) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body - round blob */}
      <ellipse cx="60" cy="72" rx="38" ry="34" fill="#FFF3E0" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Chef hat */}
      <path
        d="M35 52 C30 50, 22 42, 23 32 C24 22, 34 17, 42 20 C46 12, 54 8, 62 9 C70 8, 78 12, 82 20 C90 17, 100 22, 101 32 C102 42, 94 50, 89 52 L89 58 L35 58 Z"
        fill="white" stroke="#2a2a2a" strokeWidth="2" strokeLinejoin="round"
      />
      {/* Hat band */}
      <path d="M35 57 Q62 62, 89 57" fill="none" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round"/>
      {/* M on hat */}
      <path d="M52 30 L52 44 L60 36 L68 44 L68 30" fill="none" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Eyes */}
      {mood === "very_sad" ? (
        <>
          {/* X eyes */}
          <path d="M42 72 L48 78 M48 72 L42 78" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M72 72 L78 78 M78 72 L72 78" stroke="#2a2a2a" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : (
        <>
          {/* Normal dot eyes */}
          <circle cx="45" cy="75" r="3" fill="#2a2a2a"/>
          <circle cx="75" cy="75" r="3" fill="#2a2a2a"/>
          {/* Eye sparkles for happy mood */}
          {mood === "happy" && (
            <>
              <circle cx="43" cy="73" r="1" fill="white"/>
              <circle cx="73" cy="73" r="1" fill="white"/>
            </>
          )}
        </>
      )}

      {/* Cheek blush */}
      {(mood === "happy" || mood === "content") && (
        <>
          <ellipse cx="37" cy="82" rx="5" ry="3" fill="#FFCDD2" opacity="0.6"/>
          <ellipse cx="83" cy="82" rx="5" ry="3" fill="#FFCDD2" opacity="0.6"/>
        </>
      )}

      {/* Mouth */}
      {mood === "happy" && (
        <path d="M48 87 C52 95, 68 95, 72 87" fill="white" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
      )}
      {mood === "content" && (
        <path d="M50 88 C55 93, 65 93, 70 88" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
      )}
      {mood === "hungry" && (
        <path d="M52 90 L68 90" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
      )}
      {(mood === "sad" || mood === "very_sad") && (
        <path d="M50 93 C55 87, 65 87, 70 93" fill="none" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
      )}

      {/* Sweat drop for hungry */}
      {mood === "hungry" && (
        <path d="M84 68 C86 72, 84 76, 82 72 Z" fill="#90CAF9" stroke="#2a2a2a" strokeWidth="1"/>
      )}

      {/* Sparkles for happy */}
      {mood === "happy" && (
        <>
          <path d="M20 50 L22 46 L24 50 L22 54 Z" fill="#FFD54F" stroke="#2a2a2a" strokeWidth="0.8"/>
          <path d="M96 48 L98 44 L100 48 L98 52 Z" fill="#FFD54F" stroke="#2a2a2a" strokeWidth="0.8"/>
          <path d="M14 72 L16 69 L18 72 L16 75 Z" fill="#FFD54F" stroke="#2a2a2a" strokeWidth="0.8"/>
        </>
      )}

      {/* Tear for very_sad */}
      {mood === "very_sad" && (
        <path d="M48 82 C49 86, 47 89, 46 86 Z" fill="#90CAF9" stroke="#2a2a2a" strokeWidth="0.8"/>
      )}
    </svg>
  );
}
