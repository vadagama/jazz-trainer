import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Неоновые акценты лендинга — те же HEX, что и цвета чипов секций харм.-сетки
 * в самом приложении (SECTION_TYPE_COLORS, packages/shared/src/music.ts, Tailwind 400/500).
 * Хранятся как HEX (а не CSS-переменные), потому что используются с alpha-suffix
 * (`${NEON.purple}33`) для полупрозрачных подложек и обводок.
 */
export const NEON = {
  teal: '#14a3a8',
  amber: '#f0a500',
  purple: '#c084fc',
  emerald: '#34d399',
  cyan: '#22d3ee',
} as const;

/** Плавное появление блока при попадании в вьюпорт. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`amz-reveal ${inView ? 'amz-in' : ''} ${className ?? ''}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/**
 * «Браузерная рамка» вокруг скриншота продукта.
 * Если файла ещё нет (src не загрузился) — показывает аккуратный плейсхолдер.
 */
export function BrowserFrame({
  src,
  alt,
  url = 'amazilia.app',
  className,
}: {
  src: string;
  alt: string;
  url?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-2xl ${className ?? ''}`}
      style={{ borderColor: 'var(--amz-border-strong)', background: 'var(--amz-surface)' }}
    >
      {/* Полоска браузера */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: 'var(--amz-surface-2)', borderBottom: '1px solid var(--amz-border)' }}
      >
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="size-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <span className="size-2.5 rounded-full" style={{ background: '#28c840' }} />
        </span>
        <span
          className="amz-mono ml-2 flex-1 truncate rounded-md px-3 py-1 text-center text-xs"
          style={{ background: 'var(--amz-bg)', color: 'var(--amz-text-dim)' }}
        >
          {url}
        </span>
      </div>
      {/* Изображение или плейсхолдер */}
      {failed ? (
        <div
          className="flex aspect-[16/10] w-full items-center justify-center text-sm"
          style={{ color: 'var(--amz-text-dim)' }}
        >
          {alt}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="block w-full"
        />
      )}
    </div>
  );
}

/**
 * Карточка с фото-подложкой и неоновым акцентом (BRAND: эклектика поверх «ночного сада»).
 * Акцентный цвет берётся точечно из палитры чипов секций харм.-сетки приложения
 * (см. SECTION_TYPE_COLORS) — teal/emerald/purple/amber/cyan.
 * Если файл фото ещё не завезли в /public/landing/ — вместо разбитой картинки
 * показывается тонированный градиент того же акцентного цвета.
 */
export function PhotoCard({
  src,
  alt,
  eyebrow,
  title,
  text,
  accent,
  delay = 0,
  className,
}: {
  src: string;
  alt: string;
  eyebrow?: string;
  title: string;
  text: string;
  accent: string;
  delay?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Reveal
      delay={delay}
      className={`group relative aspect-[3/4] overflow-hidden rounded-2xl transition-transform hover:-translate-y-1 ${className ?? ''}`}
    >
      {failed ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${accent}33, var(--amz-surface) 85%)` }}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      {/* Затемнение снизу — текст читается прямо поверх фото, без отдельной подложки */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, transparent 30%, rgba(5,6,10,0.55) 62%, rgba(5,6,10,0.97) 100%)',
        }}
      />
      {eyebrow && (
        <span
          className="amz-mono absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-medium"
          style={{ borderColor: `${accent}55`, background: 'rgba(11,13,18,0.55)', color: accent }}
        >
          {eyebrow}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--amz-text-dim)' }}>
          {text}
        </p>
      </div>
    </Reveal>
  );
}
