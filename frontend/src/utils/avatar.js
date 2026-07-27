/** Default avatar when user has no profile picture (WhatsApp-style initials) */
export const getAvatarUrl = (user, fallbackLetter = 'G') => {
  if (user?.profilePicture && !user.profilePicture.startsWith('blob:')) {
    return user.profilePicture;
  }
  const letter = (user?.username || user?.name || fallbackLetter).charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect fill="%23008069" width="150" height="150"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="64" font-family="system-ui,sans-serif" font-weight="600">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
