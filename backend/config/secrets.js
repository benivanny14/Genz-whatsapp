const required = (name) => {
  if (!process.env[name]) {
    throw new Error(`FATAL: ${name} is required. Set it in environment variables.`);
  }
  return process.env[name];
};

// All signing secrets must be explicitly configured. There is NO fallback:
// a weak or missing secret in production is a system-fatal condition.
const JWT_SECRET = required('JWT_SECRET');
// The refresh secret must be a SEPARATE secret in production. Sharing it with
// the access secret means a leaked access secret also defeats refresh tokens.
const JWT_REFRESH_SECRET = process.env.NODE_ENV === 'production'
  ? required('JWT_REFRESH_SECRET')
  : process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ADMIN_JWT_SECRET = required('ADMIN_JWT_SECRET');

module.exports = {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  ADMIN_JWT_SECRET
};
