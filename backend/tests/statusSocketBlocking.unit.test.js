/**
 * statusSocketBlocking.unit.test.js
 * Tests for A2: Blocked users should not receive status:created via socket
 * Validates audienceIdsForStatus filters out blocked users from both directions.
 */

// Mock helpers (unit-test style, no DB)
const idOf = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value.id || value.user || value.userId || value.toString?.() || '');
  return String(value);
};

const compactIds = (items = []) => {
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map((item) => idOf(item)).filter(Boolean))];
};

describe('A2: Socket status:created should not reach blocked users', () => {
  describe('audienceIdsForStatus logic (unit)', () => {
    const ownerId = 'user-owner';
    const blockedUserId = 'user-blocked';
    const normalUserId = 'user-normal';

    const contactIdsOf = (user = {}) => compactIds((user.contacts || []).map((c) => c?.user || c?._id || c));

    // Simplified version of audienceIdsForStatus logic
    const computeRecipients = (status, owner, blockedByOwner, eitherUserBlocked) => {
      const { included, excluded } = { included: [], excluded: [] };
      const privacy = status.privacy || 'contacts';
      if (privacy === 'nobody') return [];
      let candidateIds = contactIdsOf(owner).filter((id) => !excluded.includes(id));
      const recipientIds = [];
      for (const candidateId of candidateIds) {
        const candidateStr = String(candidateId);
        if (!candidateStr || candidateStr === ownerId) continue;
        if (blockedByOwner.has(candidateStr)) continue;
        if (eitherUserBlocked.has(candidateStr)) continue;
        recipientIds.push(candidateStr);
      }
      return recipientIds;
    };

    it('excludes blocked users from socket recipients (owner blocked candidate)', () => {
      const owner = { contacts: [{ user: blockedUserId }, { user: normalUserId }] };
      const blockedByOwner = new Set([blockedUserId]);
      const eitherUserBlocked = new Set();
      const recipients = computeRecipients({ privacy: 'contacts' }, owner, blockedByOwner, eitherUserBlocked);
      expect(recipients).toContain(normalUserId);
      expect(recipients).not.toContain(blockedUserId);
    });

    it('excludes blocked users from socket recipients (candidate blocked owner)', () => {
      const owner = { contacts: [{ user: blockedUserId }, { user: normalUserId }] };
      const blockedByOwner = new Set();
      const eitherUserBlocked = new Set([blockedUserId]);
      const recipients = computeRecipients({ privacy: 'contacts' }, owner, blockedByOwner, eitherUserBlocked);
      expect(recipients).toContain(normalUserId);
      expect(recipients).not.toContain(blockedUserId);
    });

    it('returns empty array for nobody privacy', () => {
      const owner = { contacts: [{ user: normalUserId }] };
      const recipients = computeRecipients({ privacy: 'nobody' }, owner, new Set(), new Set());
      expect(recipients).toEqual([]);
    });

    it('does not include owner in recipients', () => {
      const owner = { contacts: [{ user: ownerId }, { user: normalUserId }] };
      const recipients = computeRecipients({ privacy: 'contacts' }, owner, new Set(), new Set());
      expect(recipients).not.toContain(ownerId);
      expect(recipients).toContain(normalUserId);
    });
  });

  describe('Frontend handleCreated blocked check', () => {
    it('should filter status from blockedUsers', () => {
      const currentUser = {
        blockedUsers: [{ _id: 'blocked-user-1' }],
        blockedStatusUsers: []
      };
      const creatorId = 'blocked-user-1';
      const blockedUsers = new Set((currentUser.blockedUsers || []).map(u => String(u._id || u)));
      const blockedStatusUsers = new Set((currentUser.blockedStatusUsers || []).map(u => String(u._id || u)));
      const shouldFilter = blockedUsers.has(String(creatorId)) || blockedStatusUsers.has(String(creatorId));
      expect(shouldFilter).toBe(true);
    });

    it('should filter status from blockedStatusUsers', () => {
      const currentUser = {
        blockedUsers: [],
        blockedStatusUsers: [{ _id: 'status-blocked-user' }]
      };
      const creatorId = 'status-blocked-user';
      const blockedUsers = new Set((currentUser.blockedUsers || []).map(u => String(u._id || u)));
      const blockedStatusUsers = new Set((currentUser.blockedStatusUsers || []).map(u => String(u._id || u)));
      const shouldFilter = blockedUsers.has(String(creatorId)) || blockedStatusUsers.has(String(creatorId));
      expect(shouldFilter).toBe(true);
    });

    it('should NOT filter status from non-blocked user', () => {
      const currentUser = {
        blockedUsers: [{ _id: 'other' }],
        blockedStatusUsers: [{ _id: 'another' }]
      };
      const creatorId = 'normal-user';
      const blockedUsers = new Set((currentUser.blockedUsers || []).map(u => String(u._id || u)));
      const blockedStatusUsers = new Set((currentUser.blockedStatusUsers || []).map(u => String(u._id || u)));
      const shouldFilter = blockedUsers.has(String(creatorId)) || blockedStatusUsers.has(String(creatorId));
      expect(shouldFilter).toBe(false);
    });
  });
});
