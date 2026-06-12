import { Search } from 'lucide-react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@jazz/ui';

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
      <Select value={sort} onValueChange={(v) => onSortChange(v as 'updated' | 'likes' | 'name')}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated">По дате</SelectItem>
          <SelectItem value="likes">По лайкам</SelectItem>
          <SelectItem value="name">По названию</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
