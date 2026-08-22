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
const crypto = require('crypto');
const { webhookRateLimiter } = require('../middleware/rateLimiter');

// Read at request time so tests / runtime env changes are honoured.
const getVerifyToken = () => process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
const getAppSecret = () => process.env.WHATSAPP_APP_SECRET || '';

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
    // no-transform: keep the body uncompressed (compression middleware
    // honours this header) — Meta's validator reads the raw challenge.
    res.setHeader('Cache-Control', 'no-store, no-transform');
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
// We need the raw body to verify the X-Hub-Signature-256 HMAC.  The app-wide
// express.json() middleware has already parsed the body into req.body by the
// time this handler runs, but req.body remains as the Buffer if express.raw()
// is also registered.  To avoid changing global middleware, we re-read the
// signature against the JSON-stringified body — which is what Meta signs.
router.post('/', webhookRateLimiter, (req, res) => {
  // ── HMAC-SHA256 signature verification ────────────────────────────────
  const appSecret = getAppSecret();
  if (appSecret) {
    const signatureHeader = req.headers['x-hub-signature-256'];
    if (!signatureHeader) {
      console.warn('[WhatsAppWebhook] Missing X-Hub-Signature-256 header');
      return res.status(403).json({ success: false, message: 'Missing signature' });
    }
    try {
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        .digest('hex');
      // Use timingSafeEqual to prevent timing attacks
      const sigBuf = Buffer.from(signatureHeader);
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        console.warn('[WhatsAppWebhook] Invalid signature');
        return res.status(403).json({ success: false, message: 'Invalid signature' });
      }
    } catch (err) {
      console.error('[WhatsAppWebhook] Signature verification error:', err.message);
      return res.status(403).json({ success: false, message: 'Signature verification failed' });
    }
  }
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
