require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const { generateKeyPair, generateSignatureKeyPair } = require('../config/encryption');
const { registerClientPublicKeys } = require('../services/encryptionService');

async function run() {
  await connectDB();

  const TEST_EMAIL = process.env.E2EE_TEST_EMAIL || 'dev-e2ee@local';
  let user = await User.findOne({ email: TEST_EMAIL });
  if (!user) {
    user = await User.create({ username: 'dev-e2ee', email: TEST_EMAIL, phoneNumber: '0000000000' });
    console.log('Created test user:', user._id.toString());
  } else {
    console.log('Found test user:', user._id.toString());
  }

  // Generate keypairs (X25519 for encryption, Ed25519 for signatures)
  const kp = generateKeyPair();
  const sig = generateSignatureKeyPair();

  try {
    const result = await registerClientPublicKeys(user._id.toString(), {
      publicKey: kp.publicKey,
      signaturePublicKey: sig.publicKey
    });

    console.log('Registered public keys for user:', user._id.toString());
    console.log('Stored publicKey (truncated):', String(result.publicKey).slice(0, 120));
    process.exit(0);
  } catch (err) {
    console.error('Failed to register public keys:', err.message || err);
    process.exit(2);
  }
}

run();
