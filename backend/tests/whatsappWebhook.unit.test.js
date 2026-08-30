// Mock the heavy server module that pulls in whatsapp-web.js / puppeteer (ESM)
// We only need the Express `app` object to test the webhook routes.

// Ensure all secrets are present so config/secrets.js doesn't throw
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-for-unit-tests';
process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'test-admin-jwt-secret-for-unit-tests';
process.env.MESSAGE_ENCRYPTION_SECRET = process.env.MESSAGE_ENCRYPTION_SECRET || 'test-encryption-key-for-unit-tests';
process.env.BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'test-backup-key-for-unit-tests';

// Pre-mock whatsapp-web.js BEFORE any module that depends on it is loaded.
// The mock must be registered before the require chain reaches whatsappOtpService.
jest.mock('whatsapp-web.js', () => {
  const noop = jest.fn();
  return {
    Client: jest.fn().mockImplementation(() => ({
      on: noop,
      initialize: noop,
      destroy: noop,
      sendMessage: noop,
    })),
    LocalAuth: jest.fn(),
  };
});

const request = require('supertest');
const { app } = require('../server');

describe('WhatsApp Cloud API webhook', () => {
  const original = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  afterAll(() => {
    if (original === undefined) delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    else process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = original;
  });

  describe('GET /webhook/whatsapp (Meta verification handshake)', () => {
    it('echoes hub.challenge as plain text when the verify token matches', async () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'secret-token';
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'secret-token',
          'hub.challenge': '1158201444'
        });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
      expect(res.text).toBe('1158201444');
    });

    it('rejects a mismatched verify token', async () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'secret-token';
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': '1158201444'
        });
      expect(res.statusCode).toBe(403);
    });

    it('rejects without the subscribe mode', async () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'secret-token';
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.verify_token': 'secret-token',
          'hub.challenge': '1158201444'
        });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /webhook/whatsapp (incoming events)', () => {
    it('accepts a valid JSON body and returns 200', async () => {
      const res = await request(app)
        .post('/webhook/whatsapp')
        .send({
          object: 'whatsapp_business_account',
          entry: [{
            id: '123456',
            changes: [{
              value: { messaging_product: 'whatsapp' },
              field: 'messages'
            }]
          }]
        });
      expect(res.statusCode).toBe(200);
    });

    it('accepts an empty body without crashing', async () => {
      const res = await request(app)
        .post('/webhook/whatsapp')
        .send({});
      expect(res.statusCode).toBe(200);
    });
  });
});
