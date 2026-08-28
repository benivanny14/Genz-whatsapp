const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const mockUserId = new mongoose.Types.ObjectId('60d5ec49f1b2c8118858e999');

// Mock Auth Middleware
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { _id: '60d5ec49f1b2c8118858e999', username: 'testuser' };
    next();
  }
}));

// Mock Models
const mockStatus = {
  _id: new mongoose.Types.ObjectId(),
  userId: mockUserId,
  user: mockUserId,
  type: 'text',
  content: 'Unit test status #testing',
  replySettings: 'everyone',
  views: [],
  mentions: [],
  createdAt: new Date(),
  save: jest.fn().mockResolvedValue(true),
  toObject: function() { return this; }
};

jest.mock('../models/Status', () => {
  const mock = jest.fn();
  mock.findById = jest.fn();
  mock.find = jest.fn();
  mock.findOne = jest.fn();
  mock.create = jest.fn();
  mock.findByIdAndUpdate = jest.fn();
  mock.findByIdAndDelete = jest.fn();
  return mock;
});

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/DraftStatus', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findOneAndDelete: jest.fn()
}));

jest.mock('../models/StatusAnalytics', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue(true)
}));

const Status = require('../models/Status');
const User = require('../models/User');
const DraftStatus = require('../models/DraftStatus');
const statusRoutes = require('../routes/status');

const app = express();
app.use(express.json());
app.use('/api/status', statusRoutes);

describe('Status Full Capabilities Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/status/:id/share-token generates share link', async () => {
    Status.findById.mockResolvedValue(mockStatus);

    const res = await request(app)
      .post(`/api/status/${mockStatus._id}/share-token`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.shareUrl).toContain(String(mockStatus._id));
  });

  test('GET /api/status/drafts lists user drafts', async () => {
    DraftStatus.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ _id: 'd1', type: 'text', content: 'draft 1' }])
    });

    const res = await request(app).get('/api/status/drafts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.drafts).toHaveLength(1);
  });

  test('POST /api/status/drafts creates new draft', async () => {
    DraftStatus.create.mockResolvedValue({ _id: 'd2', type: 'text', content: 'new draft' });

    const res = await request(app)
      .post('/api/status/drafts')
      .send({ type: 'text', content: 'new draft' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.draft.content).toBe('new draft');
  });

  test('POST /api/status/:id/screenshot-attempt records screenshot alert', async () => {
    Status.findById.mockResolvedValue(mockStatus);

    const res = await request(app)
      .post(`/api/status/${mockStatus._id}/screenshot-attempt`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Screenshot registered');
  });

  test('GET /api/status/search searches statuses by keyword', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ contacts: [] })
    });
    Status.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockStatus])
      })
    });

    const res = await request(app).get('/api/status/search?q=testing');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statuses).toHaveLength(1);
  });
});
