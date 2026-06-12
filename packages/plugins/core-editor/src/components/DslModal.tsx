import { useState } from 'react';
import { parseGrid, serializeGrid } from '@jazz/music-core';
import type { GridContent } from '@jazz/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Textarea,
} from '@jazz/ui';

interface DslModalProps {
  open: boolean;
  content: GridContent;
  onImport: (content: GridContent) => void;
  onClose: () => void;
}

export function DslModal({ open, content, onImport, onClose }: DslModalProps) {
  const exportedDsl = serializeGrid(content);
  const [dsl, setDsl] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<'import' | 'export'>('export');

  function handleOpen() {
    if (tab === 'export') setDsl(exportedDsl);
    else setDsl('');
    setErrors([]);
  }

  function handleTabChange(next: 'import' | 'export') {
    setTab(next);
    setErrors([]);
    if (next === 'export') setDsl(exportedDsl);
    else setDsl('');
  }

  function handleImport() {
    if (!dsl.trim()) {
      setErrors(['DSL не может быть пустым']);
      return;
    }
    const result = parseGrid(dsl);
    if (!result.ok || !result.value) {
      setErrors(result.errors.map((e) => `позиция ${e.position}: ${e.message}`));
      return;
    }
    setErrors([]);
    onImport(result.value);
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(exportedDsl).catch(() => {});
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
        else handleOpen();
      }}
    >
      <DialogContent className="max-w-lg" data-testid="dsl-modal">
        <DialogHeader>
          <DialogTitle>DSL — импорт / экспорт</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border pb-2">
          <Button
            variant={tab === 'export' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('export')}
            data-testid="dsl-tab-export"
          >
            Экспорт
          </Button>
          <Button
            variant={tab === 'import' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('import')}
            data-testid="dsl-tab-import"
          >
            Импорт
          </Button>
        </div>

        {tab === 'export' ? (
          <div className="space-y-2">
            <Textarea
              readOnly
              value={exportedDsl}
              className="font-mono text-sm min-h-[120px] resize-none"
              data-testid="dsl-export-text"
            />
            <Button variant="outline" size="sm" onClick={handleCopy}>
              Скопировать
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={dsl}
              onChange={(e) => {
                setDsl(e.target.value);
                setErrors([]);
              }}
              placeholder="Cmaj7 | Dm7 G7 | Cmaj7 ||"
              className="font-mono text-sm min-h-[120px] resize-none"
              data-testid="dsl-import-text"
            />
            {errors.length > 0 && (
              <ul className="space-y-0.5" data-testid="dsl-errors">
                {errors.map((e, i) => (
                  <li key={`${e}-${i}`} className="text-xs text-destructive">
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
          {tab === 'import' && (
            <Button onClick={handleImport} data-testid="dsl-import-btn">
              Применить
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
