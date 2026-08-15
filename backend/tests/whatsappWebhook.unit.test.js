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
          'hub.challenge': '123'
        });
      expect(res.statusCode).toBe(403);
    });

    it('rejects when no verify token is configured', async () => {
      delete process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'anything',
          'hub.challenge': '123'
        });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /webhook/whatsapp (event delivery)', () => {
    it('acknowledges an event payload with 200', async () => {
      const res = await request(app)
        .post('/webhook/whatsapp')
        .send({
          object: 'whatsapp_business_account',
          entry: [
            {
              id: '1234567890',
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    statuses: [{ id: 'wamid.1', status: 'delivered' }]
                  }
                }
              ]
            }
          ]
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
