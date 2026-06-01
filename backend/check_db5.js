const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/tm-whatsapp').then(async () => {
  const db = mongoose.connection.db;
  const msgs = await db.collection('messages').find({ $or: [{ mediaUrl: { $exists: true, $ne: "" } }, { content: /uploads/ }] }).limit(5).toArray();
  console.log(JSON.stringify(msgs, null, 2));
  process.exit(0);
}).catch(console.error);
