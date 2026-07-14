/**
 * Generic каркас страницы конструктора.
 *
 * Связывает:
 * - strategy (инструмент-специфичные аспекты: редактор молекул, звук, assembly)
 * - useConstructorStore (autosave в localStorage, CRUD)
 * - preview (хост-предоставляемая способность прослушивания)
 * - generic CellEditor и OrganismViewer
 *
 * Тонкие плагины (drum/piano) создают strategy + preview и рендерят эту страницу.
 */
import { useMemo, useState, useRef, useEffect } from 'react';
import { RotateCcw, Upload } from 'lucide-react';
import { Button, Input, Slider, cn, useClampedNumberInput } from '@jazz/ui';
import { apiClient, ApiError } from '@jazz/plugin-sdk';
import { getStyleProfile, type Hit } from '@jazz/music-core';
import type { Style as JazzStyle } from '@jazz/shared';
import { STYLES, STYLE_LABELS } from './gridMath.js';
import { CellEditor } from './CellEditor.js';
import { OrganismViewer } from './OrganismViewer.js';
import { SaveIndicator } from './SaveIndicator.js';
import { CreateEntityDialog, CreateButton, type CreateEntityKind } from './CreateEntityDialog.js';
import { isStoreDirty, type ConstructorState } from './useConstructorStore.js';
import type { ConstructorStrategy, PreviewControls } from './types.js';

interface ConstructorPageProps<TStyle extends string, TSound extends string = string> {
  strategy: ConstructorStrategy<TStyle, TSound>;
  preview: PreviewControls<TSound>;
  store: {
    (): ConstructorState<TStyle, TSound>;
  };
}

