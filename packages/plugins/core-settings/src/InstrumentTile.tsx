import { useCallback } from 'react';
import type { Style, UserSettingsDTO } from '@jazz/shared';
import { getStyleProfile, type InstrumentId } from '@jazz/music-core';
import { useSettings, useUpdateSettings } from '@jazz/plugin-sdk';
import {
  Card,
  CardContent,
  CardHeader,
  Slider,
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@jazz/ui';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface InstrumentTileProps {
  instrumentId: InstrumentId;
  style: Style;
}

type SettingsRecord = Partial<UserSettingsDTO>;

// ─── Labels ────────────────────────────────────────────────────────────────────

const INSTRUMENT_NAMES: Record<InstrumentId, string> = {
  drums: 'Drum Kit',
  'modern-kit': 'Drum Kit',
  'upright-bass': 'Bass',
  'electric-bass': 'Bass',
  piano: 'Piano',
  'upright-piano': 'Piano',
  rhodes: 'Rhodes',
  guitar: 'Guitar',
  'electric-guitar': 'Guitar',
  vibraphone: 'Vibraphone',
  organ: 'Organ',
  clarinet: 'Clarinet',
  percussion: 'Percussion',
  'trumpet-muted': 'Trumpet',
  flute: 'Flute',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toSettingsPrefix(id: InstrumentId): string | null {
  const MAP: Partial<Record<InstrumentId, string | null>> = {
    drums: 'drums',
    'modern-kit': 'drums',
    'upright-bass': 'bass',
    'electric-bass': 'bass',
    piano: 'piano',
    rhodes: 'rhodes',
    guitar: 'guitar',
    'electric-guitar': 'guitar',
    percussion: 'percussion',
    // Style-driven instruments (no user settings yet):
    vibraphone: null,
    organ: null,
    clarinet: null,
    'trumpet-muted': null,
    flute: null,
  };
  return MAP[id] ?? null;
}

function get(s: SettingsRecord | undefined, key: string, fallback: unknown = undefined) {
  if (!s) return fallback;
  return (s as Record<string, unknown>)[key] ?? fallback;
}

function pct(v: number | undefined, def: number) {
  return Math.round((v ?? def) * 100);
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function VolSlider({
  value,
  defaultValue,
  disabled,
  onChange,
}: {
  value: number | undefined;
  defaultValue: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const currentPct = pct(value, defaultValue);

  return (
    <div className="flex items-center gap-2">
      <Slider
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        value={[currentPct]}
        onValueChange={(vals) => onChange((vals[0] ?? Math.round(defaultValue * 100)) / 100)}
        className="w-28"
      />
      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
        {currentPct}%
      </span>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs">{label}</Label>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingSelect({
  value,
  defaultValue,
  options,
  disabled,
  className,
  onChange,
}: {
  value: string | undefined;
  defaultValue: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value ?? defaultValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className ?? 'w-40 h-7 text-xs'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Tile dispatcher ───────────────────────────────────────────────────────────

export function InstrumentTile({ instrumentId, style }: InstrumentTileProps) {
  if (instrumentId === 'drums' || instrumentId === 'modern-kit') {
    return <DrumsTile instrumentId={instrumentId} style={style} />;
  }
  if (instrumentId === 'upright-bass' || instrumentId === 'electric-bass')
    return <BassTile style={style} />;
  if (instrumentId === 'piano') return <PianoTile style={style} />;
  if (instrumentId === 'rhodes') return <RhodesTile style={style} />;
  if (instrumentId === 'guitar' || instrumentId === 'electric-guitar') {
    return <GuitarTile instrumentId={instrumentId} style={style} />;
  }
  if (instrumentId === 'percussion') return <PercussionTile style={style} />;
  return <SimpleTile instrumentId={instrumentId} style={style} />;
}

// ─── Header row (enable + name) ────────────────────────────────────────────────

function TileHeader({
  name,
  enabled,
  onToggle,
}: {
  name: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{name}</span>
      <Button
        variant={enabled ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="h-7 text-xs"
      >
        {enabled ? 'Вкл' : 'Выкл'}
      </Button>
    </div>
  );
}

// ─── Drums ─────────────────────────────────────────────────────────────────────

function DrumsTile({
  instrumentId,
  style,
}: {
  instrumentId: 'drums' | 'modern-kit';
  style: Style;
}) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = 'drums';

  const defaults = getStyleProfile(style).instrumentDefaults[instrumentId];
  const enabled = get(settings, `${prefix}Enabled`) !== false;
  const on = enabled;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <TileHeader
          name={INSTRUMENT_NAMES[instrumentId]}
          enabled={on}
          onToggle={() => set({ [`${prefix}Enabled`]: !on })}
        />
      </CardHeader>
      <CardContent className={on ? 'space-y-3' : 'space-y-3 pointer-events-none opacity-60'}>
        <SettingRow label="Громкость">
          <VolSlider
            value={get(settings, `${prefix}Volume`) as number | undefined}
            defaultValue={defaults.volume}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}Volume`]: v })}
          />
        </SettingRow>

        <SettingRow label="Набор сэмплов">
          <SettingSelect
            value={(get(settings, 'drumKit') as string) ?? 'jazz-kit'}
            defaultValue="jazz-kit"
            disabled={!on}
            options={[
              { value: 'jazz-kit', label: 'Jazz Kit' },
              { value: 'modern-kit', label: 'Modern Kit' },
            ]}
            onChange={(v) => set({ drumKit: v })}
          />
        </SettingRow>

        <SettingRow label="Humanize">
          <SettingSelect
            value={get(settings, `${prefix}HumanizeIntensity`) as string}
            defaultValue="med"
            disabled={!on}
            options={[
              { value: 'off', label: 'Выкл' },
              { value: 'low', label: 'Низкая' },
              { value: 'med', label: 'Средняя' },
              { value: 'high', label: 'Высокая' },
            ]}
            onChange={(v) => set({ [`${prefix}HumanizeIntensity`]: v })}
          />
        </SettingRow>

        {style === 'funk' && (
          <>
            <SettingRow label="Сложность (funk)">
              <SettingSelect
                value={get(settings, `${prefix}FunkComplexity`) as string}
                defaultValue="medium"
                disabled={!on}
                options={[
                  { value: 'simple', label: 'Простой' },
                  { value: 'medium', label: 'Средний' },
                  { value: 'complex', label: 'Сложный' },
                ]}
                onChange={(v) => set({ [`${prefix}FunkComplexity`]: v })}
              />
            </SettingRow>
            <SettingRow label="Fill частота">
              <SettingSelect
                value={get(settings, `${prefix}FillFrequency`) as string}
                defaultValue="8bars"
                disabled={!on}
                options={[
                  { value: 'never', label: 'Без fills' },
                  { value: '16bars', label: 'Редко (16т)' },
                  { value: '8bars', label: 'Умеренно (8т)' },
                  { value: '4bars', label: 'Часто (4т)' },
                ]}
                onChange={(v) => set({ [`${prefix}FillFrequency`]: v })}
              />
            </SettingRow>
          </>
        )}

        <SettingRow label="Рандомизация">
          <SettingSelect
            value={get(settings, `${prefix}RandomizationLevel`) as string}
            defaultValue="off"
            disabled={!on}
            options={[
              { value: 'off', label: 'Выкл' },
              { value: 'subtle', label: 'Тонкая' },
              { value: 'moderate', label: 'Умеренная' },
              { value: 'high', label: 'Высокая' },
            ]}
            onChange={(v) => set({ [`${prefix}RandomizationLevel`]: v })}
          />
        </SettingRow>

        {(get(settings, `${prefix}RandomizationLevel`) ?? 'off') !== 'off' && (
          <div className="space-y-2 pl-3 border-l-2 border-primary/30">
            <p className="text-xs font-semibold text-primary/70">Колонки рандомизации</p>
            <SettingRow label="Сложность fills">
              <SettingSelect
                value={get(settings, `${prefix}FillComplexity`) as string}
                defaultValue="medium"
                disabled={!on}
                options={[
                  { value: 'simple', label: 'Простая' },
                  { value: 'medium', label: 'Средняя' },
                  { value: 'complex', label: 'Сложная' },
                ]}
                onChange={(v) => set({ [`${prefix}FillComplexity`]: v })}
              />
            </SettingRow>
            <SettingRow label="Вариация ride">
              <Checkbox
                disabled={!on}
                checked={(get(settings, `${prefix}RideVariation`) as boolean) ?? true}
                onChange={(e) => set({ [`${prefix}RideVariation`]: e.target.checked })}
              />
            </SettingRow>
            <SettingRow label="Ghost notes (snare)">
              <Checkbox
                disabled={!on}
                checked={(get(settings, `${prefix}SnareGhosts`) as boolean) ?? true}
                onChange={(e) => set({ [`${prefix}SnareGhosts`]: e.target.checked })}
              />
            </SettingRow>
            <SettingRow label="Вариация bass drum">
              <Checkbox
                disabled={!on}
                checked={(get(settings, `${prefix}BassDrumVariation`) as boolean) ?? true}
                onChange={(e) => set({ [`${prefix}BassDrumVariation`]: e.target.checked })}
              />
            </SettingRow>
          </div>
        )}

        {/* Sub-components */}
        <SubDrumsSection
          title="Bass Drum"
          enKey={`${prefix}BassDrumEnabled`}
          volKey={`${prefix}BassDrumVolume`}
          settings={settings}
          defVol={0.7}
          parentOn={on}
          set={set}
        />
        <SubDrumsSection
          title="Snare"
          enKey={`${prefix}SnareEnabled`}
          volKey={`${prefix}SnareVolume`}
          settings={settings}
          defVol={0.8}
          parentOn={on}
          set={set}
        />
        <SubDrumsSection
          title="Hi-hat"
          enKey={`${prefix}HihatEnabled`}
          volKey={`${prefix}HihatVolume`}
          settings={settings}
          defVol={0.65}
          parentOn={on}
          set={set}
          extra={
            <SettingRow label="Открытость">
              <SettingSelect
                value={String((get(settings, `${prefix}HihatOpenness`) as number) ?? 0)}
                defaultValue="0"
                disabled={!on}
                options={[
                  { value: '0', label: 'Закрытый' },
                  { value: '1', label: 'Слегка открытый' },
                  { value: '2', label: 'Полуоткрытый' },
                  { value: '3', label: 'Открытый' },
                  { value: '4', label: 'Широко открытый' },
                  { value: '5', label: 'Макс. открытый' },
                ]}
                onChange={(v) => set({ [`${prefix}HihatOpenness`]: Number(v) })}
              />
            </SettingRow>
          }
        />
        <SubDrumsSection
          title="Ride"
          enKey={`${prefix}RideEnabled`}
          volKey={`${prefix}RideVolume`}
          settings={settings}
          defVol={0.7}
          parentOn={on}
          set={set}
        />
        <SubDrumsSection
          title="Crash"
          enKey={`${prefix}CrashEnabled`}
          volKey={`${prefix}CrashVolume`}
          settings={settings}
          defVol={0.8}
          parentOn={on}
          set={set}
          extra={
            <SettingRow label="Частота crash">
              <SettingSelect
                value={String((get(settings, `${prefix}CrashFrequency`) as number) ?? 4)}
                defaultValue="4"
                disabled={!on}
                options={[
                  { value: '0', label: 'Никогда' },
                  { value: '4', label: 'Каждые 4 такта' },
                  { value: '8', label: 'Каждые 8 тактов' },
                  { value: '16', label: 'Каждые 16 тактов' },
                  { value: '32', label: 'Каждые 32 такта' },
                ]}
                onChange={(v) => set({ [`${prefix}CrashFrequency`]: Number(v) })}
              />
            </SettingRow>
          }
        />
      </CardContent>
    </Card>
  );
}

function SubDrumsSection({
  title,
  enKey,
  volKey,
  settings,
  defVol,
  parentOn,
  set,
  extra,
}: {
  title: string;
  enKey: string;
  volKey: string;
  settings: SettingsRecord | undefined;
  defVol: number;
  parentOn: boolean;
  set: (p: Record<string, unknown>) => void;
  extra?: React.ReactNode;
}) {
  const enabled = get(settings, enKey) !== false;
  const disabled = !parentOn || !enabled;
  return (
    <div className="space-y-1 pl-3 border-l border-border">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{title}</p>
        <Checkbox
          checked={enabled}
          disabled={!parentOn}
          onChange={(e) => set({ [enKey]: e.target.checked })}
        />
      </div>
      <VolSlider
        value={get(settings, volKey) as number | undefined}
        defaultValue={defVol}
        disabled={disabled}
        onChange={(v) => set({ [volKey]: v })}
      />
      {extra && (
        <div className={!parentOn || !enabled ? 'pointer-events-none opacity-50' : ''}>{extra}</div>
      )}
    </div>
  );
}

// ─── Bass ──────────────────────────────────────────────────────────────────────

function BassTile({ style }: { style: Style }) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = 'bass';

  const defaults = getStyleProfile(style).instrumentDefaults['upright-bass'];
  const on = get(settings, `${prefix}Enabled`) !== false;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <TileHeader
          name={INSTRUMENT_NAMES['upright-bass']}
          enabled={on}
          onToggle={() => set({ [`${prefix}Enabled`]: !on })}
        />
      </CardHeader>
      <CardContent className={on ? 'space-y-3' : 'space-y-3 pointer-events-none opacity-60'}>
        <SettingRow label="Громкость">
          <VolSlider
            value={get(settings, `${prefix}Volume`) as number | undefined}
            defaultValue={defaults.volume}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}Volume`]: v })}
          />
        </SettingRow>

        <SettingRow label="Сложность паттерна">
          <SettingSelect
            value={String(get(settings, `${prefix}Complexity`) ?? 1)}
            defaultValue="1"
            disabled={!on}
            options={[
              { value: '1', label: '1 — Корень на доле 1' },
              { value: '2', label: '2 — Корень на каждой доле' },
              { value: '3', label: '3 — Корень + квинта' },
              { value: '4', label: '4 — Звуки аккорда' },
              { value: '5', label: '5 — Walking + хроматика' },
              { value: '6', label: '6 — Аккорд (1 2 3 4)' },
              { value: '7', label: '7 — Аккорд (1 3)' },
            ]}
            className="w-48 h-7 text-xs"
            onChange={(v) => set({ [`${prefix}Complexity`]: Number(v) })}
          />
        </SettingRow>

        <SettingRow label="+1 октава">
          <Checkbox
            disabled={!on}
            checked={(get(settings, `${prefix}OctaveUp`) as boolean) ?? false}
            onChange={(e) => set({ [`${prefix}OctaveUp`]: e.target.checked })}
          />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// ─── Piano ─────────────────────────────────────────────────────────────────────

function PianoTile({ style }: { style: Style }) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = 'piano';

  const defaults = getStyleProfile(style).instrumentDefaults.piano;
  const on = get(settings, `${prefix}Enabled`) !== false;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <TileHeader
          name={INSTRUMENT_NAMES.piano}
          enabled={on}
          onToggle={() => set({ [`${prefix}Enabled`]: !on })}
        />
      </CardHeader>
      <CardContent className={on ? 'space-y-3' : 'space-y-3 pointer-events-none opacity-60'}>
        <SettingRow label="Громкость">
          <VolSlider
            value={get(settings, `${prefix}Volume`) as number | undefined}
            defaultValue={defaults.volume}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}Volume`]: v })}
          />
        </SettingRow>

        <SettingRow label="Профиль компинга">
          <SettingSelect
            value={(get(settings, `${prefix}Profile`) as string) ?? 'swing-sparse'}
            defaultValue="swing-sparse"
            disabled={!on}
            options={[
              { value: 'swing-sparse', label: 'Swing Sparse' },
              { value: 'swing-medium', label: 'Swing Medium' },
              { value: 'basie-light', label: 'Basie Light' },
              { value: 'offbeat-push', label: 'Offbeat Push' },
              { value: 'beginner-safe', label: 'Beginner Safe' },
            ]}
            className="w-40 h-7 text-xs"
            onChange={(v) => set({ [`${prefix}Profile`]: v })}
          />
        </SettingRow>

        <SettingRow label="Воисинг">
          <SettingSelect
            value={(get(settings, `${prefix}VoicingDensity`) as string) ?? 'rootless3'}
            defaultValue="rootless3"
            disabled={!on}
            options={[
              { value: 'shell2', label: 'Shell (3+7)' },
              { value: 'rootless3', label: 'Rootless 3' },
              { value: 'rootless4', label: 'Rootless 4' },
              { value: 'quartal', label: 'Quartal' },
            ]}
            className="w-36 h-7 text-xs"
            onChange={(v) => set({ [`${prefix}VoicingDensity`]: v })}
          />
        </SettingRow>

        <SettingRow label="Сэмплы">
          <SettingSelect
            value={(get(settings, `${prefix}SampleLibrary`) as string) ?? 'salamander'}
            defaultValue="salamander"
            disabled={!on}
            options={[
              { value: 'salamander', label: 'Salamander Grand' },
              { value: 'upright-kw', label: 'Upright KW' },
            ]}
            className="w-44 h-7 text-xs"
            onChange={(v) => set({ [`${prefix}SampleLibrary`]: v })}
          />
        </SettingRow>

        <SettingRow label="Рандомизация">
          <SettingSelect
            value={(get(settings, `${prefix}RandomizationLevel`) as string) ?? 'off'}
            defaultValue="off"
            disabled={!on}
            options={[
              { value: 'off', label: 'Выкл' },
              { value: 'subtle', label: 'Лёгкая' },
              { value: 'moderate', label: 'Умеренная' },
              { value: 'high', label: 'Высокая' },
            ]}
            onChange={(v) => set({ [`${prefix}RandomizationLevel`]: v })}
          />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// ─── Rhodes ────────────────────────────────────────────────────────────────────

function RhodesTile({ style }: { style: Style }) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = 'rhodes';

  const defaults = getStyleProfile(style).instrumentDefaults.rhodes;
  const on = get(settings, `${prefix}Enabled`) !== false;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <TileHeader
          name={INSTRUMENT_NAMES.rhodes}
          enabled={on}
          onToggle={() => set({ [`${prefix}Enabled`]: !on })}
        />
      </CardHeader>
      <CardContent className={on ? 'space-y-3' : 'space-y-3 pointer-events-none opacity-60'}>
        <p className="text-xs text-muted-foreground">Дополнительный слой поверх Piano</p>

        <SettingRow label="Режим слоя">
          <SettingSelect
            value={(get(settings, `${prefix}LayerMode`) as string) ?? 'none'}
            defaultValue="none"
            disabled={!on}
            options={[
              { value: 'none', label: 'Выкл' },
              { value: 'pads', label: 'Pads' },
              { value: 'subtle-offbeats', label: 'Subtle Offbeats' },
              { value: 'high-comping', label: 'High Comping' },
              { value: 'ambient-swells', label: 'Ambient Swells' },
              { value: 'stab-accents', label: 'Stab Accents' },
            ]}
            className="w-44 h-7 text-xs"
            onChange={(v) => set({ [`${prefix}LayerMode`]: v })}
          />
        </SettingRow>

        <SettingRow label="Громкость слоя">
          <VolSlider
            value={get(settings, `${prefix}LayerVolume`) as number | undefined}
            defaultValue={0.5}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}LayerVolume`]: v })}
          />
        </SettingRow>

        <SettingRow label="Громкость Rhodes">
          <VolSlider
            value={get(settings, `${prefix}Volume`) as number | undefined}
            defaultValue={defaults.volume}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}Volume`]: v })}
          />
        </SettingRow>

        <SettingRow label="Воисинг">
          <SettingSelect
            value={(get(settings, `${prefix}VoicingDensity`) as string) ?? 'rootless3'}
            defaultValue="rootless3"
            disabled={!on}
            options={[
              { value: 'shell2', label: 'Shell (3+7)' },
              { value: 'rootless3', label: 'Rootless 3' },
              { value: 'rootless4', label: 'Rootless 4' },
            ]}
            className="w-36 h-7 text-xs"
            onChange={(v) => set({ [`${prefix}VoicingDensity`]: v })}
          />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// ─── Guitar ────────────────────────────────────────────────────────────────────

function GuitarTile({
  instrumentId,
  style,
}: {
  instrumentId: 'guitar' | 'electric-guitar';
  style: Style;
}) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = 'guitar';

  const defaults = getStyleProfile(style).instrumentDefaults[instrumentId];
  const on = get(settings, `${prefix}Enabled`) !== false;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  // Guitar shares settings prefix — distinguish by which instrument is enabled
  // For now, show enable/volume; style profile controls pattern/mode.
  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <TileHeader
          name={INSTRUMENT_NAMES[instrumentId]}
          enabled={on}
          onToggle={() => set({ [`${prefix}Enabled`]: !on })}
        />
      </CardHeader>
      <CardContent className={!on ? 'pointer-events-none opacity-60' : undefined}>
        <SettingRow label="Громкость">
          <VolSlider
            value={get(settings, `${prefix}Volume`) as number | undefined}
            defaultValue={defaults.volume}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}Volume`]: v })}
          />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// ─── Percussion ────────────────────────────────────────────────────────────────

