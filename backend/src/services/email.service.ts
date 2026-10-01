import nodemailer, { type Transporter } from 'nodemailer';
import { env, features } from '../config/env';
import { logger } from '../config/logger';

/**
 * Mail delivery with a deliberate no-credentials fallback.
 *
 * With SMTP configured we send for real. Without it we log the message —
 * including the full action URL — at info level, so the verification and reset
 * flows remain completable on a clean checkout with an empty `.env`. The API
 * layer additionally returns the URL in non-production responses (see
 * `exposeDevTokens`), which is what makes the e2e tests hermetic.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!features.email) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function deliver(message: MailMessage): Promise<void> {
  const tx = getTransporter();

  if (!tx) {
    logger.info(
      { to: message.to, subject: message.subject, body: message.text },
      'Email not configured — message logged instead of sent',
    );
    return;
  }

  try {
    await tx.sendMail({ from: env.MAIL_FROM, ...message });
    logger.info({ to: message.to, subject: message.subject }, 'Email sent');
  } catch (error) {
    // A failed welcome email must not fail the registration that triggered it.
    // The user can always request a new link.
    logger.error({ err: error, to: message.to }, 'Email delivery failed');
  }
}

function layout(heading: string, body: string, cta?: { label: string; url: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#0B0B0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#EDEDF0;">
    <div style="max-width:520px;margin:0 auto;background:#141419;border-radius:14px;padding:32px;">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#F0B429;margin-bottom:24px;">Kinora</div>
      <h1 style="font-size:22px;margin:0 0 16px;letter-spacing:-0.02em;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#B4B4C0;">${body}</div>
      ${
        cta
          ? `<a href="${cta.url}" style="display:inline-block;margin-top:24px;background:#F0B429;color:#0B0B0F;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;">${cta.label}</a>
             <p style="font-size:12px;color:#71717F;margin-top:24px;word-break:break-all;">Or paste this link into your browser:<br>${cta.url}</p>`
          : ''
      }
    </div>
  </body>
</html>`;
}

export async function sendVerificationEmail(to: string, name: string, url: string): Promise<void> {
  await deliver({
    to,
    subject: 'Verify your Kinora email address',
    text: `Hi ${name}, confirm your email address to finish setting up Kinora: ${url} (expires in 24 hours)`,
    html: layout(
      `Welcome, ${escapeHtml(name)}`,
      'Confirm your email address to finish setting up your account. This link expires in 24 hours.',
      { label: 'Verify email', url },
    ),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, url: string): Promise<void> {
  await deliver({
    to,
    subject: 'Reset your Kinora password',
    text: `Hi ${name}, reset your password here: ${url} (expires in 1 hour). If you did not request this, ignore this email.`,
    html: layout(
      'Reset your password',
      `Hi ${escapeHtml(name)}, use the button below to choose a new password. This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.`,
      { label: 'Reset password', url },
    ),
  });
}

export async function sendPasswordChangedEmail(to: string, name: string): Promise<void> {
  await deliver({
    to,
    subject: 'Your Kinora password was changed',
    text: `Hi ${name}, your password was just changed and all other sessions were signed out. If this wasn't you, reset your password immediately.`,
    html: layout(
      'Your password was changed',
      `Hi ${escapeHtml(name)}, your password was just changed and every other signed-in device was signed out. If this wasn't you, reset your password immediately.`,
    ),
  });
}

/** Names go into HTML email bodies; escape before interpolation. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
