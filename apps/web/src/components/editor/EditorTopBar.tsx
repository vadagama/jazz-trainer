import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Code2, Wand2, Loader2 } from 'lucide-react';
import type { HarmonyGridDTO, UpdateGridInput } from '@jazz/shared';
import { Button } from '@/components/ui/button';

interface EditorTopBarProps {
  grid: HarmonyGridDTO;
  isDirty: boolean;
  isSaving: boolean;
  onSave: (data: UpdateGridInput) => void;
  onOpenDsl: () => void;
  onOpenGenerator: () => void;
}

export function EditorTopBar({
  grid,
  isDirty,
  isSaving,
  onSave,
  onOpenDsl,
  onOpenGenerator,
}: EditorTopBarProps) {
  function handleSave() {
    onSave({ name: grid.name, timeSignature: grid.timeSignature, key: grid.key });
  }

  return (
    <header className="flex h-14 items-center gap-2 px-4 border-b border-border bg-card shrink-0">
      <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
        <Link to="/my" aria-label="Назад к моим сеткам">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenDsl}>
          <Code2 className="size-3.5" />
          DSL
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenGenerator}>
          <Wand2 className="size-3.5" />
          Генератор
        </Button>

        {isDirty && (
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
