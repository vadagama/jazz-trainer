export function PianoKeysIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="2.5" />
      <line x1="7" y1="14" x2="7" y2="22" />
      <line x1="12" y1="14" x2="12" y2="22" />
      <line x1="17" y1="14" x2="17" y2="22" />
      <rect x="5.5" y="2" width="3" height="12" rx="1" fill="currentColor" stroke="none" />
      <rect x="10.5" y="2" width="3" height="12" rx="1" fill="currentColor" stroke="none" />
      <rect x="15.5" y="2" width="3" height="12" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
