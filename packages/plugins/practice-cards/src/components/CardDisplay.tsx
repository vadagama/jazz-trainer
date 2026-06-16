import { useLayoutEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import type { PracticeBar, CardMode } from '../generators/types.js';

export interface CardDisplayProps {
  bars: PracticeBar[];
  currentIndex: number;
  mode: CardMode;
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function chordFontSize(chordCount: number): string {
  if (chordCount <= 2) return 'text-2xl';
  if (chordCount <= 4) return 'text-xl';
  return 'text-lg';
}

const CARD_CLASSES = 'w-[22.4rem] h-56 flex items-center justify-center rounded-xl border-2 p-6';

const DIRECTION_LABELS: Record<NonNullable<PracticeBar['direction']>, string> = {
  up: '↑ вверх',
  down: '↓ вниз',
};

function CardContent({ bar }: { bar: PracticeBar }) {
  if (bar.scaleLabel) {
    const spaceIdx = bar.scaleLabel.indexOf(' ');
    const root = spaceIdx >= 0 ? bar.scaleLabel.slice(0, spaceIdx) : bar.scaleLabel;
    const scaleName = spaceIdx >= 0 ? bar.scaleLabel.slice(spaceIdx + 1) : '';
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-7xl font-bold leading-none text-foreground">{root}</span>
        {scaleName && (
          <span className="text-2xl font-semibold leading-tight text-foreground">{scaleName}</span>
        )}
        {bar.direction && (
          <span className="mt-1 text-lg font-medium leading-tight text-muted-foreground">
            {DIRECTION_LABELS[bar.direction]}
          </span>
        )}
      </div>
    );
  }
  const fontClass = chordFontSize(bar.chords.length);
  return (
    <span className={`${fontClass} font-bold text-center leading-tight text-foreground`}>
      {bar.chords.join(' ')}
    </span>
  );
}

// Ghost cards (prev/next) — absolute so they don't shift the current card in flex layout
function GhostCard({ bar, side }: { bar: PracticeBar; side: 'left' | 'right' }) {
  const offset = side === 'left' ? 'calc(-50% - 24rem)' : 'calc(-50% + 24rem)';

  return (
    <div
      className={`absolute top-1/2 left-1/2 ${CARD_CLASSES} border-border bg-card/80`}
      style={{
        transform: `translate(${offset}, -50%) scale(0.85)`,
        opacity: side === 'left' ? 0.4 : 0.6,
      }}
    >
      <CardContent bar={bar} />
    </div>
  );
}

// Active card — in flex flow (stays centered) + entrance animation on index change
function ActiveCard({ bar, currentIndex }: { bar: PracticeBar; currentIndex: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    el.style.transition = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px) scale(0.96)';

    // Force reflow so the browser registers the initial state before animating
    void el.offsetHeight;

    el.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1)';
  }, [currentIndex]);

  return (
    <div ref={ref} className={`relative z-10 ${CARD_CLASSES} border-primary bg-card shadow-lg`}>
      <CardContent bar={bar} />
    </div>
  );
}

export function CardDisplay({ bars, currentIndex, mode }: CardDisplayProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const effectiveMode = useMemo(() => {
    if (isMobile && mode === 'prev-current-next') return 'current';
    return mode;
  }, [mode, isMobile]);

  const currentBar = bars[currentIndex] ?? null;
  const prevBar = currentIndex > 0 ? bars[currentIndex - 1] : null;
  const nextBar = currentIndex < bars.length - 1 ? bars[currentIndex + 1] : null;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden py-8">
      {(effectiveMode === 'prev-current-next' || effectiveMode === 'prev-current') && prevBar && (
        <GhostCard bar={prevBar} side="left" />
      )}

      {currentBar && <ActiveCard bar={currentBar} currentIndex={currentIndex} />}

      {effectiveMode === 'prev-current-next' && nextBar && <GhostCard bar={nextBar} side="right" />}
    </div>
  );
}

export default CardDisplay;
