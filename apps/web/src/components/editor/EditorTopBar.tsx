import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Save, Code2, Wand2, Loader2 } from 'lucide-react';
import type { HarmonyGridDTO, UpdateGridInput } from '@jazz/shared';
import { TIME_SIGNATURES, KEYS } from '@jazz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditorTopBarProps {
  grid: HarmonyGridDTO;
  isDirty: boolean;
  isSaving: boolean;
  barsCount: number;
  onAddBar: () => void;
  onRemoveLastBar: () => void;
  onSave: (data: UpdateGridInput) => void;
  onOpenDsl: () => void;
  onOpenGenerator: () => void;
}

export function EditorTopBar({
  grid,
  isDirty,
  isSaving,
  barsCount,
  onAddBar,
  onRemoveLastBar,
  onSave,
  onOpenDsl,
  onOpenGenerator,
}: EditorTopBarProps) {
  const [name, setName] = useState(grid.name);
  const [timeSig, setTimeSig] = useState(grid.timeSignature);
  const [key, setKey] = useState(grid.key);

  function handleSave() {
    onSave({ name: name.trim() || grid.name, timeSignature: timeSig, key });
  }

  const hasMetaChanges =
    name.trim() !== grid.name || timeSig !== grid.timeSignature || key !== grid.key;

  return (
    <header className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card flex-wrap">
      <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
        <Link to="/my" aria-label="Назад к моим сеткам">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-48 text-sm font-medium"
        aria-label="Название сетки"
        data-testid="grid-name-input"
      />

      <Select value={timeSig} onValueChange={(v) => setTimeSig(v as typeof timeSig)}>
        <SelectTrigger className="h-8 w-24 text-xs" aria-label="Размер" data-testid="time-sig-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_SIGNATURES.map((ts) => (
            <SelectItem key={ts} value={ts}>
              {ts}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={key} onValueChange={(v) => setKey(v as typeof key)}>
        <SelectTrigger className="h-8 w-20 text-xs" aria-label="Тональность" data-testid="key-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {KEYS.map((k) => (
            <SelectItem key={k} value={k}>
              {k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 ml-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onRemoveLastBar}
          disabled={barsCount <= 0}
          aria-label="Удалить последний такт"
          title="Удалить такт"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center" data-testid="bars-count">
          {barsCount} тк.
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={onAddBar}
          aria-label="Добавить такт"
          title="Добавить такт"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenDsl}>
          <Code2 className="size-3.5" />
          DSL
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenGenerator}>
          <Wand2 className="size-3.5" />
          Генератор
        </Button>

        {(isDirty || hasMetaChanges) && (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleSave}
            disabled={isSaving}
            data-testid="save-button"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Сохранить
          </Button>
        )}
      </div>
    </header>
  );
}
