import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { CreateCompositionSchema, type CreateCompositionInput } from '@jazz/shared';
import { useCreateComposition } from '@/queries/useMyCompositions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function CreateCompositionDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const createComposition = useCreateComposition();

  const form = useForm<CreateCompositionInput>({
    resolver: zodResolver(CreateCompositionSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(data: CreateCompositionInput) {
    const composition = await createComposition.mutateAsync(data);
    setOpen(false);
    form.reset();
    navigate(`/compositions/${composition.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Новая композиция
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать композицию</DialogTitle>
          <DialogDescription>
            Новая гармоническая композиция будет добавлена в вашу коллекцию.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="composition-name">Название</Label>
            <Input
              id="composition-name"
              placeholder="ii-V-I in C major"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createComposition.isPending}>
              {createComposition.isPending ? 'Создаём...' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
