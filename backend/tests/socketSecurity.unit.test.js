/**
 * Socket-layer security regression tests.
 *
 * Covers HATUA 1/2/3 socket fixes:
 *  - 1.2  targeted emits (no global io.emit / socket.broadcast leaks)
 *  - 2.2  participant checks (typing)
 *  - 2.4  update_status owner authorization
 *  - 2.5  create_custom_role admin check
 *  - 2.6  join_group requireJoinApproval rejection
 *  - 2.8  send_mass_message recipient cap
 *  - 3.3  join_group expired invite code rejection
 *  - 3.7  visit_profile consent gate
 */
jest.mock('../models/Message', () => ({
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  create: jest.fn()
}));
jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));
jest.mock('../models/User', () => {
  const chainable = () => ({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnThis() });
  return {
    findById: jest.fn().mockReturnValue(chainable()),
    findByIdAndUpdate: jest.fn().mockResolvedValue(),
    find: jest.fn().mockReturnValue(chainable())
  };
});
jest.mock('../models/Status', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn()
}));
jest.mock('../models/Broadcast', () => ({ create: jest.fn() }));
jest.mock('../models/PrivacyExcludedContact', () => ({
  findOne: jest.fn()
}));
jest.mock('../models/PrivacyAllowedContact', () => ({
  findOne: jest.fn()
}));
jest.mock('../utils/messageSendHelpers', () => ({
  normalizeReplyToId: jest.fn((x) => x || null),
  getSelfDestructExpiry: jest.fn(() => null),
  isConversationBlocked: jest.fn().mockResolvedValue(false),
  isEitherUserBlocked: jest.fn().mockResolvedValue(false)
}));
jest.mock('../utils/mentions', () => ({
  resolveMessageMentions: jest.fn().mockResolvedValue({ mentions: [], mentionedUserIds: [], mentionedUsers: [] })
}));
jest.mock('../services/notificationService', () => ({
  sendMentionNotification: jest.fn().mockResolvedValue({}),
  sendNewMessageNotification: jest.fn().mockResolvedValue({})
}));
jest.mock('../utils/unreadCount', () => ({
  ensureUnreadMap: jest.fn(),
  getUnreadCount: jest.fn(() => 0),
  setUnreadCount: jest.fn()
}));
jest.mock('../utils/messageSerializer', () => ({
  serializeOutgoingMessage: jest.fn((m, extra) => ({ ...m, ...extra }))
}));

const setupSocket = require('../socket');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Status = require('../models/Status');
const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');

let io;
let socket;
let handlers;

beforeEach(() => {
  jest.clearAllMocks();

  io = {
    on: jest.fn((event, cb) => {
      if (event === 'connection') connectionHandler = cb;
    }),
    to: jest.fn(() => ({ emit: jest.fn() })),
    emit: jest.fn()
  };
  global.onlineUsers = new Map();
  setupSocket(io);

  handlers = {};
  socket = {
    id: 'socket-1',
    userId: 'user-1',
    user: { username: 'alice' },
    data: {},
    rooms: new Set(),
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    broadcast: { emit: jest.fn() },
    removeAllListeners: jest.fn(),
    on: (event, cb) => {
      handlers[event] = cb;
    }
  };
  connectionHandler(socket);
});

let connectionHandler;

describe('socket security — targeted emits (1.2)', () => {
  it('block_user notifies only the blocker and the target user', async () => {
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['block_user']({ userId: 'user-2' });

    expect(io.to).toHaveBeenCalledWith('user-1');
    expect(io.to).toHaveBeenCalledWith('user-2');
    expect(roomEmit).toHaveBeenCalledWith('user:blocked', { blockerId: 'user-1', userId: 'user-2' });
    expect(io.emit).not.toHaveBeenCalled();
  });

  it('status_like notifies only the status owner', async () => {
    Status.findById.mockResolvedValue({
      userId: 'user-9',
      reactions: [],
      toObject: () => ({}),
      save: jest.fn().mockResolvedValue()
    });
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['status_like']({ statusId: 's1', liked: true });

    expect(Status.findById).toHaveBeenCalledWith('s1');
    expect(io.to).toHaveBeenCalledWith('user-9');
    expect(roomEmit).toHaveBeenCalledWith('status_liked_signal', expect.objectContaining({ statusId: 's1', userId: 'user-1' }));
    expect(io.emit).not.toHaveBeenCalled();
  });
});