function PercussionTile({ style }: { style: Style }) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = 'percussion';

  const defaults = getStyleProfile(style).instrumentDefaults.percussion;
  const on = get(settings, `${prefix}Enabled`) !== false;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <TileHeader
          name={INSTRUMENT_NAMES.percussion}
          enabled={on}
          onToggle={() => set({ [`${prefix}Enabled`]: !on })}
        />
      </CardHeader>
      <CardContent className={on ? 'space-y-3' : 'space-y-3 pointer-events-none opacity-60'}>
        <SettingRow label="Громкость">
          <VolSlider
            value={get(settings, `${prefix}Volume`) as number | undefined}
            defaultValue={defaults.volume}
            disabled={!on}
            onChange={(v) => set({ [`${prefix}Volume`]: v })}
          />
        </SettingRow>
        <SettingRow label="Humanize">
          <SettingSelect
            value={get(settings, `${prefix}HumanizeIntensity`) as string}
            defaultValue="med"
            disabled={!on}
            options={[
              { value: 'off', label: 'Выкл' },
              { value: 'low', label: 'Низкая' },
              { value: 'med', label: 'Средняя' },
              { value: 'high', label: 'Высокая' },
            ]}
            onChange={(v) => set({ [`${prefix}HumanizeIntensity`]: v })}
          />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// ─── Simple (vibraphone, organ, clarinet, trumpet-muted, flute) ─────────────────

