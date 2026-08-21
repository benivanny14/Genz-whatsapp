const PREMIUM_MOD_FIELDS = [
  'antiDeleteMessages', 'antiDelete', 'antiDeleteStatus',
  'antiViewOnce', 'voiceEffect', 'selfDestruct',
  'chatBackgroundMusic', 'chatMusic', 'chatMusicUrl',
  'glassMode', 'highResMedia', 'antiScreenshot',
  'storyHighlights', 'fakeChatCover'
];

const isPremiumActive = (user) => Boolean(
  user?.premium &&
  user?.subscriptionExpiresAt &&
  new Date() <= new Date(user.subscriptionExpiresAt)
);

const disabledPremiumValue = (field) => {
  if (field === 'voiceEffect') return 'none';
  if (field === 'chatBackgroundMusic') return { enabled: false, track: '' };
  if (field === 'chatMusicUrl') return '';
  return false;
};

const getEffectiveGenzMods = (settings = {}, user) => {
  const effective = { ...settings };
  if (isPremiumActive(user)) return effective;

  for (const field of PREMIUM_MOD_FIELDS) {
    effective[field] = disabledPremiumValue(field);
  }

  return effective;
};

module.exports = { PREMIUM_MOD_FIELDS, isPremiumActive, getEffectiveGenzMods };