export function ConstructorPage<TStyle extends string, TSound extends string = string>({
  strategy,
  preview,
  store,
}: ConstructorPageProps<TStyle, TSound>) {
  const state = store();
  const {
    molecules,
    cells,
    organisms,
    publishedSnapshot,
    lastPublishedAt,
    updateMolecule,
    deleteMolecule,
    createMolecule,
    updateCell,
    deleteCell,
    createCell,
    updateOrganism,
    deleteOrganism,
    createOrganism,
    markPublished,
    resetToBase,
  } = state;

  const [style, setStyle] = useState<TStyle>(
    () => (strategy.styles?.[0]?.value ?? 'swing') as TStyle,
  );
  const [bpm, setBpm] = useState(120);
  const bpmInput = useClampedNumberInput({ value: bpm, onCommit: setBpm, min: 40, max: 300 });
  const [swing, setSwing] = useState(() =>
    getStyleProfile(((strategy.styles?.[0]?.value as string) ?? 'swing') as JazzStyle).swingRatio,
  );
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  // Autosave: preview-stop на смене стиля.
  const previewRef = useRef(preview);
  previewRef.current = preview;

  // ── Фильтрация по стилю ──
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

  const dirty = isStoreDirty(state);
  const hasPublished = publishedSnapshot !== null;

  // ── Публикация в код (debounce не нужен — это явное действие) ──
  const [saving, setSaving] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publishAll = async () => {
    setSaving(true);
    setPublishMsg(null);
    try {
      await apiClient.post(strategy.saveEndpoint, { cells, molecules, organisms });
      markPublished();
      setPublishMsg('Сохранено в код. Перезагрузите страницу после HMR.');
      if (publishTimer.current) clearTimeout(publishTimer.current);
      publishTimer.current = setTimeout(() => setPublishMsg(null), 5000);
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'неизвестно';
      if (e instanceof ApiError && e.issues && e.issues.length > 0) {
        const details = (e.issues as Array<{ path?: (string | number)[]; message: string }>)
          .slice(0, 5)
          .map((i) => (i.path ? `${i.path.join('.')}: ${i.message}` : i.message))
          .join('; ');
        msg += ` (${details}${e.issues.length > 5 ? '…' : ''})`;
      }
      setPublishMsg(`Ошибка сохранения: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (publishTimer.current) clearTimeout(publishTimer.current);
    };
  }, []);

  // ── Play / stop ──
  const playItem = (key: string, hits: Hit<TSound>[], loopBars: number) => {
    setPlayingKey(key);
    void previewRef.current.play(hits, { bpm, loopBars, loop: true, style: style as string });
  };
  const stopItem = () => {
    previewRef.current.stop();
    setPlayingKey(null);
  };

  // ── Смена стиля: подставляем swing-ratio из StyleProfile + стоп ──
  const selectStyle = (next: TStyle) => {
    stopItem();
    setStyle(next);
    setSwing(getStyleProfile(next as JazzStyle).swingRatio);
  };

  const handleReset = () => {
    stopItem();
    resetToBase(strategy);
  };

  // ── Create dialog state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateEntityKind>('molecule');

  const openCreate = (kind: CreateEntityKind) => {
    setCreateKind(kind);
    setCreateOpen(true);
  };

  const ToolbarExtras = strategy.ToolbarExtras;

  // ── Strategy-bound helpers для редакторов ──
  const resolveMol = (id: string) => strategy.resolveMolecule(id, molecules);
  const molLabel = (id: string) => strategy.moleculeLabel(id, molecules);

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{strategy.title}</h1>
        <p className="text-sm text-muted-foreground">{strategy.description}</p>
      </header>

      {/* ── Панель управления ── */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap gap-1">
          {(strategy.styles ?? STYLES.map((s) => ({ value: s as TStyle, label: STYLE_LABELS[s] }))).map(
            (s) => (
              <Button
                key={s.value}
                size="sm"
                variant={s.value === style ? 'default' : 'outline'}
                onClick={() => selectStyle(s.value)}
              >
                {s.label}
              </Button>
            ),
          )}
        </div>

        {ToolbarExtras && <ToolbarExtras />}

        <label className="flex items-center gap-2 text-sm">
          BPM
          <Input
            type="text"
            inputMode="numeric"
            value={bpmInput.text}
            onChange={bpmInput.onChange}
            onBlur={bpmInput.onBlur}
            onKeyDown={bpmInput.onKeyDown}
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

        <div className="ml-auto flex items-center gap-3">
          <SaveIndicator
            isDirty={dirty}
            hasPublished={hasPublished}
            saving={saving}
            lastPublishedAt={lastPublishedAt}
          />
          {publishMsg && <span className="text-xs text-muted-foreground">{publishMsg}</span>}
          {playingKey && (
            <Button size="sm" variant="secondary" onClick={stopItem}>
              Стоп
            </Button>
          )}
          <Button size="sm" onClick={() => void publishAll()} disabled={saving || !dirty}>
            <Upload className="mr-1 h-4 w-4" />
            {saving ? 'Сохранение…' : 'Опубликовать в код'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset} title="Сбросить к базовым данным">
            <RotateCcw className="mr-1 h-4 w-4" />
            Сбросить
          </Button>
        </div>
      </div>

      {/* ── Молекулы ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Молекулы ({styleMolecules.length})</h2>
          <CreateButton label="+ молекула" onClick={() => openCreate('molecule')} />
        </div>
        <div
          className={cn(
            'grid gap-4',
            strategy.family === 'unpitched' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1',
          )}
        >
          {styleMolecules.map((m) => {
            const key = `mol:${m.id}`;
            const MoleculeEditor = strategy.MoleculeEditor;
            return (
              <MoleculeEditor
                key={m.id}
                molecule={m}
                onChange={(next) => updateMolecule(m.id, next)}
                onDelete={() => {
                  stopItem();
                  deleteMolecule(m.id);
                }}
                isPlaying={playingKey === key}
                currentTick={playingKey === key ? (preview.currentTick ?? -1) : -1}
                onPlay={(hits, loopBars) => playItem(key, hits, loopBars)}
                onStop={stopItem}
                soundLabel={strategy.soundLabel}
                makeAtom={strategy.makeAtom}
                defaultVelocity={strategy.defaultVelocity}
              />
            );
          })}
        </div>
      </section>

      {/* ── Клетки ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Клетки ({styleCells.length})</h2>
          <CreateButton label="+ клетка" onClick={() => openCreate('cell')} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {styleCells.map((c) => {
            const key = `cell:${c.id}`;
            return (
              <CellEditor<TStyle, TSound>
                key={c.id}
                cell={c}
                onChange={(next) => updateCell(c.id, next)}
                onDelete={() => {
                  stopItem();
                  deleteCell(c.id);
                }}
                styleMolecules={styleMolecules}
                moleculeOverrides={molecules}
                isPlaying={playingKey === key}
                currentBar={playingKey === key ? preview.currentBar : -1}
                onPlay={(hits, loopBars) => playItem(key, hits, loopBars)}
                onStop={stopItem}
                bpm={bpm}
                swing={swing}
                resolveMolecule={resolveMol}
                moleculeLabel={molLabel}
                validateCell={strategy.validateCell}
              />
            );
          })}
        </div>
      </section>

      {/* ── Организмы ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Организмы ({styleOrganisms.length})</h2>
          <CreateButton label="+ организм" onClick={() => openCreate('organism')} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {styleOrganisms.map((o) => {
            const key = `org:${o.id}`;
            return (
              <OrganismViewer<TStyle, TSound>
                key={o.id}
                organism={o}
                onChange={(next) => updateOrganism(o.id, next)}
                onDelete={() => {
                  stopItem();
                  deleteOrganism(o.id);
                }}
                cells={cells}
                moleculeOverrides={molecules}
                isPlaying={playingKey === key}
                currentBar={playingKey === key ? preview.currentBar : -1}
                onPlay={(hits, loopBars) => playItem(key, hits, loopBars)}
                onStop={stopItem}
                bpm={bpm}
                swing={swing}
                assembleOrganism={strategy.assembleOrganism}
              />
            );
          })}
        </div>
      </section>

      {/* ── Диалог создания ── */}
      <CreateEntityDialog<TStyle, TSound>
        open={createOpen}
        onOpenChange={setCreateOpen}
        kind={createKind}
        style={style}
        strategy={strategy}
        existingIds={
          createKind === 'molecule'
            ? Object.keys(molecules)
            : createKind === 'cell'
              ? Object.keys(cells)
              : Object.keys(organisms)
        }
        onCreateMolecule={(mol) => createMolecule(mol)}
        onCreateCell={(cell) => createCell(cell)}
        onCreateOrganism={(org) => createOrganism(org)}
      />
    </div>
  );
}
