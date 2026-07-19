import { useState } from 'react';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { CATALOG_TAG_CATEGORIES } from '@jazz/shared';
import type { CatalogTagCategory } from '@jazz/shared';
import { Button, Input, Label } from '@jazz/ui';
import {
  useAdminTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
} from './queries/useCatalogAdmin';

const CATEGORY_LABEL: Record<CatalogTagCategory, string> = {
  genre: 'Жанр / Форма',
  harmony: 'Гармония',
  ensemble: 'Ансамбль',
  method: 'Методика',
};

export function CatalogTagsPage() {
  const { data: tags, isLoading } = useAdminTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [showForm, setShowForm] = useState(false);
  const [newTag, setNewTag] = useState({
    value: '',
    category: 'genre' as CatalogTagCategory,
    description: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.value.trim()) return;
    createTag.mutate(
      {
        value: newTag.value.trim(),
        category: newTag.category,
        description: newTag.description || undefined,
      },
      {
        onSuccess: () => {
          setNewTag({ value: '', category: 'genre', description: '' });
          setShowForm(false);
        },
        onError: () => alert('Тег с таким значением уже существует'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Управление тегами</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Закрытый словарь тегов каталога. CRUD, скрытие, счётчик использований.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm((s) => !s)}>
          <Plus className="size-4" /> Добавить тег
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-lg border border-border bg-card p-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tag-value">Значение</Label>
              <Input
                id="tag-value"
                placeholder="modal-jazz"
                value={newTag.value}
                onChange={(e) => setNewTag((t) => ({ ...t, value: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tag-cat">Категория</Label>
              <select
                id="tag-cat"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={newTag.category}
                onChange={(e) =>
                  setNewTag((t) => ({ ...t, category: e.target.value as CatalogTagCategory }))
                }
              >
                {CATALOG_TAG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tag-desc">Описание</Label>
            <Input
              id="tag-desc"
              placeholder="(опционально)"
              value={newTag.description}
              onChange={(e) => setNewTag((t) => ({ ...t, description: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createTag.isPending}>
              Создать
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-3">Тег</th>
              <th className="p-3">Категория</th>
              <th className="p-3">Описание</th>
              <th className="p-3 text-center">Использований</th>
              <th className="p-3 text-center">Видимость</th>
              <th className="p-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {tags?.map((tag) => (
              <tr key={tag.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-3">
                  <span className="font-mono text-xs">{tag.value}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {CATEGORY_LABEL[tag.category]}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {tag.description ?? '—'}
                </td>
                <td className="p-3 text-center font-medium">{tag.usageCount}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() =>
                      updateTag.mutate({ id: tag.id, hidden: !tag.hidden })
                    }
                    className={`rounded p-1.5 ${
                      tag.hidden
                        ? 'text-muted-foreground hover:bg-accent'
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                    title={tag.hidden ? 'Показать' : 'Скрыть'}
                  >
                    {tag.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm(`Удалить тег «${tag.value}»?`)) {
                          deleteTag.mutate(tag.id);
                        }
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                      title="Удалить"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CatalogTagsPage;
