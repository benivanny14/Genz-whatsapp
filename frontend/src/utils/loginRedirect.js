/**
 * Should a session-clear hard-redirect to the USER /login be skipped?
 *
 * True on the user auth pages (already there — redirecting would loop) and on
 * admin paths, which are reached by a DIFFERENT login (own credentials + TOTP):
 * a 401 from the user session restore on those pages must never bounce the
 * admin to the user /login — the admin router guards handle navigation there.
 * Pure + dependency-free so the boundary is unit-testable under node --test.
 */
export const shouldSkipLoginRedirect = (path = '') => {
  // Every route that is NOT wrapped in <ProtectedRoute> must skip the hard
  // redirect: user auth pages (redirecting would loop), the public content
  // pages (/privacy-policy, /terms, /install, /forgot-password, /pair-device)
  // and the admin paths, which use a DIFFERENT login (own credentials + TOTP).
  const publicPages = ['/login', '/register', '/verify-phone', '/forgot-password', '/privacy-policy', '/terms', '/install', '/pair-device'];
  const adminPages = ['/system-control-x7k9', '/system-gateway-x9k', '/admin'];
  return publicPages.some((p) => path === p || path.startsWith(p + '/')) ||
    adminPages.some((p) => path === p || path.startsWith(p + '/'));
};
