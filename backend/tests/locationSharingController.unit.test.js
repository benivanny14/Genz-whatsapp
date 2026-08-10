jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Message', () => ({
  create: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const locationSharing = require('../controllers/locationSharingController');

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
  query: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  locationSharingSettings: {},
  liveLocations: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeConversation = (overrides = {}) => ({
  _id: 'conv-1',
  isGroup: false,
  participants: ['user-1', 'user-2'],
  ...overrides
});

describe('locationSharingController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await locationSharing.getLocationSharingSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ locationSharingSettings: { locationAccuracy: 'low' } }));
    const res = makeRes();
    await locationSharing.getLocationSharingSettings(makeReq(), res);
    expect(res.body.settings.locationAccuracy).toBe('low');
    expect(res.body.settings.locationSharingEnabled).toBe(true); // default
    expect(res.body.settings.maxLiveLocationDuration).toBe(8);
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.updateLocationSharingSettings(makeReq({ body: { settings: { locationHistory: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(user.markModified).toHaveBeenCalledWith('locationSharingSettings');
    expect(res.body.settings.locationHistory).toBe(true);
  });
});

describe('locationSharingController — share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects share without coordinates (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.shareLocation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it('rejects share when location sharing is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ locationSharingSettings: { locationSharingEnabled: false } }));
    const res = makeRes();
    await locationSharing.shareLocation(makeReq({ body: { conversationId: 'conv-1', latitude: -1.29, longitude: 36.82 } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects share for missing conversation (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await locationSharing.shareLocation(makeReq({ body: { conversationId: 'conv-1', latitude: -1.29, longitude: 36.82 } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects share when not a participant (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation({ participants: ['user-3'] }));
    const res = makeRes();
    await locationSharing.shareLocation(makeReq({ body: { conversationId: 'conv-1', latitude: -1.29, longitude: 36.82 } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('shares location and creates a message (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation());
    Message.create.mockResolvedValue({ _id: 'msg-1' });
    const res = makeRes();
    await locationSharing.shareLocation(makeReq({ body: { conversationId: 'conv-1', latitude: -1.29, longitude: 36.82, accuracy: 'medium' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.messageId).toBe('msg-1');
    expect(res.body.locationData.accuracy).toBe('medium');
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ messageType: 'location' }));
  });
});

describe('locationSharingController — live location', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects start without conversationId (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.startLiveLocation(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects start when live location is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ locationSharingSettings: { liveLocationEnabled: false } }));
    const res = makeRes();
    await locationSharing.startLiveLocation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects start when not a participant (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation({ participants: ['user-3'] }));
    const res = makeRes();
    await locationSharing.startLiveLocation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('starts live sharing and pushes a session (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    Conversation.findById.mockResolvedValue(makeConversation());
    const res = makeRes();
    await locationSharing.startLiveLocation(makeReq({ body: { conversationId: 'conv-1', duration: 2 } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.duration).toBe(2);
    expect(user.liveLocations).toHaveLength(1);
    expect(user.liveLocations[0].status).toBe('active');
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects update without fields (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.updateLiveLocation(makeReq({ body: { liveLocationId: 'loc-1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects update for unknown session (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.updateLiveLocation(makeReq({ body: { liveLocationId: 'nope', latitude: 1, longitude: 2 } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects update for an expired session (400)', async () => {
    const liveLocation = {
      _id: 'loc-1',
      status: 'active',
      expiresAt: new Date(Date.now() - 1000)
    };
    User.findById.mockResolvedValue(makeUser({ liveLocations: [liveLocation] }));
    const res = makeRes();
    await locationSharing.updateLiveLocation(makeReq({ body: { liveLocationId: 'loc-1', latitude: 1, longitude: 2 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
    expect(liveLocation.status).toBe('expired');
  });

  it('updates a live session (happy path)', async () => {
    const liveLocation = {
      _id: 'loc-1',
      status: 'active',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      toString: () => 'loc-1'
    };
    const user = makeUser({ liveLocations: [liveLocation] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.updateLiveLocation(makeReq({ body: { liveLocationId: 'loc-1', latitude: -1.29, longitude: 36.82 } }), res);
    expect(res.statusCode).toBe(200);
    expect(liveLocation.currentLocation.longitude).toBe(36.82);
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects stop without an id (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.stopLiveLocation(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('stops a live session (happy path)', async () => {
    const liveLocation = {
      _id: 'loc-1',
      status: 'active',
      toString: () => 'loc-1'
    };
    const user = makeUser({ liveLocations: [liveLocation] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.stopLiveLocation(makeReq({ params: { shareId: 'loc-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(liveLocation.status).toBe('stopped');
    expect(user.save).toHaveBeenCalled();
  });

  it('lists active live locations enriched with group name', async () => {
    const loc = {
      _id: 'loc-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      status: 'active',
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      toObject: () => ({ _id: 'loc-1', status: 'active' })
    };
    User.findById.mockResolvedValue(makeUser({ liveLocations: [loc] }));
    Conversation.findById.mockResolvedValue(makeConversation({ isGroup: true, name: 'Genz Squad' }));
    const res = makeRes();
    await locationSharing.getActiveLiveLocations(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.activeLocations).toHaveLength(1);
    expect(res.body.activeLocations[0].contactName).toBe('Genz Squad');
    expect(res.body.activeLocations[0].duration).toMatch(/Ends in/);
  });

  it('enriches active locations with the contact username', async () => {
    const loc = {
      _id: 'loc-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      status: 'active',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      toObject: () => ({ _id: 'loc-1', status: 'active' })
    };
    User.findById.mockResolvedValueOnce(makeUser({ liveLocations: [loc] }));
    User.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ username: 'bob' }) });
    Conversation.findById.mockResolvedValue(makeConversation({ participants: ['user-1', 'user-2'] }));
    const res = makeRes();
    await locationSharing.getActiveLiveLocations(makeReq(), res);
    expect(res.body.activeLocations[0].contactName).toBe('bob');
  });
});

describe('locationSharingController — nearby & last location', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects nearby without coordinates (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.getNearbyFriends(makeReq({ query: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('lists nearby friends within radius (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([makeConversation()]);
    const friend = {
      _id: 'user-2',
      username: 'bob',
      profilePicture: null,
      locationSharingSettings: {},
      lastLocation: { latitude: -1.29, longitude: 36.82, timestamp: new Date() }
    };
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([friend]) });
    const res = makeRes();
    await locationSharing.getNearbyFriends(makeReq({ query: { latitude: -1.29, longitude: 36.82, radius: 5 } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.nearbyFriends).toHaveLength(1);
    expect(res.body.nearbyFriends[0].username).toBe('bob');
  });

  it('skips friends who hid their location (privacy)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([makeConversation()]);
    const friend = {
      _id: 'user-2',
      username: 'bob',
      profilePicture: null,
      locationSharingSettings: { hideLocationFrom: ['user-1'] },
      lastLocation: { latitude: -1.29, longitude: 36.82, timestamp: new Date() }
    };
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([friend]) });
    const res = makeRes();
    await locationSharing.getNearbyFriends(makeReq({ query: { latitude: -1.29, longitude: 36.82 } }), res);
    expect(res.body.nearbyFriends).toHaveLength(0);
  });

  it('rejects updateLastLocation without coordinates (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await locationSharing.updateLastLocation(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('updates the last location (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.updateLastLocation(makeReq({ body: { latitude: -1.29, longitude: 36.82, accuracy: 'low' } }), res);
    expect(res.statusCode).toBe(200);
    expect(user.lastLocation.accuracy).toBe('low');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('locationSharingController — toggle & reset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('toggles location sharing off (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.toggleLocationSharing(makeReq({ body: { enabled: false } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.settings.locationSharingEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles location sharing when enabled is omitted', async () => {
    const user = makeUser({ locationSharingSettings: { locationSharingEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.toggleLocationSharing(makeReq(), res);
    expect(res.body.settings.locationSharingEnabled).toBe(false);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ locationSharingSettings: { locationSharingEnabled: false, locationAccuracy: 'low' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await locationSharing.resetLocationSharingSettings(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.settings.locationSharingEnabled).toBe(true);
    expect(res.body.settings.locationAccuracy).toBe('high');
  });
});
