import { Link } from 'react-router-dom';

interface Props {
  action?: string;
}

export function SignInPrompt({ action = 'выполнить это действие' }: Props) {
  return (
    <span className="text-sm text-muted-foreground">
      <Link to="/login" className="text-primary underline underline-offset-4 hover:opacity-80">
        Войдите
      </Link>
      , чтобы {action}
    </span>
  );
}
