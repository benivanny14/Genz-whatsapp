// Pure helpers extracted from ChatArea.jsx (which was 4900+ lines). These are
// state-free and JSX-free so the node --test runner can exercise them directly.

export const DISAPPEARING_OPTIONS = [
  { label: 'Off', value: 'Off' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '90 days', value: '90d' },
];

export const FONT_OPTIONS = [
  { label: 'Default', value: 'default', fontFamily: 'sans-serif' },
  { label: 'Arial', value: 'arial', fontFamily: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'times', fontFamily: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'georgia', fontFamily: 'Georgia, serif' },
  { label: 'Verdana', value: 'verdana', fontFamily: 'Verdana, sans-serif' },
  { label: 'Courier New', value: 'courier', fontFamily: '"Courier New", monospace' },
  { label: 'Comic Sans', value: 'comic', fontFamily: '"Comic Sans MS", cursive' },
  { label: 'Impact', value: 'impact', fontFamily: 'Impact, sans-serif' },
];

// Header class for modals - consistent styling
export const headerClass = 'bg-dark-surface';

// ── URL detection helper ──
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
export const extractFirstUrl = (text) => {
  if (!text || typeof text !== 'string') return null;
  const matches = text.match(URL_REGEX);
  return matches ? matches[0] : null;
};

const EMOJI_STICKER_SUGGESTIONS = {};

export const getEmojiStickerSuggestions = (text = '') => {
  if (!text || typeof text !== 'string') return [];
  const found = Object.keys(EMOJI_STICKER_SUGGESTIONS).find(k => k === text.trim() || k === text.trim().toLowerCase());
  if (!found) return [];
  return EMOJI_STICKER_SUGGESTIONS[found].map((url, index) => ({
    type: 'sticker',
    url,
    id: `suggest-${index}-${Date.now()}`
  }));
};

export const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const getEntityId = (entity) => String(entity?._id || entity?.id || entity || '');
export const getMentionName = (participant = {}) => participant.username || participant.name || participant.phoneNumber || '';

export const getActiveMentionToken = (value = '', cursor = value.length) => {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);
  if (!match) return null;
  return {
    query: match[2] || '',
    start: beforeCursor.length - match[2].length - 1,
    cursor
  };
};

export const buildMentionPayload = (text = '', participants = [], currentUserId = '') => {
  if (!text || !participants?.length) return [];
  return participants
    .filter((participant) => {
      const participantId = getEntityId(participant);
      const name = getMentionName(participant);
      if (!participantId || participantId === String(currentUserId) || !name) return false;
      return new RegExp(`(^|\\s)@${escapeRegExp(name)}(?=$|\\s|[.,!?;:)\\]])`, 'i').test(text);
    })
    .map((participant) => ({
      userId: getEntityId(participant),
      username: getMentionName(participant)
    }));
};
