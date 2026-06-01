const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/tm-whatsapp').then(async () => {
  const db = mongoose.connection.db;
  
  // 1. Count all messages
  const totalMsgs = await db.collection('messages').countDocuments();
  console.log('Total messages:', totalMsgs);
  
  // 2. Count by messageType
  const types = await db.collection('messages').aggregate([
    { $group: { _id: '$messageType', count: { $sum: 1 } } }
  ]).toArray();
  console.log('Message types:', JSON.stringify(types));
  
  // 3. Find any messages with non-empty mediaUrl
  const withMedia = await db.collection('messages').find({ mediaUrl: { $exists: true, $nin: ['', null] } }).limit(3).toArray();
  console.log('Messages with mediaUrl:', withMedia.length, JSON.stringify(withMedia.map(m => ({ _id: m._id, type: m.messageType, mediaUrl: m.mediaUrl, content: m.content?.substring(0, 100) })), null, 2));
  
  // 4. Find messages with content containing /uploads/ or http
  const withUploads = await db.collection('messages').find({ content: { $regex: /upload|http|\.jpg|\.png|\.mp4|\.pdf/i } }).limit(3).toArray();
  console.log('Messages with upload/http content:', withUploads.length, JSON.stringify(withUploads.map(m => ({ _id: m._id, type: m.messageType, mediaUrl: m.mediaUrl, content: m.content?.substring(0, 200) })), null, 2));
  
  // 5. List all conversations
  const convos = await db.collection('conversations').find({}).limit(5).toArray();
  console.log('Conversations:', convos.length, JSON.stringify(convos.map(c => ({ _id: c._id, type: c.type, participants: c.participants })), null, 2));
  
  // 6. Show a sample message to see all fields
  const sample = await db.collection('messages').findOne({});
  console.log('Sample message fields:', sample ? Object.keys(sample) : 'NO MESSAGES');
  
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
