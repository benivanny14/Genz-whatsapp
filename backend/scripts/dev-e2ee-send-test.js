require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'genz-development-secret-change-me';

async function ensureConversationBetween(aId, bId) {
  let conv = await Conversation.findOne({ participants: { $all: [aId, bId], $size: 2 } });
  if (!conv) {
    conv = await Conversation.create({ participants: [aId, bId], isGroup: false });
    console.log('Created conversation:', conv._id.toString());
  }
  return conv;
}

async function run() {
  await connectDB();

  const senderEmail = process.env.E2EE_SENDER_EMAIL || 'dev-sender@local';
  const recipientEmail = process.env.E2EE_TEST_EMAIL || 'dev-e2ee@local';

  let sender = await User.findOne({ email: senderEmail });
  if (!sender) {
    sender = await User.create({ username: 'dev-sender', email: senderEmail, phoneNumber: '1111111111' });
    console.log('Created sender:', sender._id.toString());
  }

  const recipient = await User.findOne({ email: recipientEmail });
  if (!recipient) {
    console.error('Recipient not found. Run dev-register-public-key.js first.');
    process.exit(2);
  }

  const conv = await ensureConversationBetween(sender._id.toString(), recipient._id.toString());

  const token = jwt.sign({ id: sender._id.toString() }, JWT_SECRET, { expiresIn: '1h' });

  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';

  const plainRes = await fetch(`${baseUrl}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ conversationId: conv._id.toString(), content: 'Hello plaintext from dev script', messageType: 'text' })
  });

  console.log('Plaintext send status:', plainRes.status);
  console.log('Plaintext response:', await plainRes.text());

  const fakeEncrypted = JSON.stringify({ version: 1, algorithm: 'ECDH-P256+AES-256-GCM', iv: 'AA==', ciphertext: 'FAKE' });

  const encRes = await fetch(`${baseUrl}/api/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ conversationId: conv._id.toString(), content: fakeEncrypted, messageType: 'text' })
  });

  console.log('Encrypted-like send status:', encRes.status);
  console.log('Encrypted-like response:', await encRes.text());

  process.exit(0);
}

run();
