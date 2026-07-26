import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendMagicLink } from './email.service.js';
import type { ApiConfig } from '../config.js';

function makeConfig(
  overrides: Partial<{ resendApiKey: string; emailFrom: string }> = {},
): ApiConfig {
  return {
    port: 3999,
    webOrigin: 'http://localhost:5173',
    authDevMode: false,
    databaseUrl: ':memory:',
    sessionSecret: 'test',
    sessionTtlMs: 86_400_000,
    sessionMaxAbsoluteTtlMs: 604_800_000,
    googleClientId: null,
    googleClientSecret: null,
    googleCallbackUrl: '',
    githubClientId: null,
    githubClientSecret: null,
    githubCallbackUrl: '',
    googleHd: null,
    resendApiKey: overrides.resendApiKey ?? null,
    emailFrom: overrides.emailFrom ?? 'noreply@jazztrainer.app',
    totpIssuer: 'Jazz Trainer',
    superAdminSessionMaxAbsoluteTtlMs: 900_000,
    adminIpAllowlist: null,
  };
}

describe('email — sendMagicLink', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prints to console in dev mode (no API key)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sendMagicLink(makeConfig(), 'test@example.com', 'https://app.example.com/auth/magic?token=abc', 'Tester');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('[email] DEV MODE — Magic link for test@example.com'),
    );
    spy.mockRestore();
  });

  it('sends request to Resend when API key is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendMagicLink(
      makeConfig({ resendApiKey: 're_test_key' }),
      'user@example.com',
      'https://app.example.com/auth/magic?token=xyz',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const headers = init.headers as Record<string, string> | undefined;
    expect(headers).toMatchObject({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.to).toBe('user@example.com');
    expect(body.from).toBe('noreply@jazztrainer.app');
    expect(body.subject).toContain('Sign in to Jazz Trainer');
    expect(body.html).toContain('https://app.example.com/auth/magic?token=xyz');
    expect(body.html).toContain('sign in to your Jazz Trainer account');
  });

  it('includes user name in greeting when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await sendMagicLink(
      makeConfig({ resendApiKey: 're_test_key' }),
      'alice@example.com',
      'https://app.example.com/auth/magic?token=abc',
      'Alice',
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.html).toContain('Hi Alice,');
  });

  it('falls back to "Hello" greeting when name is undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await sendMagicLink(
      makeConfig({ resendApiKey: 're_test_key' }),
      'bob@example.com',
      'https://app.example.com/auth/magic?token=abc',
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.html).toContain('Hello,');
  });

  it('falls back to console on Resend 403 (free-tier / unverified domain)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendMagicLink(
      makeConfig({ resendApiKey: 're_test_key' }),
      'free@example.com',
      'https://app.example.com/auth/magic?token=zzz',
    );

    expect(warnSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[email] DEV MODE — Magic link for free@example.com'),
    );
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('throws on non-403 Resend errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sendMagicLink(
        makeConfig({ resendApiKey: 're_test_key' }),
        'fail@example.com',
        'https://app.example.com/auth/magic?token=zzz',
      ),
    ).rejects.toThrow('Resend API error (500)');
  });

  it('subject mentions 15-minute expiry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await sendMagicLink(
      makeConfig({ resendApiKey: 're_test_key' }),
      'a@b.com',
      'https://x.com',
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.subject).toContain('15 min');
  });
});
