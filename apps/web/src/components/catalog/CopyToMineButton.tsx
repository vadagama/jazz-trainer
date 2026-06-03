import { Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/queries/useAuth';
import { useCopyToMine } from '@/queries/useCopyToMine';
import { Button } from '@/components/ui/button';

interface Props {
  gridId: string;
  gridName: string;
}

export function CopyToMineButton({ gridId, gridName }: Props) {
  const { user } = useAuth();
  const copy = useCopyToMine();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleCopy() {
    const result = await copy.mutateAsync({ gridId, name: `${gridName} (копия)` });
    navigate(`/grids/${result.id}`);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={copy.isPending}
      onClick={handleCopy}
    >
      <Copy className="size-4" />
      Копировать
    </Button>
  );
}
