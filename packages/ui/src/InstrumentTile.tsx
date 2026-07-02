import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { InstrumentId } from '@jazz/music-core';
import { INSTRUMENT_ICONS } from './instrument-icons';
import { Slider } from './slider';
import { Badge } from './badge';
import { cn } from './utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InstrumentTileProps {
  instrumentId: InstrumentId;
  name: string;
  rosterBadge: 'required' | 'recommended' | 'optional';
  enabled: boolean;
  settings: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

const ROSTER_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  required: 'default',
  recommended: 'secondary',
  optional: 'outline',
};

const ROSTER_BADGE_LABEL: Record<string, string> = {
  required: 'Основной',
  recommended: 'Рекоменд.',
  optional: 'Дополнит.',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getBool(s: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = s[key];
  return typeof v === 'boolean' ? v : fallback;
}

function getNum(s: Record<string, unknown>, key: string, fallback = 0): number {
  const v = s[key];
  return typeof v === 'number' ? v : fallback;
}

function getStr(s: Record<string, unknown>, key: string, fallback = ''): string {
  const v = s[key];
  return typeof v === 'string' ? v : fallback;
}

// ─── Controls ──────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

function ToggleRow({ label, enabled, onToggle }: ToggleRowProps): ReactNode {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
          enabled ? 'bg-primary' : 'bg-secondary',
        )}
        aria-label={label}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
            enabled ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  onChange,
}: SliderRowProps): ReactNode {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        className="flex-1"
      />
      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}

interface SelectRowProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}

function SelectRow({ label, value, options, onChange }: SelectRowProps): ReactNode {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── SoundToggle (enable + volume) ─────────────────────────────────────────────

interface SoundToggleProps {
  label: string;
  enabled: boolean;
  volume: number;
  onToggle: (v: boolean) => void;
  onVolume: (v: number) => void;
}

function SoundToggle({ label, enabled, volume, onToggle, onVolume }: SoundToggleProps): ReactNode {
  return (
    <div className="space-y-1">
      <ToggleRow label={label} enabled={enabled} onToggle={onToggle} />
      <SliderRow
        label="Громкость"
        value={Math.round(volume * 100)}
        disabled={!enabled}
        onChange={(v) => onVolume(v / 100)}
      />
    </div>
  );
}

// ─── Instrument-specific bodies ─────────────────────────────────────────────────

function DrumsBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  const drumSounds = [
    { key: 'bassDrumEnabled', volKey: 'bassDrumVolume', label: 'Бочка' },
    { key: 'snareEnabled', volKey: 'snareVolume', label: 'Малый бар.' },
    { key: 'hihatEnabled', volKey: 'hihatVolume', label: 'Хай-хэт' },
    { key: 'rideEnabled', volKey: 'rideVolume', label: 'Райд' },
    { key: 'crashEnabled', volKey: 'crashVolume', label: 'Крэш' },
    { key: 'rimEnabled', volKey: 'rimVolume', label: 'Рим' },
    { key: 'tomEnabled', volKey: 'tomVolume', label: 'Томы' },
  ];

  return (
    <div className="space-y-3">
      <SelectRow
        label="Паттерн"
        value={getStr(s, 'pattern')}
        options={[
          { value: 'swing', label: 'Swing' },
          { value: 'bossa', label: 'Bossa' },
          { value: 'funk', label: 'Funk' },
        ]}
        onChange={(v) => onChange({ pattern: v })}
      />
      <div className="border-t border-border pt-2">
        <span className="text-xs font-medium text-foreground">Звуки</span>
      </div>
      {drumSounds.map(({ key, volKey, label }) => (
        <SoundToggle
          key={key}
          label={label}
          enabled={getBool(s, key)}
          volume={getNum(s, volKey, 0.7)}
          onToggle={(v) => onChange({ [key]: v })}
          onVolume={(v) => onChange({ [volKey]: v })}
        />
      ))}
      <div className="border-t border-border pt-2" />
      <SelectRow
        label="Humanize"
        value={getStr(s, 'humanizeIntensity', 'med')}
        options={[
          { value: 'off', label: 'Выкл' },
          { value: 'low', label: 'Низкий' },
          { value: 'med', label: 'Средний' },
          { value: 'high', label: 'Высокий' },
        ]}
        onChange={(v) => onChange({ humanizeIntensity: v })}
      />
      <SliderRow
        label="Crash freq"
        value={getNum(s, 'crashFrequency', 4)}
        min={1}
        max={16}
        onChange={(v) => onChange({ crashFrequency: v })}
      />
    </div>
  );
}

function BassBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Сложность"
        value={String(getNum(s, 'complexity', 3))}
        options={[
          { value: '1', label: '1 (просто)' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5' },
          { value: '6', label: '6' },
          { value: '7', label: '7 (сложно)' },
        ]}
        onChange={(v) => onChange({ complexity: Number(v) })}
      />
      <ToggleRow
        label="Октава вверх"
        enabled={getBool(s, 'octaveUp')}
        onToggle={(v) => onChange({ octaveUp: v })}
      />
    </div>
  );
}

function PianoBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Профиль"
        value={getStr(s, 'profile')}
        options={[
          { value: 'swing-sparse', label: 'Swing Sparse' },
          { value: 'offbeat-push', label: 'Offbeat Push' },
          { value: 'basie-light', label: 'Basie Light' },
          { value: 'beginner-safe', label: 'Beginner Safe' },
        ]}
        onChange={(v) => onChange({ profile: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicingDensity')}
        options={[
          { value: 'shell2', label: 'Shell (2)' },
          { value: 'rootless3', label: 'Rootless (3)' },
          { value: 'rootless4', label: 'Rootless (4)' },
          { value: 'quartal', label: 'Quartal' },
        ]}
        onChange={(v) => onChange({ voicingDensity: v })}
      />
    </div>
  );
}

function RhodesBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Режим"
        value={getStr(s, 'mode')}
        options={[
          { value: 'halfNotes', label: 'Half Notes' },
          { value: 'subtleOffbeats', label: 'Subtle Offbeats' },
          { value: 'ambientSwells', label: 'Ambient Swells' },
          { value: 'stabAccents', label: 'Stab Accents' },
          { value: 'highComping', label: 'High Comping' },
          { value: 'pads', label: 'Pads' },
        ]}
        onChange={(v) => onChange({ mode: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicingDensity')}
        options={[
          { value: 'shell2', label: 'Shell (2)' },
          { value: 'rootless3', label: 'Rootless (3)' },
          { value: 'rootless4', label: 'Rootless (4)' },
        ]}
        onChange={(v) => onChange({ voicingDensity: v })}
      />
    </div>
  );
}

function GuitarBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Режим"
        value={getStr(s, 'mode')}
        options={[
          { value: 'comp', label: 'Comp' },
          { value: 'fingerstyle', label: 'Fingerstyle' },
        ]}
        onChange={(v) => onChange({ mode: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicing')}
        options={[
          { value: 'jazz', label: 'Jazz' },
          { value: 'open', label: 'Open' },
        ]}
        onChange={(v) => onChange({ voicing: v })}
      />
      <SelectRow
        label="Струны"
        value={getStr(s, 'stringType')}
        options={[
          { value: 'nylon', label: 'Nylon' },
          { value: 'steel', label: 'Steel' },
        ]}
        onChange={(v) => onChange({ stringType: v })}
      />
    </div>
  );
}

function ElectricGuitarBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Режим"
        value={getStr(s, 'mode')}
        options={[{ value: 'comp', label: 'Comp' }]}
        onChange={(v) => onChange({ mode: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicing')}
        options={[{ value: 'jazz', label: 'Jazz' }]}
        onChange={(v) => onChange({ voicing: v })}
      />
    </div>
  );
}

function MelodicBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Паттерн"
        value={getStr(s, 'pattern')}
        options={[
          { value: 'counterpoint', label: 'Counterpoint' },
          { value: 'melodicPhrases', label: 'Melodic Phrases' },
        ]}
        onChange={(v) => onChange({ pattern: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicingDensity')}
        options={[
          { value: 'shell2', label: 'Shell (2)' },
          { value: 'rootless3', label: 'Rootless (3)' },
          { value: 'rootless4', label: 'Rootless (4)' },
        ]}
        onChange={(v) => onChange({ voicingDensity: v })}
      />
    </div>
  );
}

function VibraphoneBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Паттерн"
        value={getStr(s, 'pattern')}
        options={[
          { value: 'pads', label: 'Pads' },
          { value: 'inserts', label: 'Inserts' },
        ]}
        onChange={(v) => onChange({ pattern: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicingDensity')}
        options={[
          { value: 'shell2', label: 'Shell (2)' },
          { value: 'rootless3', label: 'Rootless (3)' },
          { value: 'rootless4', label: 'Rootless (4)' },
        ]}
        onChange={(v) => onChange({ voicingDensity: v })}
      />
    </div>
  );
}

function OrganBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  return (
    <div className="space-y-3">
      <SelectRow
        label="Паттерн"
        value={getStr(s, 'pattern')}
        options={[
          { value: 'pads', label: 'Pads' },
          { value: 'pads-stabs', label: 'Pads + Stabs' },
        ]}
        onChange={(v) => onChange({ pattern: v })}
      />
      <SelectRow
        label="Voicing"
        value={getStr(s, 'voicingDensity')}
        options={[
          { value: 'shell2', label: 'Shell (2)' },
          { value: 'rootless4', label: 'Rootless (4)' },
        ]}
        onChange={(v) => onChange({ voicingDensity: v })}
      />
    </div>
  );
}

function PercussionBody({
  s,
  onChange,
}: {
  s: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}): ReactNode {
  const sounds = [
    { key: 'congaHighEnabled', volKey: 'congaHighVolume', label: 'Conga High' },
    { key: 'congaLowEnabled', volKey: 'congaLowVolume', label: 'Conga Low' },
    { key: 'timbalesEnabled', volKey: 'timbalesVolume', label: 'Timbales' },
    { key: 'cowbellEnabled', volKey: 'cowbellVolume', label: 'Cowbell' },
    { key: 'claveEnabled', volKey: 'claveVolume', label: 'Clave' },
    { key: 'shakerEnabled', volKey: 'shakerVolume', label: 'Shaker' },
    { key: 'guiroEnabled', volKey: 'guiroVolume', label: 'Guiro' },
    { key: 'triangleEnabled', volKey: 'triangleVolume', label: 'Triangle' },
  ];

  return (
    <div className="space-y-3">
      <SelectRow
        label="Паттерн"
        value={getStr(s, 'pattern')}
        options={[
          { value: 'cascara-clave', label: 'Cascara + Clave' },
          { value: 'bossa-texture', label: 'Bossa Texture' },
          { value: 'funk-accents', label: 'Funk Accents' },
        ]}
        onChange={(v) => onChange({ pattern: v })}
      />
      <div className="border-t border-border pt-2">
        <span className="text-xs font-medium text-foreground">Звуки</span>
      </div>
      {sounds.map(({ key, volKey, label }) => (
        <SoundToggle
          key={key}
          label={label}
          enabled={getBool(s, key)}
          volume={getNum(s, volKey, 0.6)}
          onToggle={(v) => onChange({ [key]: v })}
          onVolume={(v) => onChange({ [volKey]: v })}
        />
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function InstrumentTile({
  instrumentId,
  name,
  rosterBadge,
  enabled,
  settings: s,
  onChange,
}: InstrumentTileProps): ReactNode {
  const [expanded, setExpanded] = useState(false);
  const Icon = INSTRUMENT_ICONS[instrumentId];
  const volumePct = Math.round(getNum(s, 'volume', 0.5) * 100);

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 transition-opacity',
        !enabled && 'opacity-50',
      )}
    >
      {/* ── Upper row ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 min-w-0 flex-1"
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{name}</span>
          <Badge
            variant={ROSTER_BADGE_VARIANT[rosterBadge] ?? 'outline'}
            className="text-[10px] px-1.5 py-0"
          >
            {ROSTER_BADGE_LABEL[rosterBadge] ?? rosterBadge}
          </Badge>
        </button>

        {/* Enable/disable toggle */}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {enabled ? 'Вкл' : 'Выкл'}
        </span>
        <button
          type="button"
          onClick={() => onChange({ enabled: !enabled })}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors',
            enabled ? 'bg-primary' : 'bg-secondary',
          )}
          aria-label={enabled ? 'Выключить' : 'Включить'}
        >
          <span
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
              enabled ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </button>

        {/* Volume slider */}
        <Slider
          min={0}
          max={100}
          step={1}
          value={[volumePct]}
          disabled={!enabled}
          onValueChange={([v]) => v !== undefined && onChange({ volume: v / 100 })}
          className="w-20 shrink-0"
          aria-label="Громкость"
        />

        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>

      {/* ── Body ── */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-border">
          <InstrumentBody instrumentId={instrumentId} s={s} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// ─── Body dispatcher ───────────────────────────────────────────────────────────

function InstrumentBody({
  instrumentId,
  s,
  onChange,
}: {
  instrumentId: InstrumentId;
  s: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}): ReactNode {
  switch (instrumentId) {
    case 'drums':
    case 'modern-kit':
      return <DrumsBody s={s} onChange={onChange} />;
    case 'upright-bass':
    case 'electric-bass':
      return <BassBody s={s} onChange={onChange} />;
    case 'piano':
      return <PianoBody s={s} onChange={onChange} />;
    case 'rhodes':
      return <RhodesBody s={s} onChange={onChange} />;
    case 'guitar':
      return <GuitarBody s={s} onChange={onChange} />;
    case 'electric-guitar':
      return <ElectricGuitarBody s={s} onChange={onChange} />;
    case 'trumpet-muted':
    case 'flute':
    case 'clarinet':
      return <MelodicBody s={s} onChange={onChange} />;
    case 'vibraphone':
      return <VibraphoneBody s={s} onChange={onChange} />;
    case 'organ':
      return <OrganBody s={s} onChange={onChange} />;
    case 'percussion':
      return <PercussionBody s={s} onChange={onChange} />;
    default:
      return null;
  }
}
