const mongoose = require('mongoose');

// Assuming URL from env or fallback
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/tm-whatsapp';

mongoose.connect(url).then(async () => {
  try {
    await mongoose.connection.collection('users').dropIndex('email_1');
    console.log('dropped email_1');
  } catch(e) {
    console.log(e.message);
  }
  const res = await mongoose.connection.collection('users').updateMany({ email: '' }, { $unset: { email: 1 } });
  console.log(res);
  process.exit(0);
});
