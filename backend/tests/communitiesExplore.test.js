const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Community = require('../models/Community');
const Status = require('../models/Status');

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

describe('Communities API', () => {
  let user;

  beforeEach(async () => {
    user = await registerUser('communityuser', '255700000401');
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/communities');
    expect(res.statusCode).toBe(401);
  });

  it('should return an empty list initially', async () => {
    const res = await request(app)
      .get('/api/communities')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.communities)).toBe(true);
  });

  it('should create a community', async () => {
    const res = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Tech Hub', description: 'Testing community', public: true });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.community.name).toBe('Tech Hub');
    expect(res.body.community.joined).toBe(true);
    expect(res.body.community.members).toBe(1);
  });

  it('should reject creating a community without a name', async () => {
    const res = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ description: 'No name' });
    expect(res.statusCode).toBe(400);
  });

  it('should join and leave a community', async () => {
    const created = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Test Community' });
    const id = created.body.community.id;

    const joiner = await registerUser('communityjoiner', '255700000402');

    const joined = await request(app)
      .post(`/api/communities/${id}/join`)
      .set('Authorization', `Bearer ${joiner.token}`);
    expect(joined.statusCode).toBe(200);
    expect(joined.body.community.joined).toBe(true);
    expect(joined.body.community.members).toBe(2);

    const left = await request(app)
      .post(`/api/communities/${id}/leave`)
      .set('Authorization', `Bearer ${joiner.token}`);
    expect(left.statusCode).toBe(200);
    expect(left.body.community.joined).toBe(false);
    expect(left.body.community.members).toBe(1);
  });

  it('should only let the creator delete a community', async () => {
    const created = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Delete Me' });
    const id = created.body.community.id;

    const outsider = await registerUser('communityoutsider', '255700000403');
    const denied = await request(app)
      .delete(`/api/communities/${id}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(denied.statusCode).toBe(403);

    const ok = await request(app)
      .delete(`/api/communities/${id}`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(ok.statusCode).toBe(200);

    const dbCommunity = await Community.findById(id);
    expect(dbCommunity).toBeNull();
  });
});

describe('Explore API', () => {
  let user;

  beforeEach(async () => {
    user = await registerUser('exploreuser', '255700000501');
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/explore');
    expect(res.statusCode).toBe(401);
  });

  it('should return empty collections when no statuses exist', async () => {
    const res = await request(app)
      .get('/api/explore')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.trending)).toBe(true);
    expect(Array.isArray(res.body.forYou)).toBe(true);
    expect(Array.isArray(res.body.creators)).toBe(true);
    expect(Array.isArray(res.body.nearby)).toBe(true);
  });

  it('should include public statuses in trending', async () => {
    await Status.create({
      user: user.user._id,
      userId: String(user.user._id),
      username: 'exploreuser',
      type: 'text',
      content: 'Hello world',
      privacy: 'everyone',
      viewsCount: 42,
      likesCount: 7
    });

    const res = await request(app)
      .get('/api/explore')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.trending.length).toBeGreaterThanOrEqual(1);
    expect(res.body.trending[0].views).toBe(42);
    expect(res.body.trending[0].likes).toBe(7);
  });

  it('should search content by caption', async () => {
    await Status.create({
      user: user.user._id,
      userId: String(user.user._id),
      username: 'exploreuser',
      type: 'text',
      content: 'Weekend vibes',
      caption: 'Weekend vibes',
      privacy: 'everyone'
    });

    const res = await request(app)
      .get('/api/explore/search?q=weekend')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.content.length).toBeGreaterThanOrEqual(1);
  });

  it('should require a query for search', async () => {
    const res = await request(app)
      .get('/api/explore/search')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.statusCode).toBe(400);
  });
});
