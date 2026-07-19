import { Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@jazz/plugin-sdk';
import { useCopyToMine } from '../queries/useCopyToMine';
import { Button } from '@jazz/ui';

interface Props {
  compositionId: string;
  compositionName: string;
}

export function CopyToMineButton({ compositionId, compositionName }: Props) {
  const { user } = useAuth();
  const copy = useCopyToMine();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleCopy() {
    const result = await copy.mutateAsync({
      compositionId,
      name: `${compositionName} (копия)`,
    });
    navigate(`/compositions/${result.id}`);
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