describe('socket security — authorization (2.2/2.4/2.5/2.6)', () => {
  it('typing requires participation in the conversation', async () => {
    Conversation.findById.mockResolvedValue({ participants: ['user-9'] });

    await handlers['typing']({ conversationId: 'c1' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Not authorized for this conversation' });
    expect(socket.to).not.toHaveBeenCalled();
  });

  it('update_status rejects non-owners', async () => {
    Status.findById.mockResolvedValue({ userId: 'user-9' });

    await handlers['update_status']({ statusId: 's1', updates: { content: 'x' } });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Not authorized to update this status' });
    expect(io.to).not.toHaveBeenCalled();
  });

  it('create_custom_role requires an admin', async () => {
    Conversation.findById.mockResolvedValue({ admins: ['user-9'] });

    await handlers['create_custom_role']({ chatId: 'c1', roleName: 'mod', permissions: [] });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Only admins can create roles' });
  });

  it('join_group rejects groups that require admin approval', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isGroup: true, requireJoinApproval: true })
    });

    await handlers['join_group']({ chatId: 'c1', inviteCode: 'x' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Join requires admin approval. Use REST API.' });
  });

  it('join_group rejects expired invite codes (3.3)', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        isGroup: true,
        requireJoinApproval: false,
        groupInviteCodeExpiry: new Date(Date.now() - 60 * 1000)
      })
    });

    await handlers['join_group']({ chatId: 'c1', inviteCode: 'x' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Invite code expired' });
  });
});

describe('socket security — hard delete preserves originalContent (1.6 + mod viewer)', () => {
  it('message:delete scrubs content but keeps originalContent for the deleted-messages mod', async () => {
    const message = {
      _id: 'm1',
      conversationId: 'c1',
      sender: 'user-1',
      content: 'Secret text',
      caption: 'cap',
      mediaUrl: '/media/1.jpg',
      fileName: 'photo.jpg',
      fileSize: 1024,
      duration: 5,
      deletedForEveryone: false,
      deletedAt: null,
      save: jest.fn().mockResolvedValue()
    };
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockResolvedValue({ participants: ['user-1', 'user-2'] });
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['message:delete']({ messageId: 'm1', forEveryone: true });

    expect(message.deletedForEveryone).toBe(true);
    expect(message.content).toBe('[deleted]');
    expect(message.originalContent).toBe('Secret text');
    expect(message.caption).toBe('');
    expect(message.mediaUrl).toBe('');
    expect(message.save).toHaveBeenCalled();
  });
});

describe('socket security — mass messaging (2.8)', () => {
  it('rejects more than 20 recipients', async () => {
    const ack = jest.fn();
    const recipients = Array.from({ length: 21 }, (_, i) => `user-${i}`);

    await handlers['send_mass_message']({ recipients, message: 'hi' }, ack);

    expect(ack).toHaveBeenCalledWith({ success: false, error: 'Maximum 20 recipients allowed' });
  });

  it('rejects a 6th mass message within the hour (rate limit)', async () => {
    const ack = jest.fn();
    Message.countDocuments.mockResolvedValue(5);

    await handlers['send_mass_message']({ recipients: ['user-2'], message: 'hi' }, ack);

    expect(ack).toHaveBeenCalledWith({ success: false, error: 'Rate limit exceeded' });
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('allows up to 5 mass messages per hour', async () => {
    const ack = jest.fn();
    Message.countDocuments.mockResolvedValue(4);
    Message.create.mockResolvedValue({ _id: 'm1' });
    Message.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'm1', content: 'hi', sender: 'user-1' })
    });
    Conversation.findOne.mockResolvedValue({ _id: 'conv-1', participants: ['user-1', 'user-2'], save: jest.fn().mockResolvedValue(undefined) });
    Conversation.findById.mockResolvedValue({ _id: 'conv-1', lastMessage: null });

    await handlers['send_mass_message']({ recipients: ['user-2'], message: 'hi' }, ack);

    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ success: true, sentCount: 1 }));
  });
});

