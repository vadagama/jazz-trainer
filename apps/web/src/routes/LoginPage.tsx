import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Music4 } from 'lucide-react';
import { DevLoginSchema, type DevLoginInput } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

const IS_DEV = import.meta.env.DEV;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/';

  const [devError, setDevError] = useState<string | null>(null);

  const form = useForm<DevLoginInput>({
    resolver: zodResolver(DevLoginSchema),
    defaultValues: { email: '', name: undefined },
  });

  async function onDevLogin(data: DevLoginInput) {
    setDevError(null);
    try {
      const res = await apiClient.post<{ user: unknown }>('/api/auth/dev-login', data);
      queryClient.setQueryData(['auth', 'me'], res);
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      setDevError(err instanceof Error ? err.message : 'Ошибка входа');
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Music4 className="size-9 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Вход в Jazz Trainer</h1>
          <p className="text-sm text-muted-foreground">
            Войдите, чтобы сохранять сетки, настройки и лайки
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => { window.location.href = '/api/auth/google'; }}
        >
          Войти через Google
        </Button>

        {IS_DEV && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Dev-режим</span>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onDevLogin)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="dev@example.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="name">Имя (опционально)</Label>
                <Input id="name" placeholder="Dev User" {...form.register('name')} />
              </div>

              {devError && <p className="text-sm text-destructive">{devError}</p>}

              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Входим...' : 'Dev-вход'}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground underline underline-offset-4">
            ← Вернуться в каталог
          </Link>
        </p>
      </div>
    </div>
  );
}
