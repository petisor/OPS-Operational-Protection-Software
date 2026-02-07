interface HelmetIconProps {
  className?: string;
}

export function HelmetIcon({ className = "h-8 w-8" }: HelmetIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main helmet dome */}
      <path
        d="M8 36C8 20 18 8 32 8C46 8 56 20 56 36V40H8V36Z"
        className="fill-primary"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Helmet brim */}
      <path
        d="M4 40H60V46C60 48 58 50 56 50H8C6 50 4 48 4 46V40Z"
        className="fill-primary"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Center ridge */}
      <path
        d="M32 8V36"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      {/* Side ridges */}
      <path
        d="M20 12C18 18 16 28 16 36"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      <path
        d="M44 12C46 18 48 28 48 36"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      {/* Highlight */}
      <path
        d="M24 16C22 22 20 30 20 36"
        stroke="white"
        strokeWidth="2"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
