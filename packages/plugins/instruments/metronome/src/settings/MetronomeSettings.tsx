import { useCallback, useRef } from 'react';
import * as Tone from 'tone';
import type { ClickSound, MetronomeMode } from '@jazz/shared';
import { CLICK_SOUNDS, METRONOME_MODES, audioUrl } from '@jazz/shared';
import { METRONOME_SAMPLES, METRONOME_SAMPLE_BY_ID } from '@jazz/music-core';
import { useSettings, useUpdateSettings } from '@jazz/plugin-sdk';

const SOUND_LABELS: Record<ClickSound, string> = Object.fromEntries(
  METRONOME_SAMPLES.map((s) => [s.id, s.label]),
) as Record<ClickSound, string>;

const MODE_LABELS: Record<MetronomeMode, string> = {
  both: 'Везде',
  'pickup-only': 'Только затакт',
  'main-only': 'Только такты',
};

interface BeatSectionProps {
  label: string;
  soundKey: 'clickStrong' | 'clickStrong2' | 'clickWeak';
  enabledKey: 'metronomeStrongEnabled' | 'metronomeStrong2Enabled' | 'metronomeWeakEnabled';
  volumeKey: 'metronomeStrongVolume' | 'metronomeStrong2Volume' | 'metronomeWeakVolume';
}

function BeatSection({ label, soundKey, enabledKey, volumeKey }: BeatSectionProps) {
  const { data: settings } = useSettings();
  const { mutate: update } = useUpdateSettings();
  const previewRef = useRef<Tone.Player | null>(null);

  const sound = (settings?.[soundKey] as ClickSound | null) ?? 'drum-stick';
  const enabled = (settings?.[enabledKey] as boolean) ?? true;
  const volume = (settings?.[volumeKey] as number) ?? 0.8;
  const disabled = !settings;

  const preview = useCallback(
    (clickSound: ClickSound) => {
      previewRef.current?.dispose();
      const url = audioUrl(METRONOME_SAMPLE_BY_ID[clickSound].url, settings?.audioFormat);
      const player = new Tone.Player(url).toDestination();
      player.volume.value = Tone.gainToDb((settings?.metronomeVolume ?? 0.8) * volume);
      previewRef.current = player;
      Tone.loaded().then(() => player.start());
    },
    [settings?.audioFormat, settings?.metronomeVolume, volume],
  );

  return (
    <fieldset className="space-y-3 border border-zinc-700 rounded-lg p-4">
      <legend className="text-sm font-medium text-zinc-300 px-1">{label}</legend>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => update({ [enabledKey]: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm text-zinc-400">Вкл</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Звук</span>
        <select
          value={sound}
          disabled={disabled || !enabled}
          onChange={(e) => {
            const val = e.target.value as ClickSound;
            update({ [soundKey]: val });
            preview(val);
          }}
          className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200"
        >
          {CLICK_SOUNDS.map((s) => (
            <option key={s} value={s}>
              {SOUND_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Громкость: {Math.round(volume * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          disabled={disabled || !enabled}
          onChange={(e) => update({ [volumeKey]: parseFloat(e.target.value) })}
          className="w-full"
        />
      </label>
    </fieldset>
  );
}

export default function MetronomeSettings() {
  const { data: settings } = useSettings();
  const { mutate: update } = useUpdateSettings();

  const mode = (settings?.metronomeMode as MetronomeMode) ?? 'both';
  const masterVolume = settings?.metronomeVolume ?? 0.8;
  const disabled = !settings;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Метроном</h1>

      <div className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-300">Режим</span>
          <select
            value={mode}
            disabled={disabled}
            onChange={(e) => update({ metronomeMode: e.target.value as MetronomeMode })}
            className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 w-48"
          >
            {METRONOME_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-300">
            Общая громкость: {Math.round(masterVolume * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            disabled={disabled}
            onChange={(e) => update({ metronomeVolume: parseFloat(e.target.value) })}
            className="w-full max-w-xs"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BeatSection
          label="Сильная доля (1)"
          soundKey="clickStrong"
          enabledKey="metronomeStrongEnabled"
          volumeKey="metronomeStrongVolume"
        />
        <BeatSection
          label="Вторая сильная (3)"
          soundKey="clickStrong2"
          enabledKey="metronomeStrong2Enabled"
          volumeKey="metronomeStrong2Volume"
        />
        <BeatSection
          label="Слабая доля (2, 4)"
          soundKey="clickWeak"
          enabledKey="metronomeWeakEnabled"
          volumeKey="metronomeWeakVolume"
        />
      </div>
    </div>
  );
}
