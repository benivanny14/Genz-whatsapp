// Lightweight content moderation: blocks the most harmful language before it
// reaches other users. This is a baseline filter, not a replacement for human
// moderation — keep the word list deliberately small to avoid false positives.
const BLOCKED_WORDS = [
  // Hate slurs (English). Note: 'kike' is deliberately NOT here — in Swahili
  // it is the everyday word for "female" (e.g. "nguo za kike"), so blocking
  // it would reject legitimate marketplace/status content.
  'nigger', 'nigga', 'spic', 'chink', 'fag', 'faggot', 'tranny',
  'retard', 'rape', 'rapist',
  // Extreme sexual / child-safety terms
  'cp', 'childporn', 'loli', 'lolicon', 'preteen', 'pthc',
  // Swahili slurs / harassment
  'mbwa', 'nyani', 'mnyama', 'kufoka',
];

const BLOCKED_REGEX = new RegExp(
  `(^|[^a-z0-9])(${BLOCKED_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})([^a-z0-9]|$)`,
  'i'
);

// Normalize common leetspeak / separators so filters aren't trivially bypassed.
const normalize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[0-9]/g, (d) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' }[d] || d))
    .replace(/[@$]/g, 'a')
    .replace(/[.\-_*!|]+/g, ' ');

const containsProfanity = (text) => {
  if (!text || typeof text !== 'string') return false;
  return BLOCKED_REGEX.test(normalize(text));
};

module.exports = { containsProfanity, BLOCKED_WORDS };
