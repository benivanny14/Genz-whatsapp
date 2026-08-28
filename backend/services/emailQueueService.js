/**
 * Email Queue Service — background email delivery via Bull + Redis.
 *
 * Offloads all email sends to a Redis-backed queue so the API never blocks
 * on SMTP latency. Failed jobs retry with exponential backoff (3 attempts).
 *
 * Env:
 *   REDIS_URL  — Redis connection string (required)
 *   EMAIL_FROM — sender address (required)
 *
 * Usage:
 *   const { sendEmail } = require('./services/emailQueueService');
 *   await sendEmail('user@example.com', 'Subject', '<h1>HTML body</h1>');
 *
 * Dependencies: bull, nodemailer (already in package.json)
 */
const Queue = require('bull');
const nodemailer = require('nodemailer');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Create a reusable SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Bull queue with Redis backend
const emailQueue = new Queue('genz-emails', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,   // keep last 100 completed jobs for debugging
    removeOnFail: 200,       // keep last 200 failed jobs
  },
});

// ── Queue a single email ─────────────────────────────────────────────
const sendEmail = async (to, subject, html, options = {}) => {
  const job = await emailQueue.add(
    { to, subject, html, ...options },
    { priority: options.priority || 0 }
  );
  return { jobId: job.id };
};

// ── Bulk send (fans out to individual jobs for retry isolation) ──────
const sendBulkEmails = async (recipients, subject, html) => {
  const jobs = await Promise.all(
    recipients.map((to) => emailQueue.add({ to, subject, html }))
  );
  return { queued: jobs.length };
};

// ── Worker: process jobs ─────────────────────────────────────────────
emailQueue.process(async (job) => {
  const { to, subject, html, from } = job.data;

  await transporter.sendMail({
    from: from || process.env.EMAIL_FROM || 'no-reply@genzmessenger.com',
    to,
    subject,
    html,
  });

  console.log(`[EmailQueue] ✓ Sent to ${to} (job ${job.id})`);
});

// ── Event listeners for observability ─────────────────────────────────
emailQueue.on('failed', (job, err) => {
  console.error(`[EmailQueue] ✗ Job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);
});

emailQueue.on('completed', (job) => {
  console.log(`[EmailQueue] ✓ Job ${job.id} completed`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  await emailQueue.close();
});

module.exports = { sendEmail, sendBulkEmails, emailQueue };
