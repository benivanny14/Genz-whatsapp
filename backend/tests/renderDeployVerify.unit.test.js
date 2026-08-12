/**
 * Unit tests for scripts/render-deploy-verify.js (retry/backoff + checks).
 *
 * The script is a root-level tool; this suite lives under backend/tests so the
 * backend jest run picks it up. It exercises:
 *   - getJson retries transient 502/503/504 + network errors with backoff
 *   - getJson returns non-transient responses (200, 4xx) immediately
 *   - verifyHealth happy path (mongo connected + cloudinary) and failure paths
 *   - verifyHealth passes the API key / skips API layer without one
 */
const path = require('path');
const { getJson, verifyHealth, RETRYABLE_STATUS } = require(path.join(__dirname, '..', '..', 'scripts', 'render-deploy-verify.js'));

// ── getJson retry/backoff ───────────────────────────────────────────────────

const flushPromises = () => new Promise((r) => setImmediate(r));

describe('render-deploy-verify getJson retry/backoff', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // deterministic jitter
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeResponse = (status, body = null, raw = '') => ({ status, body, raw });

  it('returns non-transient responses immediately without retrying', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeResponse(200, { ok: true }))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await getJson('https://x/api', {}, { attempts: 3, baseDelayMs: 100, fetch: fetchMock, timeoutMs: 1000 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry on 200

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(makeResponse(404, null, 'nope'));
    await getJson('https://x/api', {}, { attempts: 3, baseDelayMs: 100, fetch: fetchMock, timeoutMs: 1000 });
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry on 404
  });

  it('retries transient 502/503/504 with exponential backoff then succeeds', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeResponse(502, null, 'bad gateway'))
      .mockResolvedValueOnce(makeResponse(503, null, 'unavailable'))
      .mockResolvedValueOnce(makeResponse(200, { ok: true }));

    const res = await getJson('https://x/api', {}, { attempts: 3, baseDelayMs: 2, fetch: fetchMock, timeoutMs: 1000 });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on network errors and reports the exhausted error', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'));

    const res = await getJson('https://x/api', {}, { attempts: 3, baseDelayMs: 2, fetch: fetchMock, timeoutMs: 1000 });
    expect(res.status).toBe(0);
    expect(res.error).toMatch(/ECONNRESET/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('RETRYABLE_STATUS only contains transient statuses', () => {
    expect(RETRYABLE_STATUS.has(502)).toBe(true);
    expect(RETRYABLE_STATUS.has(503)).toBe(true);
    expect(RETRYABLE_STATUS.has(504)).toBe(true);
    expect(RETRYABLE_STATUS.has(200)).toBe(false);
    expect(RETRYABLE_STATUS.has(404)).toBe(false);
    expect(RETRYABLE_STATUS.has(500)).toBe(false);
  });

  it('respects attempts=1 (no retries at all)', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(makeResponse(503, null, 'x'));
    const res = await getJson('https://x/api', {}, { attempts: 1, baseDelayMs: 2, fetch: fetchMock, timeoutMs: 1000 });
    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── verifyHealth checks ─────────────────────────────────────────────────────

describe('render-deploy-verify verifyHealth', () => {
  it('passes all checks on a healthy service (mongo connected + cloudinary)', async () => {
    const healthy = {
      success: true,
      status: 'ok',
      services: { mongo: 'connected', redis: 'connected', mediaStorage: 'cloudinary' }
    };
    const fetch = jest.fn().mockResolvedValue({ status: 200, body: healthy, raw: '' });
    const out = await verifyHealth({ serviceUrl: 'https://genz.example.com', apiKey: '', fetch });
    expect(out.failed).toBe(0);
    expect(out.total).toBe(4);
    const names = out.results.map((r) => r.name);
    expect(names).toContain('mongo connected');
    expect(names).toContain('mediaStorage is cloudinary');
  });

  it('fails when mongo is disconnected', async () => {
    const unhealthy = {
      success: true,
      status: 'ok',
      services: { mongo: 'disconnected', mediaStorage: 'local' }
    };
    const fetch = jest.fn().mockResolvedValue({ status: 200, body: unhealthy, raw: '' });
    const out = await verifyHealth({ serviceUrl: 'https://genz.example.com', apiKey: '', fetch });
    expect(out.failed).toBeGreaterThan(0);
    const mongoCheck = out.results.find((r) => r.name === 'mongo connected');
    expect(mongoCheck.ok).toBe(false);
    const mediaCheck = out.results.find((r) => r.name === 'mediaStorage is cloudinary');
    expect(mediaCheck.ok).toBe(false);
  });

  it('fails when /api/health returns a non-200', async () => {
    const fetch = jest.fn().mockResolvedValue({ status: 503, body: null, raw: 'Service Unavailable' });
    const out = await verifyHealth({ serviceUrl: 'https://genz.example.com', apiKey: '', fetch });
    expect(out.failed).toBeGreaterThan(0);
    const httpCheck = out.results.find((r) => r.name === 'HTTP /api/health returns 200');
    expect(httpCheck.ok).toBe(false);
  });

  it('uses the Render API layer when a key is provided', async () => {
    const healthy = { success: true, status: 'ok', services: { mongo: 'connected', mediaStorage: 'cloudinary' } };
    const fetch = jest.fn().mockImplementation((url) => {
      // Order matters: the /deploys and /instances URLs also contain /services/srv-123.
      if (url.includes('/deploys')) return Promise.resolve({ status: 200, body: [{ status: 'live', commit: { id: 'abc1234' } }], raw: '' });
      if (url.includes('/instances')) return Promise.resolve({ status: 200, body: [{ id: 'i-1' }], raw: '' });
      if (url.includes('/services/srv-123')) return Promise.resolve({ status: 200, body: { service: { name: 'genz-whatsapp' } }, raw: '' });
      return Promise.resolve({ status: 200, body: healthy, raw: '' });
    });

    const out = await verifyHealth({ serviceUrl: 'https://genz.example.com', apiKey: 'k', serviceId: 'srv-123', fetch });
    expect(out.failed).toBe(0);
    const names = out.results.map((r) => r.name);
    expect(names).toContain('Render API: service found');
    expect(names).toContain('Render API: latest deploy');
    expect(names).toContain('Render API: instance running');
  });

  it('reports a failed API call (bad key) without crashing', async () => {
    const healthy = { success: true, status: 'ok', services: { mongo: 'connected', mediaStorage: 'cloudinary' } };
    const fetch = jest.fn().mockImplementation((url) => {
      if (url.startsWith('https://api.render.com')) return Promise.resolve({ status: 401, body: null, raw: 'unauthorized' });
      return Promise.resolve({ status: 200, body: healthy, raw: '' });
    });

    const out = await verifyHealth({ serviceUrl: 'https://genz.example.com', apiKey: 'bad', serviceId: 'srv-123', fetch });
    const apiCheck = out.results.find((r) => r.name === 'Render API: service found');
    expect(apiCheck.ok).toBe(false);
    // Health checks still run independently.
    const mongoCheck = out.results.find((r) => r.name === 'mongo connected');
    expect(mongoCheck.ok).toBe(true);
  });

  it('skips the API layer without a key (health-only mode)', async () => {
    const healthy = { success: true, status: 'ok', services: { mongo: 'connected', mediaStorage: 'cloudinary' } };
    const fetch = jest.fn().mockResolvedValue({ status: 200, body: healthy, raw: '' });
    const out = await verifyHealth({ serviceUrl: 'https://genz.example.com', apiKey: '', fetch });
    const apiCheck = out.results.find((r) => r.name === 'Render API: service found');
    expect(apiCheck).toBeUndefined();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('api.render.com'), expect.anything());
  });
});
