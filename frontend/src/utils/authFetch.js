import { getDeviceHeaders } from './deviceIdentity';
import { readAccessToken, tryRefreshAccessToken, clearSessionAndRedirect } from './authSession';

function headersToPlainObject(h) {
  if (!h) return {};
  if (h instanceof Headers) {
    const o = {};
    h.forEach((v, k) => {
      o[k] = v;
    });
    return o;
  }
  if (Array.isArray(h)) return Object.fromEntries(h);
  return { ...h };
}

function resolveUrlString(input) {
  let url = '';
  if (typeof input === 'string') url = input;
  else if (input instanceof Request) url = input.url;
  else url = String(input);
  // Fix double /api/api/ which happens when BACKEND_URL already ends with /api
  // and the caller prepends another /api/ segment.
  url = url.replace(/\/api\/api\//g, '/api/');
  return url;
}

/**
 * Same-origin API fetch with device headers, Bearer access token, one refresh-on-401 retry,
 * and guarded 429 retry (matches axios interceptor behavior).
 */
export async function authFetch(input, init = {}) {
  const { _authRetry, _rateLimitRetry, ...fetchInit } = init;
  const urlString = resolveUrlString(input);
  const hadAccessTokenAtStart = !!readAccessToken();

  const baseHeaders = headersToPlainObject(fetchInit.headers);
  const headers = { ...getDeviceHeaders(), ...baseHeaders };
  const token = readAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (fetchInit.body instanceof FormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const response = await fetch(input, {
    ...fetchInit,
    headers,
    credentials: fetchInit.credentials ?? 'include'
  });

  if (response.status === 401 && _authRetry) {
    console.error('[Auth] Still unauthorized after token refresh:', urlString);
    clearSessionAndRedirect();
    return response;
  }

  if (response.status === 401 && !_authRetry) {
    if (!hadAccessTokenAtStart) {
      return response;
    }
    if (
      urlString.includes('/api/auth/login') ||
      urlString.includes('/api/auth/register') ||
      urlString.includes('/api/auth/forgot-password')
    ) {
      return response;
    }
    if (urlString.includes('/api/auth/refresh')) {
      console.error('[Auth] Refresh endpoint returned 401; clearing session');
      clearSessionAndRedirect();
      return response;
    }
    const newToken = await tryRefreshAccessToken();
    if (newToken) {
      return authFetch(input, { ...init, _authRetry: true });
    }
    console.warn('[Auth] Unauthorized; refresh failed or unavailable:', urlString);
    clearSessionAndRedirect();
    return response;
  }

  if (response.status === 429 && !_rateLimitRetry) {
    const retryAfter = parseInt(response.headers.get('retry-after'), 10) || 2;
    const delayMs = Math.min(Math.max(retryAfter, 1), 30) * 1000;
    console.warn(`[API] Rate limited (fetch); single retry after ${delayMs}ms`);
    await new Promise((r) => setTimeout(r, delayMs));
    return authFetch(input, { ...init, _rateLimitRetry: true });
  }

  // Intercept json() to sanitize bad backend URLs
  const originalJson = response.json.bind(response);
  response.json = async () => {
    const data = await originalJson();
    return sanitizeUrlsInObject(data);
  };

  return response;
}

function sanitizeUrlsInObject(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    const zeroHostMatch = obj.match(/^https?:\/\/0\.0\.0\.0(?::\d+)?(\/.*)$/);
    if (zeroHostMatch) return zeroHostMatch[1];
    const localhostMatch = obj.match(/^https?:\/\/(?:localhost|127\.0\.0\.1):5000(\/.*)$/);
    if (localhostMatch) return localhostMatch[1];
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeUrlsInObject(item));
  }
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = sanitizeUrlsInObject(obj[key]);
    }
    return newObj;
  }
  return obj;
}
