import { Search } from 'lucide-react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@jazz/ui';
import type { CatalogSort } from '@jazz/shared';

interface Props {
  value: string;
  onChange: (v: string) => void;
  sort: CatalogSort;
  onSortChange: (v: CatalogSort) => void;
}

export function SearchBar({ value, onChange, sort, onSortChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск: название, автор, описание, теги..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={sort} onValueChange={(v) => onSortChange(v as CatalogSort)}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="popular">По популярности</SelectItem>
          <SelectItem value="newest">Сначала новые</SelectItem>
          <SelectItem value="updated">Недавно обновлены</SelectItem>
          <SelectItem value="name_asc">По алфавиту</SelectItem>
          <SelectItem value="copies">По копированиям</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
