/**
 * Hand-drawn style SVG icons that match the Marco chef character branding.
 * All icons use a loose, sketchy stroke style with rounded caps and slight
 * imperfections to feel hand-illustrated.
 */

interface IconProps {
  className?: string;
  filled?: boolean;
}

const defaultClass = "w-6 h-6";

// — Navigation / Tab Bar Icons —

export function RecipesIcon({ className = defaultClass, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Open book - sketchy */}
      <path
        d="M3.5 5.5C5 4.5 7.5 4 9.5 4.5C10.8 4.8 11.5 5.5 12 6C12.5 5.5 13.2 4.8 14.5 4.5C16.5 4 19 4.5 20.5 5.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M3.5 5.5V18.5C5.5 17.5 8 17 10 17.5C11 17.8 11.5 18.2 12 18.8C12.5 18.2 13 17.8 14 17.5C16 17 18.5 17.5 20.5 18.5V5.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"} opacity={filled ? 0.15 : 1}
      />
      <path d="M12 6V18.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Page lines */}
      <path d="M6 9.5H9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M6 12H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M14.5 9.5H18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M15 12H18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export function CollectionsIcon({ className = defaultClass, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stack of cards / folder */}
      <rect x="4" y="8" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        fill={filled ? "currentColor" : "none"} opacity={filled ? 0.15 : 1}
      />
      {/* Folder tab */}
      <path d="M4 10.5V8.5C4 7.4 4.9 6.5 6 6.5H9.5L11 8.5H18C19.1 8.5 20 9.4 20 10.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Back card peeking */}
      <path d="M6.5 6.5V5.5C6.5 4.7 7.2 4 8 4H11L12.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Content lines */}
      <path d="M8 13H16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8 15.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

export function PantryIcon({ className = defaultClass, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shopping bag */}
      <path
        d="M5.5 8.5H18.5L17.5 20H6.5L5.5 8.5Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"} opacity={filled ? 0.15 : 1}
      />
      {/* Handles */}
      <path d="M8.5 8.5V6C8.5 4.3 10 3 12 3C14 3 15.5 4.3 15.5 6V8.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Little apple/veggie doodle inside */}
      <circle cx="10" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M10 12.5V11.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="14.5" cy="15" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

export function EatsIcon({ className = defaultClass, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fork */}
      <path d="M7 3V10C7 11.5 8.5 12.5 9 12.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 3V7.5C5 9.5 7 10.5 9 10.5C11 10.5 13 9.5 13 7.5V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        fill={filled ? "currentColor" : "none"} opacity={filled ? 0.15 : 1}
      />
      <path d="M9 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Knife */}
      <path d="M17 3C17 3 19.5 5 19.5 9C19.5 11.5 18 12.5 17 13V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function MealPlanIcon({ className = defaultClass, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar */}
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8"
        fill={filled ? "currentColor" : "none"} opacity={filled ? 0.15 : 1}
      />
      {/* Top bar */}
      <path d="M3.5 10H20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Hanging hooks */}
      <path d="M8 3.5V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 3.5V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Date dots */}
      <circle cx="8" cy="13.5" r="1" fill="currentColor"/>
      <circle cx="12" cy="13.5" r="1" fill="currentColor"/>
      <circle cx="16" cy="13.5" r="1" fill="currentColor"/>
      <circle cx="8" cy="17" r="1" fill="currentColor"/>
      <circle cx="12" cy="17" r="1" fill="currentColor"/>
    </svg>
  );
}

// — Feature / Quick Action Icons —

export function SaveRecipeIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pencil writing on paper */}
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8.5 8H15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 11H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M8.5 14H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Plus */}
      <circle cx="17.5" cy="17.5" r="4" fill="currentColor" opacity="0.9"/>
      <path d="M17.5 15.5V19.5M15.5 17.5H19.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function FriendsIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Two people */}
      <circle cx="9" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3 19C3 15.5 5.5 13.5 9 13.5C12.5 13.5 15 15.5 15 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="16.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M18 13.5C19.8 14 21 15.5 21 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function SearchIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function StarIcon({ className = defaultClass, filled }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L14.5 8.5L20.5 9.2L16 13.5L17.2 19.5L12 16.5L6.8 19.5L8 13.5L3.5 9.2L9.5 8.5L12 3Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export function GlobeIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3.5 12H20.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M12 3.5C14.5 6 15.5 9 15.5 12C15.5 15 14.5 18 12 20.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M12 3.5C9.5 6 8.5 9 8.5 12C8.5 15 9.5 18 12 20.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

export function LocationIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8 2 5 5 5 9C5 14 12 22 12 22C12 22 19 14 19 9C19 5 16 2 12 2Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

// — Emoji Replacement Icons (for page headings & cards) —

export function CookingPotIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 11H19V17C19 19.2 17.2 21 15 21H9C6.8 21 5 19.2 5 17V11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M4 11H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Steam */}
      <path d="M9 8C9 6.5 10 6 9.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M12 7.5C12 6 13 5.5 12.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M15 8C15 6.5 16 6 15.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      {/* Handles */}
      <path d="M4 13H2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M20 13H21.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function VeggieIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Carrot */}
      <path d="M14 10L7 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10.5 14.5L8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 17L9.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Leaves */}
      <path d="M14 10C15.5 8.5 17 7 16 5C18 5.5 18.5 7.5 17 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 10C13 8 12.5 6 14 4.5C11.5 5 11.5 7.5 13 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function PlateIcon({ className = defaultClass }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="14" rx="9" ry="5" stroke="currentColor" strokeWidth="1.8"/>
      <ellipse cx="12" cy="13" rx="6" ry="3" stroke="currentColor" strokeWidth="1.2"/>
      {/* Steam wisps */}
      <path d="M10 9C10 7.5 11 7 10.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M14 8.5C14 7 15 6.5 14.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