describe('extracted group/status handlers', () => {
  it('join_group accepts a valid invite code and adds the participant', async () => {
    const conv = {
      isGroup: true,
      requireJoinApproval: false,
      groupInviteCode: 'SECRET',
      groupInviteCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      participants: [],
      save: jest.fn().mockResolvedValue()
    };
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(conv) });
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['join_group']({ chatId: 'c1', inviteCode: 'SECRET' });

    expect(conv.participants).toContain('user-1');
    expect(conv.save).toHaveBeenCalled();
    expect(socket.join).toHaveBeenCalledWith('c1');
    expect(roomEmit).toHaveBeenCalledWith('group:member_joined', expect.objectContaining({ userId: 'user-1' }));
  });

  it('join_group rejects a wrong invite code', async () => {
    const conv = {
      isGroup: true,
      requireJoinApproval: false,
      groupInviteCode: 'SECRET',
      groupInviteCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      participants: [],
      save: jest.fn()
    };
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(conv) });

    await handlers['join_group']({ chatId: 'c1', inviteCode: 'WRONG' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Valid invite code required to join this group' });
    expect(conv.save).not.toHaveBeenCalled();
  });

  it('status:create delivers only to the poster\'s online contacts', async () => {
    Status.create.mockResolvedValue({
      _id: 's1',
      userId: 'user-1',
      username: 'alice',
      toObject: () => ({ _id: 's1', userId: 'user-1' })
    });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ contacts: [{ user: 'user-2' }, { user: 'user-3' }] })
    });
    global.onlineUsers.set('user-2', 'socket-2');
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['status:create']({ type: 'text', content: 'Hi' });

    expect(io.to).toHaveBeenCalledWith('socket-2');
    expect(roomEmit).toHaveBeenCalledWith('status:created', expect.objectContaining({ _id: 's1' }));
    // user-3 is offline → no socket emit, and never a global broadcast
    expect(io.emit).not.toHaveBeenCalled();
  });

  it('participant:added is ignored when the emitter is not a participant', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isGroup: true, participants: ['user-9'] })
    });

    await handlers['participant:added']({ groupId: 'g1', userId: 'user-2' });

    expect(io.to).not.toHaveBeenCalled();
  });

  it('participant:added relays membership to the group room', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        isGroup: true,
        participants: ['user-1', 'user-2'],
        admins: ['user-1']
      })
    });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'Bob' }) });
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['participant:added']({ groupId: 'g1', userId: 'user-2' });

    expect(io.to).toHaveBeenCalledWith('g1');
    expect(roomEmit).toHaveBeenCalledWith('group:participant_added', expect.objectContaining({ userId: 'user-2' }));
  });

  it('participant:added is ignored for a non-admin member (spoof relay)', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        isGroup: true,
        participants: ['user-1', 'user-2'],
        admins: ['user-9'],
        canAddMembers: false
      })
    });

    await handlers['participant:added']({ groupId: 'g1', userId: 'user-2' });

    expect(io.to).not.toHaveBeenCalled();
  });

  it('participant:added is ignored when the target is not actually a participant (spoof)', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        isGroup: true,
        participants: ['user-1'],
        admins: ['user-1']
      })
    });

    await handlers['participant:added']({ groupId: 'g1', userId: 'user-2' });

    expect(io.to).not.toHaveBeenCalled();
  });

});

describe('socket security — profile visit consent (3.7)', () => {
  it('skips recording when the target user has tracking disabled', async () => {
    User.findById.mockReturnValue({
      select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ settings: { privacy: { trackProfileVisitors: false } } }) }))
    });

    await handlers['visit_profile']({ visitedUserId: 'user-2', visitorName: 'Bob' });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });

  it('records the visit as the authenticated user when tracking is enabled', async () => {
    User.findById
      .mockImplementationOnce(() => ({
        select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ settings: { privacy: { trackProfileVisitors: true } } }) }))
      }))
      .mockImplementationOnce(() => ({
        select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ username: 'alice', profilePicture: null }) }))
      }));
    User.findByIdAndUpdate.mockResolvedValue({});
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['visit_profile']({ visitedUserId: 'user-2', visitorName: 'Spoofed' });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({ $push: expect.objectContaining({ profileVisitors: expect.anything() }) })
    );
    // visitor identity comes from the authenticated socket, not client data
    expect(io.to).toHaveBeenCalledWith('user-2');
    expect(roomEmit).toHaveBeenCalledWith('profile:visited', expect.objectContaining({ visitorId: 'user-1' }));
  });
});

