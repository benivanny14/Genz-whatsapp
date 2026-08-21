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

const getEffectiveGenzMods = (settings = {}, user) => {
  const effective = { ...settings };
  if (isPremiumActive(user)) return effective;

  for (const field of PREMIUM_MOD_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(effective, field)) continue;
    effective[field] = field === 'voiceEffect' ? 'none' : (
      field === 'chatBackgroundMusic' ? { enabled: false, track: '' } : false
    );
  }

  return effective;
};

module.exports = { PREMIUM_MOD_FIELDS, isPremiumActive, getEffectiveGenzMods };
