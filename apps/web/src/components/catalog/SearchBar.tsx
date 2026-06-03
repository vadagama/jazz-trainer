import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Props {
  value: string;
  onChange: (v: string) => void;
  sort: string;
  onSortChange: (v: 'updated' | 'likes' | 'name') => void;
}

export function SearchBar({ value, onChange, sort, onSortChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию или тональности..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as 'updated' | 'likes' | 'name')}
        className="h-9 rounded-md border border-border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="updated">По дате</option>
        <option value="likes">По лайкам</option>
        <option value="name">По названию</option>
      </select>
    </div>
  );
}