describe('socket privacy — presence broadcast (contacts_except / subdocs)', () => {
  const presenceUser = () => ({
    _id: 'user-1',
    username: 'alice',
    settings: {
      privacy: { online: 'same_as_last_seen', lastSeen: 'contacts_except' }
    },
    contacts: [{ user: 'user-2', savedName: 'Bob' }, { user: 'user-3', savedName: 'Carol' }]
  });

  it('user:join skips excluded contacts for contacts_except and still notifies the rest', async () => {
    // user-2 is on the exclusion list; user-3 is not.
    PrivacyExcludedContact.findOne.mockImplementation(({ excludedContactId }) =>
      Promise.resolve(String(excludedContactId) === 'user-2' ? { _id: 'x' } : null)
    );
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(presenceUser()) });
    global.onlineUsers.set('user-2', 'socket-2');
    global.onlineUsers.set('user-3', 'socket-3');
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['user:join']('user-1');

    expect(PrivacyExcludedContact.findOne).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      privacyType: 'last_seen',
      excludedContactId: 'user-2'
    });
    // user-3 (allowed) receives the presence event; user-2 (excluded) does not.
    expect(io.to).toHaveBeenCalledWith('socket-3');
    expect(io.to).not.toHaveBeenCalledWith('socket-2');
    expect(roomEmit).toHaveBeenCalledWith('user:online', { userId: 'user-1' });
    // never a global broadcast for contacts/contacts_except
    expect(socket.broadcast.emit).not.toHaveBeenCalledWith('user:online', expect.anything());
  });

  it('user:join reaches contacts stored as { user, savedName } subdocs for contacts mode', async () => {
    const user = presenceUser();
    user.settings.privacy.lastSeen = 'contacts';
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    global.onlineUsers.set('user-2', 'socket-2');
    global.onlineUsers.set('user-3', 'socket-3');
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['user:join']('user-1');

    // Subdoc ids are extracted (String(subdoc) would be "[object Object]")
    expect(io.to).toHaveBeenCalledWith('socket-2');
    expect(io.to).toHaveBeenCalledWith('socket-3');
    expect(PrivacyExcludedContact.findOne).not.toHaveBeenCalled();
  });

  it('user:join broadcasts to everyone when the online setting is everyone', async () => {
    const user = presenceUser();
    user.settings.privacy = { online: 'everyone', lastSeen: 'everyone' };
    User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    await handlers['user:join']('user-1');

    expect(socket.broadcast.emit).toHaveBeenCalledWith('user:online', { userId: 'user-1' });
    expect(io.to).not.toHaveBeenCalled();
  });
});

describe('socket privacy — status:create respects the status privacy', () => {
  it('does not push a contacts_except status to excluded online contacts', async () => {
    Status.create.mockResolvedValue({
      _id: 's1',
      userId: 'user-1',
      privacy: 'contacts_except',
      excludedViewers: ['user-2'],
      toObject: () => ({
        _id: 's1',
        userId: 'user-1',
        privacy: 'contacts_except',
        excludedViewers: ['user-2']
      })
    });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        contacts: [{ user: 'user-2', savedName: 'Bob' }, { user: 'user-3', savedName: 'Carol' }]
      })
    });
    global.onlineUsers.set('user-2', 'socket-2');
    global.onlineUsers.set('user-3', 'socket-3');
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['status:create']({ type: 'text', content: 'Secret' });

    // user-3 (allowed contact) gets it; user-2 (excluded) does not.
    expect(io.to).toHaveBeenCalledWith('socket-3');
    expect(io.to).not.toHaveBeenCalledWith('socket-2');
    expect(roomEmit).toHaveBeenCalledWith('status:created', expect.objectContaining({ _id: 's1' }));
  });

  it('only the poster receives a nobody status', async () => {
    Status.create.mockResolvedValue({
      _id: 's1',
      userId: 'user-1',
      privacy: 'nobody',
      toObject: () => ({ _id: 's1', userId: 'user-1', privacy: 'nobody' })
    });
    User.findById.mockResolvedValue({
      select: jest.fn().mockResolvedValue({ contacts: [{ user: 'user-2', savedName: 'Bob' }] })
    });
    global.onlineUsers.set('user-2', 'socket-2');
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['status:create']({ type: 'text', content: 'Private' });

    expect(io.to).not.toHaveBeenCalledWith('socket-2');
    expect(io.emit).not.toHaveBeenCalled();
    // poster still receives their own status
    expect(socket.emit).toHaveBeenCalledWith('status:created', expect.objectContaining({ _id: 's1' }));
  });
});

