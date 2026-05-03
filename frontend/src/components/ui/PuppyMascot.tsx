interface PuppyMascotProps {
  size?: number;
  mood?: "happy" | "thinking" | "sleeping" | "excited";
  className?: string;
}

export function PuppyMascot({ size = 48, mood = "happy", className = "" }: PuppyMascotProps) {
  const eyes = {
    happy: (
      <>
        <circle cx="18" cy="22" r="2.5" fill="#4A3728" />
        <circle cx="32" cy="22" r="2.5" fill="#4A3728" />
        <circle cx="19" cy="21" r="0.8" fill="white" />
        <circle cx="33" cy="21" r="0.8" fill="white" />
      </>
    ),
    thinking: (
      <>
        <ellipse cx="18" cy="22" rx="2.5" ry="1.5" fill="#4A3728" />
        <ellipse cx="32" cy="22" rx="2.5" ry="1.5" fill="#4A3728" />
      </>
    ),
    sleeping: (
      <>
        <path d="M16 22 Q18 20 20 22" stroke="#4A3728" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M30 22 Q32 20 34 22" stroke="#4A3728" strokeWidth="2" fill="none" strokeLinecap="round" />
        <text x="36" y="16" fontSize="6" fill="#8B7355">z</text>
        <text x="39" y="12" fontSize="5" fill="#8B7355">z</text>
      </>
    ),
    excited: (
      <>
        <circle cx="18" cy="22" r="3" fill="#4A3728" />
        <circle cx="32" cy="22" r="3" fill="#4A3728" />
        <circle cx="19.2" cy="20.8" r="1.2" fill="white" />
        <circle cx="33.2" cy="20.8" r="1.2" fill="white" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <ellipse cx="12" cy="14" rx="7" ry="10" fill="#D4A054" transform="rotate(-15 12 14)" />
      <ellipse cx="12" cy="14" rx="4.5" ry="7" fill="#FFDAB9" transform="rotate(-15 12 14)" />
      <ellipse cx="38" cy="14" rx="7" ry="10" fill="#D4A054" transform="rotate(15 38 14)" />
      <ellipse cx="38" cy="14" rx="4.5" ry="7" fill="#FFDAB9" transform="rotate(15 38 14)" />

      {/* Head */}
      <circle cx="25" cy="26" r="16" fill="#F5D89A" />

      {/* Eyebrows (cute) */}
      <path d="M15 18 Q18 16 21 18" stroke="#C4A054" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M29 18 Q32 16 35 18" stroke="#C4A054" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      {eyes[mood]}

      {/* Nose */}
      <ellipse cx="25" cy="28" rx="3" ry="2" fill="#4A3728" />
      <ellipse cx="25" cy="27.3" rx="1.2" ry="0.6" fill="#6B5040" opacity="0.5" />

      {/* Mouth */}
      <path d="M22 30 Q25 34 28 30" stroke="#4A3728" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Tongue (happy) */}
      {mood === "happy" && (
        <ellipse cx="25" cy="33" rx="2" ry="2.5" fill="#FF8B8B" />
      )}

      {/* Blush */}
      <circle cx="14" cy="28" r="3" fill="#FFB5B5" opacity="0.4" />
      <circle cx="36" cy="28" r="3" fill="#FFB5B5" opacity="0.4" />

      {/* Collar */}
      <path d="M15 38 Q25 42 35 38" stroke="#F5A623" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="40.5" r="2" fill="#E09520" />
    </svg>
  );
}
