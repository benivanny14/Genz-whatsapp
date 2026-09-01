require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { scrypt } = require('crypto');
const util = require('util');
const scryptAsync = util.promisify(scrypt);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_whatsapp');
  require('../models/User');
  const User = mongoose.model('User');
  
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync('Admin@123456', salt, 64);
  const hash = salt + ':' + derived.toString('hex');
  
  const result = await User.updateOne(
    { username: 'BennyIvanny14' },
    { $set: { passwordHash: hash } }
  );
  
  console.log('Updated:', result.modifiedCount, 'user(s)');
  
  // Verify
  const user = await User.findOne({ username: 'BennyIvanny14' });
  const ok = await user.comparePassword('Admin@123456');
  console.log('Verification:', ok ? 'SUCCESS' : 'FAILED');
  
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
