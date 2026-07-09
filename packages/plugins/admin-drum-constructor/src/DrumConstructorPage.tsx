import { useMemo, useState } from 'react';
import { Button, Input, Slider, cn } from '@jazz/ui';
import { usePluginDrumPreview, useInstruments, apiClient } from '@jazz/plugin-sdk';
import {
  DRUM_CELL_LIST,
  DRUM_MOLECULE_LIST,
  DRUM_ORGANISM_LIST,
  getStyleProfile,
  type DrumCell,
  type DrumHit,
  type DrumMolecule,
  type DrumOrganism,
  type DrumPatternStyle,
} from '@jazz/music-core';
import { MoleculeTable } from './MoleculeTable';
import { CellEditor } from './CellEditor';
import { OrganismViewer } from './OrganismViewer';
import { STYLES, STYLE_LABELS, cloneCell, cloneMolecule, cloneOrganism } from './localModel';

/** Какой preview-кит соответствует стилю (из StyleProfile.defaultVariants.drums). */
function kitForStyle(style: DrumPatternStyle): string {
  const variant = getStyleProfile(style).defaultVariants.drums ?? 'drums';
  return variant === 'drums' ? 'jazz-drum-kit' : variant;
}

function buildMoleculeMap(): Record<string, DrumMolecule> {
  const m: Record<string, DrumMolecule> = {};
  for (const mol of DRUM_MOLECULE_LIST) m[mol.id] = cloneMolecule(mol);
  return m;
}

function buildCellMap(): Record<string, DrumCell> {
  const c: Record<string, DrumCell> = {};
  for (const cell of DRUM_CELL_LIST) c[cell.id] = cloneCell(cell);
  return c;
}

function buildOrganismMap(): Record<string, DrumOrganism> {
  const o: Record<string, DrumOrganism> = {};
  for (const org of DRUM_ORGANISM_LIST) o[org.id] = cloneOrganism(org);
  return o;
}

