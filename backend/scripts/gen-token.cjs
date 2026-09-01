require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/genz_whatsapp');
  require('../models/User');
  const User = mongoose.model('User');
  
  const user = await User.findOne({ username: 'BennyIvanny14' });
  
  const token = jwt.sign(
    { id: user._id.toString(), username: user.username },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  );
  
  console.log(token);
  
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
