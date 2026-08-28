/**
 * API Versioning middleware.
 *
 * Provides three versioning mechanisms:
 *   1. URL path:    /api/v1/...   /api/v2/...
 *   2. Header:      Accept-Version: v1
 *   3. Query param: ?api_version=v1
 *
 * The version is set on req.apiVersion for downstream route handlers.
 * If no version is specified, defaults to 'v1'.
 *
 * Usage:
 *   const { versionMiddleware, requireVersion } = require('./middleware/apiVersion');
 *   app.use('/api', versionMiddleware, router);
 *   router.get('/foo', requireVersion('v1'), handler);
 */
const SUPPORTED_VERSIONS = ['v1'];
const DEFAULT_VERSION = 'v1';

/**
 * Middleware: detect and set req.apiVersion from header / query / default.
 */
const versionMiddleware = (req, res, next) => {
  // 1. Header: Accept-Version or Api-Version
  const headerVersion = req.headers['accept-version'] || req.headers['api-version'];

  // 2. Query parameter
  const queryVersion = req.query?.api_version;

  // 3. URL path already extracted by express-router (e.g. /api/v1/...)
  const pathMatch = req.originalUrl.match(/\/api\/(v\d+)\//);
  const pathVersion = pathMatch?.[1];

  const rawVersion = pathVersion || headerVersion || queryVersion || DEFAULT_VERSION;
  const normalized = rawVersion.toLowerCase();

  req.apiVersion = SUPPORTED_VERSIONS.includes(normalized) ? normalized : DEFAULT_VERSION;

  // Expose version to client
  res.setHeader('X-API-Version', req.apiVersion);
  next();
};

/**
 * Middleware factory: reject requests to unsupported versions.
 * Usage: router.use(requireVersion('v1'))
 */
const requireVersion = (...versions) => (req, res, next) => {
  if (!versions.includes(req.apiVersion)) {
    return res.status(400).json({
      success: false,
      message: `Unsupported API version '${req.apiVersion}'. Supported: ${versions.join(', ')}`,
    });
  }
  next();
};

module.exports = { versionMiddleware, requireVersion, SUPPORTED_VERSIONS };
