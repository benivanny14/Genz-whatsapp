/**
 * Socket call signaling test — registers 2 users, connects sockets, simulates call offer/answer/ICE.
 * Usage: node scripts/call-signaling-test.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const { io } = require(path.join(__dirname, '../../frontend/node_modules/socket.io-client'));

const BASE = (process.argv[2] || process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;
const SOCKET_ORIGIN = BASE.replace(/\/api$/, '');

const PASSWORD = 'GenzCall@2026!';
const ts = Date.now();
const USER_A = {
  username: `genz_call_alpha_${ts}`,
  phoneNumber: `07${String(ts).slice(-9)}`,
  password: PASSWORD
};
const USER_B = {
  username: `genz_call_beta_${ts}`,
  phoneNumber: `07${String(ts + 1).slice(-9)}`,
  password: PASSWORD
};

async function request(apiPath, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${apiPath}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
      return request('/auth/login', {
        method: 'POST',
        body: { identifier: user.phoneNumber, password: user.password }
      });
    }
    throw e;
  }
}

function connectSocket(token, userId) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_ORIGIN, {
      transports: ['websocket'],
      upgrade: false,
      auth: { token, userId: String(userId) },
      timeout: 30000,
      reconnection: false
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connect timeout'));
    }, 35000);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.emit('user:join', String(userId));
      // Give user:join a moment to register in onlineUsers map
      setTimeout(() => resolve(socket), 500);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Socket connect error: ${err.message}`));
    });
  });
}

function waitForEvent(socket, event, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function main() {
  console.log(`\nCall Signaling Test → ${SOCKET_ORIGIN}\n`);

  const regA = await registerOrLogin(USER_A);
  const regB = await registerOrLogin(USER_B);
  const userAId = regA.user?._id || regA.user?.id;
  const userBId = regB.user?._id || regB.user?.id;
  if (!userAId || !userBId || !regA.token || !regB.token) {
    throw new Error('Registration did not return user ids or tokens');
  }
  console.log('✓ Registered users:', USER_A.username, USER_B.username);

  const conv = await request('/chat/conversation', {
    method: 'POST',
    token: regA.token,
    body: { userId: userBId }
  });
  const conversationId = conv.conversation?._id || conv.data?._id || conv._id;
  if (!conversationId) throw new Error('No conversation id returned');
  console.log('✓ Conversation:', conversationId);

  const socketA = await connectSocket(regA.token, userAId);
  const socketB = await connectSocket(regB.token, userBId);
  console.log('✓ Both sockets connected');

  const incomingPromise = waitForEvent(socketB, 'call:incoming');
  const webrtcOfferPromise = waitForEvent(socketB, 'webrtc:offer');

  const fakeOffer = { type: 'offer', sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
  socketA.emit('webrtc:offer', {
    to: userBId,
    offer: fakeOffer,
    callType: 'audio',
    conversationId
  });

  const incoming = await incomingPromise;
  await webrtcOfferPromise;
  console.log('✓ Callee received call:incoming + webrtc:offer');
  console.log('  callerId:', incoming.callerId, 'callType:', incoming.callType);

  const answerPromise = waitForEvent(socketA, 'webrtc:answer');
  const acceptedPromise = waitForEvent(socketA, 'call:accepted');

  const fakeAnswer = { type: 'answer', sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
  socketB.emit('webrtc:answer', { to: userAId, answer: fakeAnswer });

  const answer = await answerPromise;
  await acceptedPromise;
  console.log('✓ Caller received webrtc:answer + call:accepted');
  console.log('  answer type:', answer.answer?.type);

  socketA.emit('call:end', { conversationId, targetUserId: userBId, callType: 'audio' });
  await waitForEvent(socketB, 'call:ended');
  console.log('✓ Callee received call:ended');

  // Video call signaling
  const videoIncoming = waitForEvent(socketB, 'call:incoming');
  socketA.emit('webrtc:offer', {
    to: userBId,
    offer: fakeOffer,
    callType: 'video',
    conversationId
  });
  const videoCall = await videoIncoming;
  console.log('✓ Video call:incoming received, callType:', videoCall.callType);

  socketA.emit('call:end', { conversationId, targetUserId: userBId, callType: 'video' });
  await waitForEvent(socketB, 'call:ended');
  console.log('✓ Video call ended cleanly');

  socketA.disconnect();
  socketB.disconnect();
  console.log('\nAll call signaling checks passed.\n');
}

main().catch((err) => {
  console.error('\n✗ Call signaling test failed:', err.message);
  process.exit(1);
});
