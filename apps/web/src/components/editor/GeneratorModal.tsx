import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import type { GridContent, PatternInfo } from '@jazz/shared';
import { KEYS } from '@jazz/shared';
import { serializeGrid } from '@jazz/music-core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePatterns, useGenerateGrid } from '@/queries/useGrid';

interface GeneratorModalProps {
  open: boolean;
  onApply: (content: GridContent) => void;
  onClose: () => void;
}

export function GeneratorModal({ open, onApply, onClose }: GeneratorModalProps) {
  const { data: patterns = [], isLoading: patternsLoading } = usePatterns();
  const generateMutation = useGenerateGrid();

  const [patternId, setPatternId] = useState('');
  const [key, setKey] = useState<string>('C');
  const [lengthBars, setLengthBars] = useState<number | ''>('');
  const [preview, setPreview] = useState<GridContent | null>(null);

  const selected: PatternInfo | undefined = patterns.find((p) => p.id === patternId);

  async function handleGenerate() {
    if (!patternId) return;
    const input = {
      patternId,
      key: key as (typeof KEYS)[number],
      ...(lengthBars !== '' ? { lengthBars: lengthBars as number } : {}),
    };
    const result = await generateMutation.mutateAsync(input);
    setPreview(result);
  }

  function handleApply() {
    if (!preview) return;
    onApply(preview);
    setPreview(null);
    onClose();
  }

  function handleClose() {
    setPreview(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg" data-testid="generator-modal">
        <DialogHeader>
          <DialogTitle>Генератор прогрессии</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pattern-select" className="text-xs">
              Паттерн
            </Label>
            {patternsLoading ? (
              <p className="text-xs text-muted-foreground">Загрузка паттернов…</p>
            ) : (
              <Select value={patternId} onValueChange={setPatternId}>
                <SelectTrigger className="h-9" id="pattern-select" data-testid="pattern-select">
                  <SelectValue placeholder="Выберите паттерн…" />
                </SelectTrigger>
                <SelectContent>
                  {patterns.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selected && (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="key-select" className="text-xs">
                Тональность
              </Label>
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger className="h-9" id="key-select" data-testid="key-select-gen">
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
            </div>

            <div className="w-28 space-y-1.5">
              <Label htmlFor="length-input" className="text-xs">
                Тактов {selected?.variableLength ? '' : '(фикс.)'}
              </Label>
              <Input
                id="length-input"
                type="number"
                min={1}
                max={64}
                value={lengthBars}
                onChange={(e) => setLengthBars(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={selected ? String(selected.defaultBars) : '—'}
                disabled={selected != null && !selected.variableLength}
                className="h-9 text-sm"
                data-testid="length-input"
              />
            </div>
          </div>

          {generateMutation.isError && (
            <p className="text-xs text-destructive" data-testid="gen-error">
              Ошибка генерации. Попробуйте ещё раз.
            </p>
          )}

          {preview && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Предпросмотр:</p>
              <Textarea
                readOnly
                value={serializeGrid(preview)}
                className="font-mono text-xs min-h-[60px] resize-none"
                data-testid="gen-preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            variant="secondary"
            onClick={handleGenerate}
            disabled={!patternId || generateMutation.isPending}
            data-testid="gen-generate-btn"
          >
            {generateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Сгенерировать
          </Button>
          {preview && (
            <Button onClick={handleApply} data-testid="gen-apply-btn">
              Применить
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
