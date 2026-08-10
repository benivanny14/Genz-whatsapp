jest.mock('../models/Community', () => {
  const mock = jest.fn();
  mock.find = jest.fn();
  mock.findById = jest.fn();
  mock.findByIdAndDelete = jest.fn();
  mock.create = jest.fn();
  return mock;
});

const Community = require('../models/Community');
const community = require('../controllers/communityController');

const makeRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeCommunity = (overrides = {}) => ({
  _id: 'c1',
  name: 'GENZ Devs',
  description: '',
  public: true,
  createdBy: 'user-1',
  members: ['user-1'],
  groups: [],
  createdAt: new Date(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeSortQuery = (value) => ({ sort: jest.fn().mockResolvedValue(value), limit: jest.fn().mockResolvedValue(value) });

describe('communityController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists joined and discoverable communities (happy path)', async () => {
    // joined: find().sort() — sort resolves; discoverable: find().sort().limit() — limit resolves
    Community.find
      .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([makeCommunity()]) })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([makeCommunity({ public: true })]) })
      });
    const res = makeRes();
    await community.getCommunities(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.communities.length).toBeGreaterThan(0);
    expect(res.body.communities[0].joined).toBe(true);
  });

  it('rejects creating a community without a name (validation)', async () => {
    const res = makeRes();
    await community.createCommunity(makeReq({ body: { description: 'x' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Community name is required');
  });

  it('creates a community (happy path)', async () => {
    Community.create.mockResolvedValue(makeCommunity());
    const res = makeRes();
    await community.createCommunity(makeReq({ body: { name: 'GENZ Devs', description: 'Dev talk' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.community.name).toBe('GENZ Devs');
    expect(Community.create).toHaveBeenCalledWith(expect.objectContaining({ members: ['user-1'] }));
  });

  it('returns 404 when joining a missing community', async () => {
    Community.findById.mockResolvedValue(null);
    const res = makeRes();
    await community.joinCommunity(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('joins a community (happy path)', async () => {
    const comm = makeCommunity({ members: ['user-2'] });
    Community.findById.mockResolvedValue(comm);
    const res = makeRes();
    await community.joinCommunity(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(comm.members).toContain('user-1');
    expect(comm.save).toHaveBeenCalled();
  });

  it('leaves a community (happy path)', async () => {
    const comm = makeCommunity({ members: ['user-1', 'user-2'] });
    Community.findById.mockResolvedValue(comm);
    const res = makeRes();
    await community.leaveCommunity(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(comm.members).toEqual(['user-2']);
    expect(comm.save).toHaveBeenCalled();
  });

  it('rejects updating a community the user did not create (403)', async () => {
    Community.findById.mockResolvedValue(makeCommunity({ createdBy: 'user-9' }));
    const res = makeRes();
    await community.updateCommunity(makeReq({ params: { id: 'c1' }, body: { name: 'New' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only the creator can edit this community');
  });

  it('updates a community (happy path)', async () => {
    const comm = makeCommunity();
    Community.findById.mockResolvedValue(comm);
    const res = makeRes();
    await community.updateCommunity(makeReq({ params: { id: 'c1' }, body: { name: 'New Name', description: 'desc' } }), res);
    expect(res.body.success).toBe(true);
    expect(comm.name).toBe('New Name');
    expect(comm.save).toHaveBeenCalled();
  });

  it('rejects deleting a community the user did not create (403)', async () => {
    Community.findById.mockResolvedValue(makeCommunity({ createdBy: 'user-9' }));
    const res = makeRes();
    await community.deleteCommunity(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deletes a community (happy path)', async () => {
    Community.findById.mockResolvedValue(makeCommunity());
    Community.findByIdAndDelete.mockResolvedValue({});
    const res = makeRes();
    await community.deleteCommunity(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(Community.findByIdAndDelete).toHaveBeenCalledWith('c1');
  });
});
