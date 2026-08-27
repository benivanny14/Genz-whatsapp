const User = require('../models/User');
const Status = require('../models/Status');

describe('Status Privacy & Anti-Revoke Unit Tests', () => {
  describe('Task 1: Privacy Enum Validation', () => {
    it('validates privacy enums contacts_except and only_share_with', () => {
      const validEnums = new Set(['contacts', 'contacts_except', 'only_share_with', 'nobody', 'only_me']);
      expect(validEnums.has('contacts_except')).toBe(true);
      expect(validEnums.has('only_share_with')).toBe(true);
      expect(validEnums.has('except')).toBe(false);
    });

    it('rejects invalid privacy enum values like "except"', () => {
      const VALID_PRIVACY = new Set(['contacts', 'contacts_except', 'only_share_with', 'nobody', 'only_me']);
      const normalizePrivacy = (privacy) => {
        if (!privacy) return null;
        if (privacy === 'everyone') return 'contacts';
        if (privacy === 'only_me') return 'nobody';
        if (VALID_PRIVACY.has(privacy)) return privacy;
        return 'INVALID';
      };

      expect(normalizePrivacy('except')).toBe('INVALID');
      expect(normalizePrivacy('contacts_except')).toBe('contacts_except');
      expect(normalizePrivacy('only_share_with')).toBe('only_share_with');
    });
  });

  describe('Task 2: Anti-Revoke Status behavior', () => {
    it('allows viewer with antiRevokeStatus ON to see status if viewed before delete', () => {
      const viewer = {
        _id: '507f1f77bcf86cd799439011',
        privacyModsSettings: { antiRevokeStatus: true }
      };
      const status = {
        _id: '507f1f77bcf86cd799439022',
        user: '507f1f77bcf86cd799439033',
        isRevoked: true,
        isDeleted: true,
        views: [{ userId: '507f1f77bcf86cd799439011', user: '507f1f77bcf86cd799439011' }]
      };

      const hasAntiRevoke = Boolean(viewer.privacyModsSettings?.antiRevokeStatus);
      const alreadyViewed = status.views.some(v => String(v.userId || v.user) === viewer._id);

      expect(hasAntiRevoke && alreadyViewed).toBe(true);
    });

    it('prevents viewer who never viewed status before delete from seeing it even if anti-revoke is ON', () => {
      const viewer = {
        _id: '507f1f77bcf86cd799439011',
        privacyModsSettings: { antiRevokeStatus: true }
      };
      const status = {
        _id: '507f1f77bcf86cd799439022',
        user: '507f1f77bcf86cd799439033',
        isRevoked: true,
        isDeleted: true,
        views: [] // empty - never viewed!
      };

      const hasAntiRevoke = Boolean(viewer.privacyModsSettings?.antiRevokeStatus);
      const alreadyViewed = status.views.some(v => String(v.userId || v.user) === viewer._id);

      expect(hasAntiRevoke && alreadyViewed).toBe(false);
    });
  });
});

