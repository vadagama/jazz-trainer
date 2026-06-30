import type { ReactNode } from 'react';
import type { SoloInstrumentManifest } from '@jazz/music-core/audio';

export interface SoloInstrumentSelectorProps {
  /** Available tone manifests. */
  tones: SoloInstrumentManifest[];
  /** Currently selected manifest ID. */
  selectedId: string | null;
  /** Callback when user selects a tone. */
  onSelect: (manifestId: string) => void;
  /** Whether a tone is currently loading. */
  loading?: boolean;
  /** Optional loading tone ID. */
  loadingToneId?: string | null;
}

/**
 * Dropdown selector for solo instrument timbres.
 * Groups by category (synth, reuse, sampled) and shows a loading spinner
 * when samples are being fetched.
 */
export function SoloInstrumentSelector({
  tones,
  selectedId,
  onSelect,
  loading,
  loadingToneId,
}: SoloInstrumentSelectorProps): ReactNode {
  const categories: Array<{ key: SoloInstrumentManifest['category']; label: string }> = [
    { key: 'synth', label: 'Synth' },
    { key: 'reuse', label: 'Accomp. Reuse' },
    { key: 'sampled', label: 'Sampled' },
  ];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="solo-tone-select" className="text-xs text-muted-foreground">
        Tone:
      </label>
      <select
        id="solo-tone-select"
        value={selectedId ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          if (id) onSelect(id);
        }}
        className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
      >
        <option value="" disabled>
          Select timbre…
        </option>
        {categories.map((cat) => {
          const catTones = tones.filter((t) => t.category === cat.key);
          if (catTones.length === 0) return null;
          return (
            <optgroup key={cat.key} label={cat.label}>
              {catTones.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {loading && loadingToneId === t.id ? ' (loading…)' : ''}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {loading && (
        <span className="inline-block size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  );
}
