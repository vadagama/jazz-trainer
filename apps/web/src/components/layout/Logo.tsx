export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      className={`object-contain ${className ?? ''}`}
    />
  );
}