function SimpleTile({ instrumentId, style }: { instrumentId: InstrumentId; style: Style }) {
  const { data: settings } = useSettings();
  const mutate = useUpdateSettings();
  const prefix = toSettingsPrefix(instrumentId);

  const defaults = getStyleProfile(style).instrumentDefaults[instrumentId];
  const on = prefix ? get(settings, `${prefix}Enabled`) !== false : defaults.enabled;

  const set = useCallback(
    (patch: Record<string, unknown>) => mutate.mutate(patch as Parameters<typeof mutate.mutate>[0]),
    [mutate],
  );

  const volKey = prefix ? `${prefix}Volume` : null;
  const enKey = prefix ? `${prefix}Enabled` : null;
  const isStyleOnly = prefix === null;

  return (
    <Card className={!on ? 'opacity-50' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{INSTRUMENT_NAMES[instrumentId]}</span>
          {isStyleOnly ? (
            <span className="text-xs text-muted-foreground">{on ? 'Вкл' : 'Выкл'}</span>
          ) : (
            <Button
              variant={on ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (enKey) set({ [enKey]: !on });
              }}
              className="h-7 text-xs"
            >
              {on ? 'Вкл' : 'Выкл'}
            </Button>
          )}
        </div>
      </CardHeader>
      {isStyleOnly ? (
        <CardContent className={!on ? 'pointer-events-none opacity-60' : undefined}>
          <p className="text-xs text-muted-foreground">Управляется стилем</p>
        </CardContent>
      ) : volKey ? (
        <CardContent className={!on ? 'pointer-events-none opacity-60' : undefined}>
          <SettingRow label="Громкость">
            <VolSlider
              value={get(settings, volKey) as number | undefined}
              defaultValue={defaults.volume}
              disabled={!on}
              onChange={(v) => set({ [volKey]: v })}
            />
          </SettingRow>
        </CardContent>
      ) : null}
    </Card>
  );
}
