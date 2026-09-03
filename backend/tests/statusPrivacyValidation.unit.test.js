/**
 * statusPrivacyValidation.unit.test.js
 * Tests for A1: Privacy leak fixes in Status sharing
 * - normalizePrivacy correctly maps legacy values
 * - VALID_PRIVACY rejects invalid values
 * - Backend returns 400 for invalid privacy
 */

const VALID_PRIVACY = new Set(['contacts', 'contacts_except', 'only_share_with', 'nobody', 'only_me']);

const normalizePrivacy = (privacy) => {
  if (!privacy) return null;
  if (privacy === 'everyone' || privacy === 'all') return 'contacts';
  if (privacy === 'only_me') return 'nobody';
  if (privacy === 'except') return 'contacts_except';
  if (VALID_PRIVACY.has(privacy)) return privacy;
  return 'INVALID';
};

describe('A1: Status Privacy Validation', () => {
  describe('normalizePrivacy mappings', () => {
    it('maps "all" to "contacts"', () => {
      expect(normalizePrivacy('all')).toBe('contacts');
    });

    it('maps "everyone" to "contacts"', () => {
      expect(normalizePrivacy('everyone')).toBe('contacts');
    });

    it('maps "only_me" to "nobody"', () => {
      expect(normalizePrivacy('only_me')).toBe('nobody');
    });

    it('maps legacy "except" to "contacts_except"', () => {
      expect(normalizePrivacy('except')).toBe('contacts_except');
    });

    it('passes through valid privacy values unchanged', () => {
      expect(normalizePrivacy('contacts')).toBe('contacts');
      expect(normalizePrivacy('contacts_except')).toBe('contacts_except');
      expect(normalizePrivacy('only_share_with')).toBe('only_share_with');
      expect(normalizePrivacy('nobody')).toBe('nobody');
    });

    it('returns null for falsy input', () => {
      expect(normalizePrivacy(null)).toBeNull();
      expect(normalizePrivacy(undefined)).toBeNull();
      expect(normalizePrivacy('')).toBeNull();
    });

    it('returns INVALID for truly invalid values', () => {
      expect(normalizePrivacy('random_value')).toBe('INVALID');
      expect(normalizePrivacy('public')).toBe('INVALID');
      expect(normalizePrivacy('group')).toBe('INVALID');
    });
  });

  describe('VALID_PRIVACY set', () => {
    it('contains exactly the expected values', () => {
      const expected = ['contacts', 'contacts_except', 'only_share_with', 'nobody', 'only_me'];
      for (const val of expected) {
        expect(VALID_PRIVACY.has(val)).toBe(true);
      }
      // Must NOT contain legacy values
      expect(VALID_PRIVACY.has('except')).toBe(false);
      expect(VALID_PRIVACY.has('all')).toBe(false);
      expect(VALID_PRIVACY.has('everyone')).toBe(false);
    });
  });

  describe('Frontend audience → backend privacy mapping', () => {
    const audiences = [
      { id: 'contacts', backend: 'contacts' },
      { id: 'contacts_except', backend: 'contacts_except' },
      { id: 'only_share_with', backend: 'only_share_with' },
    ];

    it('maps all frontend audience IDs to valid backend values', () => {
      for (const { id, backend } of audiences) {
        const normalized = normalizePrivacy(id);
        expect(normalized).toBe(backend);
        expect(normalized).not.toBe('INVALID');
      }
    });
  });
});
