/**
 * Минималистичный знак-колибри, взлетающая вертикально вверх (BRAND.md §6.6).
 * Градиент от primary (#0D7377) к accent (#F0A500). Крылья — намёк на музыкальное движение.
 */
export function HummingbirdMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="amz-bird" x1="8" y1="42" x2="40" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D7377" />
          <stop offset="1" stopColor="#F0A500" />
        </linearGradient>
      </defs>
      {/* тело: капля, взлетающая вверх */}
      <path
        d="M24 4c3.4 4.2 5.2 8.6 5.2 13.2 0 3-1 5.8-2.6 8.6l3.8 14.4c.3 1.2-1.2 2-2 1l-4.4-6-4.4 6c-.8 1-2.3.2-2-1l3.8-14.4c-1.6-2.8-2.6-5.6-2.6-8.6C18.8 12.6 20.6 8.2 24 4z"
        fill="url(#amz-bird)"
      />
      {/* левое крыло */}
      <path
        d="M18.5 18c-4 .2-8.4 2.4-12.5 6.8 5.6-1.2 9.6-.4 12.8 2.2-1.2-3-1.4-6-.3-9z"
        fill="#0D7377"
        opacity="0.9"
      />
      {/* правое крыло */}
      <path
        d="M29.5 18c4 .2 8.4 2.4 12.5 6.8-5.6-1.2-9.6-.4-12.8 2.2 1.2-3 1.4-6 .3-9z"
        fill="#14A3A8"
        opacity="0.9"
      />
    </svg>
  );
}

export function AmaziliaWordmark({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/landing/logo.png" alt="" aria-hidden="true" width={size} height={size} style={{ height: size, width: 'auto' }} />
      <span
        className="amz-display text-xl font-semibold tracking-tight"
        style={{ color: 'var(--amz-text)' }}
      >
        Amazilia
      </span>
    </span>
  );
}
