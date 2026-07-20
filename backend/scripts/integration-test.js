/**
 * GENZ WhatsApp integration test — registers 2 users and exercises core APIs.
 * Usage: node scripts/integration-test.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = (process.argv[2] || process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

const PASSWORD = 'GenzTest@2026!';
const USER_A = {
  username: 'genz_user_alpha',
  phoneNumber: '0712345671',
  password: PASSWORD
};
const USER_B = {
  username: 'genz_user_beta',
  phoneNumber: '0712345672',
  password: PASSWORD
};
const USER_C = {
  username: 'genz_user_gamma',
  phoneNumber: '0712345673',
  password: PASSWORD
};

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  ✓ ${name}`);
}

function fail(name, err) {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, error: msg });
  console.error(`  ✗ ${name}: ${msg}`);
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function registerOrLogin(user) {
  try {
    return await request('/auth/register', { method: 'POST', body: user });
  } catch (e) {
    if (e.status === 409 || /already|exists/i.test(e.message)) {
      return await request('/auth/login', {
        method: 'POST',
        body: { identifier: user.phoneNumber, password: user.password }
      });
    }
    throw e;
  }
}

async function main() {
  console.log(`\nGENZ Integration Test → ${API}\n`);

  let tokenA;
  let tokenB;
  let tokenC;
  let userAId;
  let userBId;
  let userCId;
  let conversationId;
  let messageId;
  let groupId;
  let statusId;

  try {
    const regA = await registerOrLogin(USER_A);
    tokenA = regA.token;
    userAId = regA.user?._id || regA.user?.id;
    pass('Register/login User A (genz_user_alpha)');
  } catch (e) {
    fail('Register/login User A', e);
  }

  try {
    const regB = await registerOrLogin(USER_B);
    tokenB = regB.token;
    userBId = regB.user?._id || regB.user?.id;
    pass('Register/login User B (genz_user_beta)');
  } catch (e) {
    fail('Register/login User B', e);
  }

  try {
    const regC = await registerOrLogin(USER_C);
    tokenC = regC.token;
    userCId = regC.user?._id || regC.user?.id;
    pass('Register/login User C (genz_user_gamma)');
  } catch (e) {
    fail('Register/login User C', e);
  }

  if (!tokenA || !tokenB) {
    printSummary();
    process.exit(1);
  }

  try {
    await request('/auth/me', { token: tokenA });
    pass('Auth /me User A');
  } catch (e) {
    fail('Auth /me User A', e);
  }

  try {
    const conv = await request('/chat/conversation', {
      method: 'POST',
      token: tokenA,
      body: { userId: userBId }
    });
    conversationId = conv.conversation?._id || conv.data?._id || conv._id;
    if (!conversationId) throw new Error('No conversation id returned');
    pass('Create 1:1 conversation A↔B');
  } catch (e) {
    fail('Create 1:1 conversation', e);
  }

  if (conversationId) {
    try {
      const sent = await request('/chat/messages', {
        method: 'POST',
        token: tokenA,
        body: {
          conversationId,
          content: 'Habari! Ujumbe wa mtihani kutoka GENZ test.',
          messageType: 'text'
        }
      });
      messageId = sent.message?._id || sent.data?._id;
      pass('Send text message');
    } catch (e) {
      fail('Send text message', e);
    }

    try {
      const msgs = await request(`/chat/conversations/${conversationId}/messages`, { token: tokenB });
      const list = msgs.messages || msgs.data || [];
      if (!list.length) throw new Error('No messages for recipient');
      pass('Receive messages (User B fetch)');
    } catch (e) {
      fail('Receive messages', e);
    }

    if (messageId) {
      try {
        await request(`/chat/messages/${messageId}/read`, { method: 'PUT', token: tokenB });
        pass('Mark message as read');
      } catch (e) {
        fail('Mark message as read', e);
      }
    }
  }

  try {
    const group = await request('/chat/groups', {
      method: 'POST',
      token: tokenA,
      body: {
        name: 'GENZ Test Group',
        participants: [userBId, userCId],
        description: 'Integration test group'
      }
    });
    groupId = group.conversation?._id || group.group?._id || group.data?._id;
    if (!groupId) throw new Error('No group id');
    pass('Create group chat');
  } catch (e) {
    fail('Create group chat', e);
  }

  if (groupId) {
    try {
      await request('/chat/messages', {
        method: 'POST',
        token: tokenA,
        body: {
          conversationId: groupId,
          content: 'Ujumbe wa kikundi — GENZ test',
          messageType: 'text'
        }
      });
      pass('Send group message');
    } catch (e) {
      fail('Send group message', e);
    }

    try {
      await request(`/chat/groups/${groupId}/admins/${userBId}`, {
        method: 'PUT',
        token: tokenA
      });
      pass('Promote member to admin');
    } catch (e) {
      fail('Promote member to admin', e);
    }
  }

  try {
    const status = await request('/advanced/status', {
      method: 'POST',
      token: tokenA,
      body: {
        type: 'text',
        content: 'Status ya mtihani — GENZ WhatsApp',
        backgroundColor: '#075E54'
      }
    });
    statusId = status.status?._id || status.data?._id;
    pass('Post text status');
  } catch (e) {
    fail('Post text status', e);
  }

  try {
    const statuses = await request('/advanced/status', { token: tokenB });
    const list = statuses.statuses || statuses.data || [];
    if (!list.length) throw new Error('No statuses visible to User B');
    pass('View statuses feed');
  } catch (e) {
    fail('View statuses feed', e);
  }

  if (statusId) {
    try {
      await request(`/advanced/status/${statusId}/view`, { method: 'POST', token: tokenB });
      pass('View status (mark viewed)');
    } catch (e) {
      fail('View status', e);
    }
  }

  try {
    const logs = await request('/calls', { token: tokenA });
    pass(`Call logs API (${(logs.callLogs || []).length} entries)`);
  } catch (e) {
    fail('Call logs API', e);
  }

  try {
    const blob = new Blob([Buffer.alloc(128, 0)], { type: 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, 'voice.webm');
    const uploadRes = await fetch(`${API}/media/upload/audio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: form
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.message || `Upload HTTP ${uploadRes.status}`);
    const mediaUrl = uploadData.url || uploadData.mediaUrl || uploadData.data?.url;
    if (conversationId && mediaUrl) {
      await request('/chat/messages', {
        method: 'POST',
        token: tokenA,
        body: {
          conversationId,
          content: 'Voice note test',
          messageType: 'voice',
          mediaUrl,
          duration: 3
        }
      });
    }
    pass('Upload voice note + send voice message');
  } catch (e) {
    fail('Upload voice note + send voice message', e);
  }

  try {
    const health = await fetch(`${BASE}/api/health`).then(r => r.json());
    if (!health.status && !health.success) throw new Error('Unhealthy');
    pass('Health check');
  } catch (e) {
    fail('Health check', e);
  }

  printSummary();
  console.log('\nTest accounts (password for all: GenzTest@2026!):');
  console.log('  User A: genz_user_alpha  | 0712345671');
  console.log('  User B: genz_user_beta   | 0712345672');
  console.log('  User C: genz_user_gamma  | 0712345673');
  process.exit(results.some(r => !r.ok) ? 1 : 0);
}

function printSummary() {
  const ok = results.filter(r => r.ok).length;
  const total = results.length;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${ok}/${total} passed`);
  if (ok < total) {
    console.log('Failed:');
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  console.log('');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
