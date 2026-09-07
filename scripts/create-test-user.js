// Script to create a test user with proper scrypt hashing
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

async function main() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('genz-whatsapp');
  const coll = db.collection('users');
  
  // Check existing
  const existing = await coll.findOne({ username: 'bufftest1' });
  if (existing) {
    console.log('User exists. Password hash format:', existing.passwordHash?.substring(0, 30) + '...');
    const hasColon = existing.passwordHash?.includes(':');
    console.log('Has colon separator:', hasColon);
    
    if (hasColon) {
      // Check if the password is correct
      const [salt, storedHash] = existing.passwordHash.split(':');
      const keyLen = Buffer.from(storedHash, 'hex').length;
      console.log('Key length:', keyLen);
      
      // Try the password
      const password = 'TestPass123!@#';
      const testKey = await scrypt(password, salt, keyLen);
      const storedBuf = Buffer.from(storedHash, 'hex');
      if (storedBuf.length === testKey.length) {
        const match = crypto.timingSafeEqual(storedBuf, testKey);
        console.log('Password match:', match);
        if (match) {
          console.log('Login should work! Password is correct.');
          await client.close();
          return;
        }
      }
      console.log('Password does NOT match. Updating...');
    }
  }
  
  // Create/update user with proper hash
  const password = 'TestPass123!@#';
  const salt = crypto.randomBytes(16).toString('hex');
  console.log('Generating scrypt hash (this may take a moment)...');
  const derivedKey = await scrypt(password, salt, 64);
  const passwordHash = salt + ':' + derivedKey.toString('hex');
  
  await coll.updateOne(
    { username: 'bufftest1' },
    { 
      $set: { 
        passwordHash,
        phoneNumber: '+255711111111',
        phoneVerified: true,
        displayName: 'Buff Test'
      }
    },
    { upsert: true }
  );
  
  console.log('User created/updated with correct password hash');
  console.log('Login credentials: bufftest1 / TestPass123!@#');
  
  await client.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
