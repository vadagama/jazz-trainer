/**
 * Модальное окно создания новой молекулы / клетки / организма.
 *
 * Полное CRUD: раньше конструкторы позволяли только редактировать и удалять
 * предзагруженные элементы. Теперь можно создавать элементы с нуля.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  cn,
} from '@jazz/ui';
import type { Atom, Cell, Molecule, PatternOrganism, MoleculeCategory } from '@jazz/music-core';
import type { ConstructorStrategy } from './types.js';

export type CreateEntityKind = 'molecule' | 'cell' | 'organism';

interface CreateEntityDialogProps<TStyle extends string, TSound extends string = string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: CreateEntityKind;
  style: TStyle;
  strategy: ConstructorStrategy<TStyle, TSound>;
  /** Текущие ID — для проверки уникальности. */
  existingIds: string[];
  onCreateMolecule: (mol: Molecule<TStyle, TSound>) => void;
  onCreateCell: (cell: Cell<TStyle>) => void;
  onCreateOrganism: (org: PatternOrganism<TStyle>) => void;
}

const MOLECULE_CATEGORIES: MoleculeCategory[] = [
  'groove',
  'fill',
  'texture',
  'accent',
  'intro',
  'ending',
];

export function CreateEntityDialog<TStyle extends string, TSound extends string = string>({
  open,
  onOpenChange,
  kind,
  style,
  existingIds,
  onCreateMolecule,
  onCreateCell,
  onCreateOrganism,
}: CreateEntityDialogProps<TStyle, TSound>) {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [bars, setBars] = useState<1 | 2>(1);
  const [category, setCategory] = useState<MoleculeCategory>('groove');
  const [length, setLength] = useState<8 | 12 | 16 | 32>(8);
  const [timeSig, setTimeSig] = useState<'4/4' | '3/4' | '5/4'>('4/4');
  const [error, setError] = useState<string | null>(null);

  const titleMap: Record<CreateEntityKind, string> = {
    molecule: 'Новая молекула',
    cell: 'Новая клетка',
    organism: 'Новый организм',
  };

  function reset() {
    setId('');
    setLabel('');
    setBars(1);
    setCategory('groove');
    setLength(8);
    setTimeSig('4/4');
    setError(null);
  }

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function handleCreate() {
    const trimmedId = id.trim();
    if (!trimmedId) {
      setError('Введите ID');
      return;
    }
    if (existingIds.includes(trimmedId)) {
      setError(`ID «${trimmedId}» уже существует`);
      return;
    }
    if (kind !== 'organism' && !label.trim()) {
      setError('Введите название');
      return;
    }

    if (kind === 'molecule') {
      const mol: Molecule<TStyle, TSound> = {
        id: trimmedId,
        label: label.trim(),
        style,
        bars,
        atoms: [] as Atom<TSound>[],
        category,
        tags: [],
        complexity: { min: 1, max: 2 },
      };
      onCreateMolecule(mol);
    } else if (kind === 'cell') {
      const tsTuple: Cell<TStyle>['timeSignature'] =
        timeSig === '3/4' ? [3, 4] : timeSig === '5/4' ? [5, 4] : [4, 4];
      const cell: Cell<TStyle> = {
        id: trimmedId,
        style,
        length,
        timeSignature: tsTuple,
        velocity: 0.8,
        dynamics: { type: 'steady', amount: 0 },
        lanes: [
          {
            name: 'lane-1',
            probability: 1,
            clips: [],
          },
        ],
      };
      onCreateCell(cell);
    } else {
      const org: PatternOrganism<TStyle> = {
        id: trimmedId,
        style,
        label: label.trim() || trimmedId,
        sectionMap: {},
      };
      onCreateOrganism(org);
    }

    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{titleMap[kind]}</DialogTitle>
          <DialogDescription>
            Создаётся в стиле «{String(style)}». Все поля можно изменить позже.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="entity-id">ID</Label>
            <Input
              id="entity-id"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError(null);
              }}
              placeholder={
                kind === 'molecule'
                  ? `${String(style)}-my-pattern`
                  : kind === 'cell'
                    ? `${String(style)}-8-my-cell`
                    : `${String(style)}-my-organism`
              }
            />
          </div>

          {kind !== 'organism' && (
            <div className="space-y-1.5">
              <Label htmlFor="entity-label">Название</Label>
              <Input
                id="entity-label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setError(null);
                }}
                placeholder="My Pattern"
              />
            </div>
          )}

          {kind === 'organism' && (
            <div className="space-y-1.5">
              <Label htmlFor="entity-label">Название (опционально)</Label>
              <Input
                id="entity-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={id || 'My Organism'}
              />
            </div>
          )}

          {kind === 'molecule' && (
            <>
              <div className="space-y-1.5">
                <Label>Тактов</Label>
                <div className="flex gap-2">
                  {([1, 2] as const).map((b) => (
                    <Button
                      key={b}
                      size="sm"
                      variant={bars === b ? 'default' : 'outline'}
                      onClick={() => setBars(b)}
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Категория</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MoleculeCategory)}
                >
                  {MOLECULE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {kind === 'cell' && (
            <>
              <div className="space-y-1.5">
                <Label>Длина (тактов)</Label>
                <div className="flex gap-2">
                  {([8, 12, 16, 32] as const).map((l) => (
                    <Button
                      key={l}
                      size="sm"
                      variant={length === l ? 'default' : 'outline'}
                      onClick={() => setLength(l)}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Размер</Label>
                <div className="flex gap-2">
                  {(['4/4', '3/4', '5/4'] as const).map((ts) => (
                    <Button
                      key={ts}
                      size="sm"
                      variant={timeSig === ts ? 'default' : 'outline'}
                      onClick={() => setTimeSig(ts)}
                    >
                      {ts}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Кнопка-триггер «+ создать» для секций конструктора. */
export function CreateButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} className={cn(className)}>
      {label}
    </Button>
  );
}

// re-export для удобства (не используется здесь, но убирает unused-warning стратегии)
export type { ConstructorStrategy };
