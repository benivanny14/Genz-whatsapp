require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_whatsapp');
  require('../models/User');
  const User = mongoose.model('User');
  
  const result = await User.updateOne(
    { username: 'BennyIvanny14' },
    { $set: { 
      failedLoginAttempts: 0, 
      lockUntil: null, 
      isAccountLocked: false,
      isBlocked: false 
    } }
  );
  
  console.log('Account unlocked:', result.modifiedCount, 'user(s)');
  
  // Test login via API
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'BennyIvanny14', password: 'Admin@123456' })
  });
  const data = await res.json();
  console.log('Login test:', JSON.stringify({ success: data.success, hasToken: !!data.token, message: data.message }));
  
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
