import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Music4 } from 'lucide-react';
import { SendMagicLinkSchema, type AuthMethodsDTO } from '@jazz/shared';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/queries/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const OAUTH_ERROR_MAP: Record<string, string> = {
  oauth_denied: 'Registration was cancelled.',
  oauth_failed: 'Registration failed. Please try again.',
  invalid_state: 'Security check failed. Please try again.',
  invalid_nonce: 'Security check failed. Please try again.',
  no_email: 'No email provided by the provider. Try another method.',
  missing_token: 'Invalid link. Please request a new one.',
  invalid_token: 'Invalid or expired link. Please request a new one.',
  expired_token: 'This link has expired. Please request a new one.',
};

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? '/';
  const oauthError = searchParams.get('error');
  const { user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [authMethods, setAuthMethods] = useState<AuthMethodsDTO | null>(null);

  useEffect(() => {
    apiClient.get<AuthMethodsDTO>('/api/auth/methods').then(setAuthMethods).catch(() => {});
  }, []);

  if (!authLoading && user) {
    navigate(returnTo, { replace: true });
    return null;
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setMagicLinkError(null);
    if (!SendMagicLinkSchema.safeParse({ email }).success) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setIsSending(true);
    try {
      await apiClient.post('/api/auth/magic-link/send', { email });
      setMagicLinkSent(true);
    } catch {
      setMagicLinkError('Failed to send link. Please try again.');
    } finally {
      setIsSending(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Music4 className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Start your improvisation journey with Amazilia
              </p>
            </div>
          </div>

          {oauthError && (
            <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {OAUTH_ERROR_MAP[oauthError] ?? 'Registration error. Please try again.'}
            </div>
          )}

          {(authMethods?.google || authMethods?.github) && (
            <>
              <div className="space-y-3">
                {authMethods.google && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/google'; }}
                    className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                )}

                {authMethods.github && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/github'; }}
                    className="flex w-full items-center justify-center gap-3 rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    <GitHubIcon />
                    Continue with GitHub
                  </button>
                )}
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          {!magicLinkSent ? (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-widest text-muted-foreground">Email</label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(null); }} className="h-10" />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              {magicLinkError && <p className="text-sm text-destructive">{magicLinkError}</p>}
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending ? 'Sending…' : 'Create account'}
              </Button>
            </form>
          ) : (
            <div className="rounded-md bg-primary/10 px-4 py-3 text-center text-sm">
              <p className="font-medium text-foreground">Check your email</p>
              <p className="mt-1 text-muted-foreground">
                We sent a sign-in link to <strong>{email}</strong>
              </p>
              <button type="button" onClick={() => { setMagicLinkSent(false); setMagicLinkError(null); }} className="mt-2 text-xs text-primary underline-offset-4 hover:underline">
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
