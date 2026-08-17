import { getAuthToken } from './tokenStore';
import { resolveApiBase } from './resolveApiBase';

// Build a shareable URL for a status. If the current user owns the status, the
// backend mints an expiring share token so anyone with the link (even
// anonymous visitors) can view it without the status being 'everyone'. Non-
// owners (and offline failures) fall back to the plain link, which still works
// for logged-in viewers who pass the privacy checks.
export async function buildShareUrl(statusId) {
  const id = encodeURIComponent(statusId);
  const base = `${window.location.origin}/status/${id}`;
  try {
    const token = getAuthToken();
    const res = await fetch(`${resolveApiBase()}/status-advanced/${id}/share-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.success && data.token) return `${base}?share=${encodeURIComponent(data.token)}`;
  } catch (e) {
    // Not the owner or offline — fall back to the plain link.
  }
  return base;
}
