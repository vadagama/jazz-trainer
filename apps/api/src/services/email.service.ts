import type { ApiConfig } from '../config.js';

/**
 * Email service for Magic Link and transactional notifications.
 *
 * Uses Resend as the email provider. In development mode (no RESEND_API_KEY),
 * the magic link URL is printed to the console instead.
 */

const MAGIC_LINK_TTL_MIN = 15;

/**
 * Build the HTML email template for the magic link email.
 */
function magicLinkHtml(link: string, name?: string): string {
  const greeting = name ? `Hi ${name},` : 'Hello,';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Amazilia</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a2e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;padding:40px 0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#16213e;border-radius:12px;overflow:hidden;max-width:480px">
          <tr>
            <td style="padding:40px 40px 24px;text-align:center">
              <h1 style="color:#e94560;font-size:24px;margin:0 0 8px">🎵 Amazilia</h1>
              <p style="color:#a0a0b8;font-size:14px;margin:0">Let your music take flight</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px">
              <p style="color:#eaeaea;font-size:16px;line-height:1.6;margin:0 0 24px">
                ${greeting}<br><br>
                Click the button below to sign in to your Amazilia account.
                This link expires in ${MAGIC_LINK_TTL_MIN} minutes and can only be used once.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${link}" style="display:inline-block;background-color:#e94560;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:8px;line-height:1.5">
                      Sign in to Amazilia
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#6c6c80;font-size:13px;line-height:1.5;margin:24px 0 0">
                If you didn't request this email, you can safely ignore it.<br>
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color:#6c6c80;font-size:12px;line-height:1.5;margin:8px 0 0;word-break:break-all">
                ${link}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a4a;text-align:center">
              <p style="color:#6c6c80;font-size:12px;margin:0">
                Amazilia — Practice harmony with real feel
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a magic link email to the user.
 *
 * In development (no RESEND_API_KEY) the link is printed to the console.
 */
export async function sendMagicLink(
  config: ApiConfig,
  email: string,
  magicLinkUrl: string,
  name?: string,
): Promise<void> {
  const html = magicLinkHtml(magicLinkUrl, name);

  if (!config.resendApiKey) {
    console.log(`\n[email] DEV MODE — Magic link for ${email}:\n  ${magicLinkUrl}\n`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: email,
      subject: `Sign in to Amazilia — link expires in ${MAGIC_LINK_TTL_MIN} min`,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`Resend API error (${response.status}): ${body}`);

    // Resend free tier / unverified domain: fall back to console link.
    if (response.status === 403) {
      console.warn(`[email] Resend: ${body}`);
      console.log(`[email] DEV MODE — Magic link for ${email}:\n  ${magicLinkUrl}\n`);
      return;
    }

    throw err;
  }

  console.log(`[email] Magic link sent to ${email}`);
}
