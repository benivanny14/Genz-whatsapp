const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');

jest.setTimeout(30000);

const registerUser = async (username, phone) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      username,
      phoneNumber: phone,
      password: 'Password123!'
    });
  expect(res.statusCode).toBe(201);
  return { token: res.body.token, user: res.body.user };
};

describe('POST /api/ai/chat (P3 OpenAI-compatible stub)', () => {
  let user;

  beforeEach(async () => {
    user = await registerUser('aiuser', '255700000201');
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ messages: [{ role: 'user', content: 'Hi' }] });
    expect(res.statusCode).toBe(401);
  });

  it('returns a dev-mode mock reply when no AI credentials are configured', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ messages: [{ role: 'user', content: 'Hello there' }] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mock).toBe(true);
    expect(res.body.provider).toBe('dev-mode');
    expect(res.body.content).toContain('Hello there');
  });

  it('validates missing messages array', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${user.token}`)
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('messages');
  });

  it('validates message content type', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ messages: [{ role: 'user', content: 42 }] });
    expect(res.statusCode).toBe(400);
  });
});
