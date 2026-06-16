export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Note head */}
      <ellipse cx="8" cy="24" rx="6" ry="4.5" fill="currentColor" transform="rotate(-15 8 24)" />
      {/* Stem */}
      <rect x="14" y="4" width="2.5" height="20" rx="1.25" fill="currentColor" />
      {/* Flag */}
      <path
        d="M15.25 4.5c2.5 3 7 5.5 12 4.5 0 2.5-2.5 3.5-6 3s-6-2-6-2v-5.5z"
        fill="currentColor"
      />
      {/* Swing accent dot */}
      <circle cx="25" cy="8" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
