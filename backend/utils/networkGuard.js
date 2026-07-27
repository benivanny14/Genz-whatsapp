const dns = require('dns').promises;
const net = require('net');

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  '169.254.169.254'
]);

const IPV4_BLOCKS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
];

const ipv4ToInt = (ip) => ip
  .split('.')
  .reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);

const isIpv4InCidr = (ip, base, bits) => {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
};

const isBlockedIpv4 = (ip) => IPV4_BLOCKS.some(([base, bits]) => isIpv4InCidr(ip, base, bits));

const extractMappedIpv4 = (ip) => {
  const lower = ip.toLowerCase();
  if (!lower.startsWith('::ffff:')) return null;
  const mapped = lower.slice(7);
  return net.isIP(mapped) === 4 ? mapped : null;
};

const isBlockedIpv6 = (ip) => {
  const lower = ip.toLowerCase();
  const mappedIpv4 = extractMappedIpv4(lower);
  if (mappedIpv4) return isBlockedIpv4(mappedIpv4);

  return lower === '::' ||
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb') ||
    lower.startsWith('ff');
};

const isBlockedAddress = (address) => {
  const family = net.isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true;
};

const isBlockedHostname = (hostname = '') => {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal');
};

const assertSafeExternalUrl = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const error = new Error('Invalid URL');
    error.statusCode = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const error = new Error('Only HTTP and HTTPS URLs are allowed');
    error.statusCode = 400;
    throw error;
  }

  if (parsed.username || parsed.password) {
    const error = new Error('URLs with embedded credentials are not allowed');
    error.statusCode = 400;
    throw error;
  }

  const hostname = parsed.hostname;
  if (!hostname || isBlockedHostname(hostname)) {
    const error = new Error('Private or local hostnames are not allowed');
    error.statusCode = 400;
    throw error;
  }

  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      const error = new Error('Private or reserved IP addresses are not allowed');
      error.statusCode = 400;
      throw error;
    }
    return parsed;
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: false });
  } catch {
    const error = new Error('Could not resolve URL hostname');
    error.statusCode = 400;
    throw error;
  }

  if (!records.length || records.some((record) => isBlockedAddress(record.address))) {
    const error = new Error('URL resolves to a private or reserved network address');
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

module.exports = {
  assertSafeExternalUrl,
  isBlockedAddress
};
