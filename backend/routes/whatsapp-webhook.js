/**
 * whatsapp-webhook.js — Meta WhatsApp Business Cloud API webhook endpoint.
 *
 * Meta's "Configure Webhooks" step in the app dashboard verifies ownership of
 * the callback URL by sending a GET to it with:
 *   ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
 *
 * This endpoint echoes hub.challenge back as plain text ONLY when the token
 * matches WHATSAPP_WEBHOOK_VERIFY_TOKEN. If the echo fails (or is not plain
 * text), Meta refuses to save the subscription.
 *
 * After verification, Meta POSTs event payloads (incoming messages, delivery
 * statuses) to the same URL. We always answer 200 quickly so Meta does not
 * retry forever; payload summaries are logged for debugging.
 *
 * Callback URL to paste into the Meta dashboard:
 *   https://<your-app>.onrender.com/webhook/whatsapp
 */
const express = require('express');
const router = express.Router();
const { webhookRateLimiter } = require('../middleware/rateLimiter');

// Read at request time so tests / runtime env changes are honoured.
const getVerifyToken = () => process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

// GET /webhook/whatsapp — Meta webhook verification handshake
router.get('/', webhookRateLimiter, (req, res) => {
  // Note: the app-wide mongoSanitize middleware rewrites dotted query keys
  // (hub.mode -> hub_mode), so accept both spellings.
  const mode = req.query['hub.mode'] ?? req.query.hub_mode;
  const token = req.query['hub.verify_token'] ?? req.query.hub_verify_token;
  const challenge = req.query['hub.challenge'] ?? req.query.hub_challenge;
  const verifyToken = getVerifyToken();

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    // Meta requires the challenge echoed verbatim as plain text.
    res.type('text/plain').send(challenge);
    return;
  }

  console.warn('[WhatsAppWebhook] verification failed', {
    mode: mode || 'missing',
    tokenMatches: Boolean(token && verifyToken && token === verifyToken)
  });
  res.status(403).send('Verification failed. Check WHATSAPP_WEBHOOK_VERIFY_TOKEN.');
});

// POST /webhook/whatsapp — incoming events (messages, status updates)
router.post('/', webhookRateLimiter, (req, res) => {
  // Acknowledge first; Meta retries non-200 responses.
  res.status(200).json({ success: true });

  const entry = req.body && req.body.entry;
  const changes = Array.isArray(entry) ? entry.flatMap((e) => (Array.isArray(e.changes) ? e.changes : [])) : [];
  const values = changes.map((c) => c.value || {}).filter((v) => v && typeof v === 'object');
  const messages = values
    .flatMap((v) => (Array.isArray(v.messages) ? v.messages : []))
    .map((m) => ({ from: m.from, type: m.type, id: m.id }));
  const statuses = values
    .flatMap((v) => (Array.isArray(v.statuses) ? v.statuses : []))
    .map((s) => ({ id: s.id, status: s.status }));

  if (messages.length || statuses.length) {
    console.log('[WhatsAppWebhook] event received', { messages, statuses });
  }
});

module.exports = router;
