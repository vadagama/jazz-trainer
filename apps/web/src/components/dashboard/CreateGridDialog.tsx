import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { CreateGridSchema, type CreateGridInput } from '@jazz/shared';
import { useCreateGrid } from '@/queries/useMyGrids';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateGridDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const createGrid = useCreateGrid();

  const form = useForm<CreateGridInput>({
    resolver: zodResolver(CreateGridSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(data: CreateGridInput) {
    const grid = await createGrid.mutateAsync(data);
    setOpen(false);
    form.reset();
    navigate(`/grids/${grid.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Новая сетка
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать сетку</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="grid-name">Название</Label>
            <Input id="grid-name" placeholder="ii-V-I in C major" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button">Отмена</Button>
            </DialogClose>
            <Button type="submit" disabled={createGrid.isPending}>
              {createGrid.isPending ? 'Создаём...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