export default function DrumConstructorPage() {
  const preview = usePluginDrumPreview();
  const instruments = useInstruments();
  const [style, setStyle] = useState<DrumPatternStyle>('swing');
  const [bpm, setBpm] = useState(120);
  // Swing-ratio текущего стиля (0.5 = ровно). Подставляется из StyleProfile при
  // смене стиля, но остаётся редактируемым для прослушивания.
  const [swing, setSwing] = useState(() => getStyleProfile('swing').swingRatio);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  // Локальные редактируемые копии (preview-only, сброс при перезагрузке).
  const [molecules, setMolecules] = useState<Record<string, DrumMolecule>>(buildMoleculeMap);
  const [cells, setCells] = useState<Record<string, DrumCell>>(buildCellMap);
  const [organisms, setOrganisms] = useState<Record<string, DrumOrganism>>(buildOrganismMap);

  const styleMolecules = useMemo(
    () => Object.values(molecules).filter((m) => m.style === style),
    [molecules, style],
  );
  const styleCells = useMemo(
    () => Object.values(cells).filter((c) => c.style === style),
    [cells, style],
  );
  const styleOrganisms = useMemo(
    () => Object.values(organisms).filter((o) => o.style === style),
    [organisms, style],
  );

  const playItem = (key: string, hits: DrumHit[], loopBars: number) => {
    setPlayingKey(key);
    void preview.play(hits, { bpm, loopBars, loop: true });
  };
  const stopItem = () => {
    preview.stop();
    setPlayingKey(null);
  };

  // Смена стиля: подставляем swing-ratio и барабанный кит из StyleProfile.
  const selectStyle = (next: DrumPatternStyle) => {
    stopItem();
    setStyle(next);
    setSwing(getStyleProfile(next).swingRatio);
    preview.setKit(kitForStyle(next));
  };

  const resetAll = () => {
    stopItem();
    setMolecules(buildMoleculeMap());
    setCells(buildCellMap());
    setOrganisms(buildOrganismMap());
  };

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const saveAll = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiClient.post('/api/dev/drum-source', { cells, molecules, organisms });
      setSaveMsg('Сохранено в код. Перезагрузите страницу после HMR.');
    } catch (e) {
      setSaveMsg(`Ошибка сохранения: ${e instanceof Error ? e.message : 'неизвестно'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteOrganism = (id: string) => {
    stopItem();
    setOrganisms((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const deleteCell = (id: string) => {
    stopItem();
    setCells((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };
  const deleteMolecule = (id: string) => {
    stopItem();
    setMolecules((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Конструктор барабанов</h1>
        <p className="text-sm text-muted-foreground">
          Изучение молекул и клеток, сборка и прослушивание паттернов. Правки живут в памяти сессии;
          «Сохранить в код» пишет их в исходники (dev-режим).
        </p>
      </header>

      {/* ── Панель управления ── */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap gap-1">
          {STYLES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === style ? 'default' : 'outline'}
              onClick={() => selectStyle(s)}
            >
              {STYLE_LABELS[s]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Кит:</span>
          {instruments.list('drums').map((k) => (
            <Button
              key={k.id}
              size="sm"
              variant={preview.kit === k.id ? 'secondary' : 'ghost'}
              onClick={() => preview.setKit(k.id)}
            >
              {k.name}
            </Button>
          ))}
          {!preview.ready && (
            <span className="text-xs text-muted-foreground">загрузка сэмплов…</span>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          BPM
          <Input
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(Math.max(40, Math.min(300, Number(e.target.value) || 120)))}
            className="h-8 w-20"
          />
        </label>

        <div
          className="flex items-center gap-2 text-sm"
          title="Swing-ratio стиля: 0.5 = ровно, 0.67 ≈ триольный свинг"
        >
          <span className="text-muted-foreground">Свинг</span>
          <Slider
            value={[swing]}
            min={0.5}
            max={0.75}
            step={0.01}
            onValueChange={([v]) => setSwing(v ?? 0.5)}
            className="w-28"
          />
          <span className="w-8 tabular-nums text-muted-foreground">{swing.toFixed(2)}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {saveMsg && <span className="text-xs text-muted-foreground">{saveMsg}</span>}
          {playingKey && (
            <Button size="sm" variant="secondary" onClick={stopItem}>
              Стоп
            </Button>
          )}
          <Button size="sm" onClick={() => void saveAll()} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить в код'}
          </Button>
          <Button size="sm" variant="ghost" onClick={resetAll}>
            Сбросить правки
          </Button>
        </div>
      </div>

      {/* ── Молекулы ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Молекулы ({styleMolecules.length})</h2>
        <div className={cn('grid gap-4', 'grid-cols-1 xl:grid-cols-2')}>
          {styleMolecules.map((m) => {
            const key = `mol:${m.id}`;
            return (
              <MoleculeTable
                key={m.id}
                molecule={m}
                onChange={(next) => setMolecules((prev) => ({ ...prev, [m.id]: next }))}
                onDelete={() => deleteMolecule(m.id)}
                isPlaying={playingKey === key}
                onPlay={(hits, loopBars) => playItem(key, hits, loopBars)}
                onStop={stopItem}
              />
            );
          })}
        </div>
      </section>

      {/* ── Клетки ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Клетки ({styleCells.length})</h2>
        <div className="grid grid-cols-1 gap-4">
          {styleCells.map((c) => {
            const key = `cell:${c.id}`;
            return (
              <CellEditor
                key={c.id}
                cell={c}
                onChange={(next) => setCells((prev) => ({ ...prev, [c.id]: next }))}
                onDelete={() => deleteCell(c.id)}
                styleMolecules={styleMolecules}
                moleculeOverrides={molecules}
                isPlaying={playingKey === key}
                currentBar={playingKey === key ? preview.currentBar : -1}
                onPlay={(hits, loopBars) => playItem(key, hits, loopBars)}
                onStop={stopItem}
                bpm={bpm}
                swing={swing}
              />
            );
          })}
        </div>
      </section>

      {/* ── Организмы ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Организмы ({styleOrganisms.length})</h2>
        <div className="grid grid-cols-1 gap-4">
          {styleOrganisms.map((o) => {
            const key = `org:${o.id}`;
            return (
              <OrganismViewer
                key={o.id}
                organism={o}
                onChange={(next) => setOrganisms((prev) => ({ ...prev, [o.id]: next }))}
                onDelete={() => deleteOrganism(o.id)}
                cells={cells}
                moleculeOverrides={molecules}
                isPlaying={playingKey === key}
                currentBar={playingKey === key ? preview.currentBar : -1}
                onPlay={(hits, loopBars) => playItem(key, hits, loopBars)}
                onStop={stopItem}
                bpm={bpm}
                swing={swing}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