describe('socket privacy — status:view refuses excluded viewers', () => {
  it('does not record or relay a view from an excluded viewer', async () => {
    Status.findById.mockResolvedValue({
      _id: 's1',
      userId: 'user-2',
      privacy: 'contacts_except',
      excludedViewers: ['user-1'],
      views: [],
      viewsCount: 0
    });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ contacts: [{ user: 'user-1', savedName: 'Bob' }] })
    });
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['status:view']({ statusId: 's1' });

    // no view recorded, no relay to the owner, nothing sent back to the viewer
    expect(Status.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalledWith('status:viewed', expect.anything());
  });

  it('records views from an allowed contact', async () => {
    const firstRead = {
      _id: 's1',
      userId: 'user-2',
      privacy: 'contacts_except',
      excludedViewers: ['user-3'],
      views: [],
      viewsCount: 0
    };
    const secondRead = {
      ...firstRead,
      views: [{ user: 'user-1', viewedAt: new Date() }],
      viewsCount: 1,
      toObject: () => ({ _id: 's1', userId: 'user-2' })
    };
    Status.findById.mockResolvedValueOnce(firstRead).mockResolvedValueOnce(secondRead);
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ contacts: [{ user: 'user-1', savedName: 'Bob' }] })
    });
    Status.findByIdAndUpdate.mockResolvedValue({});
    const roomEmit = jest.fn();
    io.to.mockReturnValue({ emit: roomEmit });

    await handlers['status:view']({ statusId: 's1' });

    expect(Status.findByIdAndUpdate).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith('user-2');
  });
});

describe('socket security — message:send persists allowScreenshot', () => {
  const CONV_ID = '64b9c5f2e4b0a1b2c3d4e5f6';
  const SENDER_ID = 'user-1'; // socket.userId in the test harness
  const OTHER_ID = '64b9c5f2e4b0a1b2c3d4e5f8';

  it('stores allowScreenshot=false for view-once messages (anti-screenshot)', async () => {
    Conversation.findById.mockResolvedValue({
      _id: CONV_ID,
      isGroup: false,
      participants: [SENDER_ID, OTHER_ID],
      disappearingMessages: { enabled: false },
      save: jest.fn().mockResolvedValue(undefined)
    });
    // Mock premium user so view-once is not stripped by the premium gate
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ premium: true, subscriptionExpiresAt: new Date(Date.now() + 86400000) })
    });
    Message.create.mockResolvedValue({ _id: 'm1', conversationId: CONV_ID });
    Message.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'm1', content: 'secret', sender: SENDER_ID })
    });
    Conversation.findByIdAndUpdate.mockResolvedValue({});

    await handlers['message:send']({
      conversationId: CONV_ID,
      content: 'view once secret',
      messageId: 'client-1',
      isViewOnce: true,
      allowScreenshot: false
    });

    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: CONV_ID,
      sender: SENDER_ID,
      isViewOnce: true,
      allowScreenshot: false
    }));
  });

  it('omits allowScreenshot (backend default true) when not supplied', async () => {
    Conversation.findById.mockResolvedValue({
      _id: CONV_ID,
      isGroup: false,
      participants: [SENDER_ID, OTHER_ID],
      disappearingMessages: { enabled: false },
      save: jest.fn().mockResolvedValue(undefined)
    });
    Message.create.mockResolvedValue({ _id: 'm2', conversationId: CONV_ID });
    Message.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'm2', content: 'plain', sender: SENDER_ID })
    });
    Conversation.findByIdAndUpdate.mockResolvedValue({});

    await handlers['message:send']({
      conversationId: CONV_ID,
      content: 'plain text',
      messageId: 'client-2'
    });

    expect(Message.create).toHaveBeenCalledWith(expect.not.objectContaining({ allowScreenshot: true }));
    const createArgs = Message.create.mock.calls[0][0];
    expect(createArgs.allowScreenshot).toBeUndefined();
  });
});
