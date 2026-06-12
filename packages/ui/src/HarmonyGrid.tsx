import { useState, useRef, useEffect } from 'react';
import { Plus, Infinity as InfinityIcon, Pencil, Trash2 } from 'lucide-react';
import { cn } from './utils';
import type { Bar, Section, RepeatEnd, TimeSignatureString } from '@jazz/shared';
import { TIME_SIGNATURES } from '@jazz/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';

function TimeSigDisplay({
  ts,
  onChange,
  readonly,
}: {
  ts: TimeSignatureString;
  onChange: (ts: TimeSignatureString) => void;
  readonly?: boolean;
}) {
  const [num, den] = ts.split('/');
  const [open, setOpen] = useState(false);

  if (readonly) {
    return (
      <div className="flex w-10 flex-shrink-0 flex-col items-center justify-center self-stretch py-1 select-none">
        <span className="font-serif text-xl font-bold leading-none text-foreground">{num}</span>
        <div className="my-0.5 w-4 border-t border-foreground/40" />
        <span className="font-serif text-xl font-bold leading-none text-foreground">{den}</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="group relative flex w-10 flex-shrink-0 cursor-pointer flex-col items-center justify-center self-stretch py-1 select-none hover:opacity-80">
          <span className="font-serif text-xl font-bold leading-none text-foreground">{num}</span>
          <div className="my-0.5 w-4 border-t border-foreground/40" />
          <span className="font-serif text-xl font-bold leading-none text-foreground">{den}</span>
          <Pencil className="absolute -right-1 -top-1 size-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32 p-2">
        <div className="grid grid-cols-2 gap-1">
          {TIME_SIGNATURES.map((sig) => (
            <button
              key={sig}
              onClick={() => { onChange(sig); setOpen(false); }}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                ts === sig
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              {sig}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionNameEditor({
  name,
  onChange,
}: {
  name: string;
  onChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onChange(trimmed);
    else setDraft(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(name); setEditing(false); }
        }}
        className="rounded border border-primary bg-background px-2 py-0.5 text-sm font-semibold outline-none"
        style={{ minWidth: 80 }}
      />
    );
  }

  return (
    <div
      onDoubleClick={() => { setDraft(name); setEditing(true); }}
      className="group flex cursor-default items-center gap-1.5 select-none"
      title="Двойной клик для переименования"
    >
      <span className="text-sm font-semibold text-foreground">{name}</span>
      <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

const REPEAT_COUNTS = [2, 3, 4, 8] as const;

function RepeatEndDropdown({
  repeatEnd,
  onChange,
}: {
  repeatEnd: RepeatEnd | undefined;
  onChange: (r: RepeatEnd | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  function select(r: RepeatEnd | undefined) {
    onChange(r);
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className={cn(
            'absolute right-0 top-0 bottom-0 flex w-5 flex-col items-center justify-center',
            'rounded-r-lg border-l-2 transition-colors',
            repeatEnd
              ? 'border-primary/70 bg-primary/10 text-primary'
              : 'border-transparent text-muted-foreground/30 hover:border-muted-foreground/30 hover:text-muted-foreground',
          )}
          title={repeatEnd ? `Повтор ×${repeatEnd.count ?? '∞'}` : 'Добавить знак повторения'}
        >
          <span className="font-mono text-[10px] font-bold leading-none">‖</span>
          {repeatEnd && (
            <span className="mt-0.5 text-[8px] leading-none">
              {repeatEnd.count === null ? '∞' : `×${repeatEnd.count}`}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-44 p-2"
      >
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Повторений</p>
        <div className="grid grid-cols-4 gap-1">
          {REPEAT_COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => select({ count: n })}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                repeatEnd?.count === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              ×{n}
            </button>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <button
            onClick={() => select({ count: null })}
            className={cn(
              'flex items-center justify-center rounded px-2 py-1 text-xs font-medium transition-colors',
              repeatEnd?.count === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent',
            )}
          >
            <InfinityIcon className="size-3" />
          </button>
          {repeatEnd && (
            <button
              onClick={() => select(undefined)}
              className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
            >
              Убрать
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BarCard({
  bar,
  index,
  isSelected,
  isPlaying,
  isCountingIn,
  readonly,
  onSelect,
  onSetRepeatEnd,
  onMouseEnter,
}: {
  bar: Bar;
  index: number;
  isSelected: boolean;
  isPlaying?: boolean;
  isCountingIn?: boolean;
  readonly?: boolean;
  onSelect: () => void;
  onSetRepeatEnd: (r: RepeatEnd | undefined) => void;
  onMouseEnter?: () => void;
}) {
  const chordCount = bar.chords.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      onMouseEnter={onMouseEnter}
      data-testid={`bar-cell-${bar.id}`}
      aria-label={`Такт ${index + 1}${isSelected ? ', выбран' : ''}`}
      aria-pressed={isSelected}
      className={cn(
        'group relative flex min-h-[130px] flex-col justify-center cursor-pointer rounded-lg border bg-card p-4 pr-6 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'hover:border-primary/50 hover:shadow-sm',
        isCountingIn
          ? 'border-border'
          : isPlaying
            ? 'border-green-500 ring-1 ring-green-500/30 animate-pulse'
            : isSelected
              ? 'border-primary shadow-sm ring-1 ring-primary/30'
              : 'border-border',
      )}
    >
      {isCountingIn && (
        <div className="absolute left-0 top-0 h-full w-1 animate-pulse rounded-l-lg bg-red-500" />
      )}
      <span className="absolute left-2.5 top-2 select-none font-mono text-[10px] text-muted-foreground">
        {index + 1}
      </span>

      <div
        className={cn(
          'flex min-h-[52px] items-center gap-1.5',
          chordCount === 1 ? 'justify-center' : 'justify-around',
        )}
      >
        {bar.chords.length === 0 ? (
          <span className="text-sm text-muted-foreground/30">—</span>
        ) : (
          bar.chords.map((slot, i) => (
            <div key={slot.id ?? `${bar.id}-chord-${i}`} className="text-center">
              <span
                className={cn(
                  'block font-bold leading-none tracking-tight text-foreground',
                  chordCount === 1 ? 'text-3xl' : chordCount === 2 ? 'text-2xl' : 'text-xl',
                )}
              >
                {slot.symbol}
              </span>
              {slot.beats != null && (
                <span className="mt-0.5 block text-[10px] text-muted-foreground">×{slot.beats}</span>
              )}
            </div>
          ))
        )}
      </div>

      {!readonly && <RepeatEndDropdown repeatEnd={bar.repeatEnd} onChange={onSetRepeatEnd} />}
    </div>
  );
}

function colsFromTimeSignature(ts: TimeSignatureString): number {
  if (ts === '6/8') return 3;
  return parseInt(ts.split('/')[0] ?? '4', 10);
}

function SectionView({
  section,
  globalBarIndex,
  selectedBarId,
  playingBarIndex,
  countingInBarIndex,
  readonly,
  onSelectBar,
  onRename,
  onSetTimeSignature,
  onAddBar,
  onDeleteSection,
  onSetBarRepeatEnd,
  onHoverBar,
}: {
  section: Section;
  globalBarIndex: number;
  selectedBarId: string | null;
  playingBarIndex?: number;
  countingInBarIndex?: number;
  readonly?: boolean;
  onSelectBar: (id: string) => void;
  onRename: (name: string) => void;
  onSetTimeSignature: (ts: TimeSignatureString) => void;
  onAddBar: () => void;
  onDeleteSection: () => void;
  onSetBarRepeatEnd: (barId: string, r: RepeatEnd | undefined) => void;
  onHoverBar?: (barId: string | null) => void;
}) {
  const cols = colsFromTimeSignature(section.timeSignature);
  const lastRowFull = section.bars.length > 0 && section.bars.length % cols === 0;

  type Cell =
    | { type: 'timesig' }
    | { type: 'spacer'; key: string }
    | { type: 'bar'; bar: Bar; absIndex: number }
    | { type: 'ghost' };

  const cells: Cell[] = [{ type: 'timesig' }];
  section.bars.forEach((bar, i) => {
    if (i > 0 && i % cols === 0) cells.push({ type: 'spacer', key: `sp-${i}` });
    cells.push({ type: 'bar', bar, absIndex: globalBarIndex + i });
  });
  if (!readonly && section.bars.length > 0 && !lastRowFull) {
    cells.push({ type: 'ghost' });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 pl-12">
        {readonly
          ? <span className="text-sm font-semibold text-foreground select-none">{section.name}</span>
          : <SectionNameEditor name={section.name} onChange={onRename} />
        }
        {!readonly && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteSection(); }}
            className="group ml-auto flex items-center gap-1 rounded px-1.5 py-1 text-muted-foreground/40 transition-colors hover:text-primary"
            title="Удалить секцию"
          >
            <span className="text-xs">Удалить</span>
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {section.bars.length === 0 ? (
        <div
          onClick={(e) => { e.stopPropagation(); onAddBar(); }}
          className="ml-12 flex h-24 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="size-3" /> Добавить такт
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}
          data-testid={`section-grid-${section.id}`}
          onMouseLeave={() => onHoverBar?.(null)}
        >
          {cells.map((cell) => {
            if (cell.type === 'timesig') return <TimeSigDisplay key="timesig" ts={section.timeSignature} onChange={onSetTimeSignature} readonly={readonly} />;
            if (cell.type === 'spacer') return <div key={cell.key} />;
            if (cell.type === 'ghost') return (
              <button
                key="ghost"
                onClick={(e) => { e.stopPropagation(); onAddBar(); }}
                className="flex min-h-[130px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/20 text-muted-foreground/25 transition-colors hover:border-muted-foreground/40 hover:text-muted-foreground/50"
              >
                <Plus className="size-10" />
              </button>
            );
            return (
              <BarCard
                key={cell.bar.id}
                bar={cell.bar}
                index={cell.absIndex}
                isSelected={cell.bar.id === selectedBarId}
                isPlaying={cell.absIndex === playingBarIndex}
                isCountingIn={cell.absIndex === countingInBarIndex}
                readonly={readonly}
                onSelect={() => onSelectBar(cell.bar.id)}
                onSetRepeatEnd={(r) => onSetBarRepeatEnd(cell.bar.id, r)}
                onMouseEnter={() => onHoverBar?.(cell.bar.id)}
              />
            );
          })}
        </div>
      )}

      {!readonly && lastRowFull && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddBar(); }}
          className="ml-12 flex w-fit items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Plus className="size-3" /> Такт
        </button>
      )}
    </div>
  );
}

interface HarmonyGridProps {
  sections: Section[];
  selectedBarId: string | null;
  playingBarIndex?: number;
  countingInBarIndex?: number;
  readonly?: boolean;
  onSelectBar: (barId: string) => void;
  onRenameSection: (sectionId: string, name: string) => void;
  onSetSectionTimeSignature: (sectionId: string, ts: TimeSignatureString) => void;
  onAddBarToSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onSetBarRepeatEnd: (barId: string, r: RepeatEnd | undefined) => void;
  onAddSection: () => void;
  onHoverBar?: (barId: string | null) => void;
}

export function HarmonyGrid({
  sections,
  selectedBarId,
  playingBarIndex,
  countingInBarIndex,
  readonly,
  onSelectBar,
  onRenameSection,
  onSetSectionTimeSignature,
  onAddBarToSection,
  onDeleteSection,
  onSetBarRepeatEnd,
  onAddSection,
  onHoverBar,
}: HarmonyGridProps) {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-8" data-testid="harmony-grid">
        {!readonly && (
          <button
            onClick={onAddSection}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="size-4" />
            Добавить секцию
          </button>
        )}
      </div>
    );
  }

  let absIndex = 0;

  return (
    <div className="flex flex-col gap-8" data-testid="harmony-grid">
      {sections.map((section) => {
        const sectionStart = absIndex;
        absIndex += section.bars.length;
        return (
          <SectionView
            key={section.id}
            section={section}
            globalBarIndex={sectionStart}
            selectedBarId={selectedBarId}
            playingBarIndex={playingBarIndex}
            countingInBarIndex={countingInBarIndex}
            readonly={readonly}
            onSelectBar={onSelectBar}
            onRename={(name) => onRenameSection(section.id, name)}
            onSetTimeSignature={(ts) => onSetSectionTimeSignature(section.id, ts)}
            onAddBar={() => onAddBarToSection(section.id)}
            onDeleteSection={() => onDeleteSection(section.id)}
            onSetBarRepeatEnd={onSetBarRepeatEnd}
            onHoverBar={onHoverBar}
          />
        );
      })}

      {!readonly && (
        <button
          onClick={onAddSection}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="size-4" />
          Добавить секцию
        </button>
      )}
    </div>
  );
}
