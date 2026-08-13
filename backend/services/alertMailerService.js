/**
 * alertMailerService.js — minimal SMTP email for production alerts.
 *
 * The nightly health workflow files GitHub issues for stuck/low-engagement
 * releases; this service is the optional EMAIL side of the same alert, so the
 * owner gets a notification even when not watching GitHub. Wired to the
 * SMTP_* env vars already present on Render (SMTP_HOST/SMTP_PORT/SMTP_USER/
 * SMTP_PASS) plus SMTP_FROM and ALERT_EMAIL_TO.
 *
 * Fully graceful: if SMTP is not configured (or a send fails), sendAlertEmail
 * returns { sent: false, reason } and NEVER throws — the GitHub issue remains
 * the source of truth and email is best-effort on top.
 */
const nodemailer = require('nodemailer');

let transporter = null;
let lastError = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' }
        : undefined
    });
    lastError = null;
  } catch (error) {
    lastError = error.message;
    transporter = null;
  }
  return transporter;
}

/**
 * Send an alert email. Never throws.
 * @param {{subject: string, text: string, html?: string}} opts
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendAlertEmail({ subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'alerts@genz-whatsapp.com';
  const to = process.env.ALERT_EMAIL_TO || process.env.SMTP_USER;
  const mailer = getTransporter();
  if (!mailer) return { sent: false, reason: lastError ? `smtp-error: ${lastError}` : 'smtp-not-configured' };
  if (!to) return { sent: false, reason: 'no-recipient (ALERT_EMAIL_TO / SMTP_USER unset)' };
  try {
    await mailer.sendMail({ from, to, subject, text, html: html || text });
    return { sent: true };
  } catch (error) {
    lastError = error.message;
    return { sent: false, reason: `send-failed: ${error.message}` };
  }
}

module.exports = { sendAlertEmail };
