/**
 * LiveSoko Email Service (v2.5.0)
 * Powered by Resend. Falls back to console.log in development if no API key is set.
 *
 * Required env vars:
 *   RESEND_API_KEY   — Your Resend API key (https://resend.com)
 *   APP_URL          — Base URL of the app (e.g. https://yourapp.railway.app)
 *   FROM_EMAIL       — Sender address (e.g. noreply@livesoko.app)
 */
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'LiveSoko <noreply@livesoko.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Internal send function. Logs to console if Resend is not configured (dev mode).
 */
async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`[EMAIL] Dev mode — would send to ${to}: ${subject}`);
    return { success: true, dev: true };
  }

  try {
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) {
      console.error('[EMAIL] Resend error:', error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error('[EMAIL] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send an email verification link to a new user.
 */
async function sendVerificationEmail(to, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  return send({
    to,
    subject: 'Verify your LiveSoko account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #e2e8f0; background: #0f1117; padding: 32px; border-radius: 12px;">
        <h1 style="color: #a3e635; font-size: 28px; margin-bottom: 8px;">LiveSoko</h1>
        <p style="font-size: 16px; margin-bottom: 24px;">Thanks for signing up! Click the button below to verify your email address and activate your account.</p>
        <a href="${link}" style="display: inline-block; background: #a3e635; color: #0f1117; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px;">Verify Email</a>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">This link expires in 24 hours. If you did not create a LiveSoko account, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #64748b;">Or copy this URL: <br/><span style="word-break: break-all;">${link}</span></p>
      </div>
    `
  });
}

/**
 * Send a password reset link.
 */
async function sendPasswordResetEmail(to, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return send({
    to,
    subject: 'Reset your LiveSoko password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #e2e8f0; background: #0f1117; padding: 32px; border-radius: 12px;">
        <h1 style="color: #a3e635; font-size: 28px; margin-bottom: 8px;">LiveSoko</h1>
        <p style="font-size: 16px; margin-bottom: 8px;">We received a request to reset your password.</p>
        <p style="font-size: 14px; margin-bottom: 24px; color: #94a3b8;">This link expires in <strong style="color: #e2e8f0;">1 hour</strong>. If you did not request a password reset, you can ignore this email.</p>
        <a href="${link}" style="display: inline-block; background: #a3e635; color: #0f1117; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px;">Reset Password</a>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Or copy this URL: <br/><span style="word-break: break-all;">${link}</span></p>
      </div>
    `
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
