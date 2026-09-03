const mongoose = require('mongoose');
require('dotenv').config();

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const connectDB = async (attempt = 1) => {
  try {
    const mongoUri = process.env.MONGODB_URI || (
      process.env.NODE_ENV === 'production' ? '' : 'mongodb://localhost:27017/tm-whatsapp'
    );
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
      maxIdleTimeMS: 10000,
      connectTimeoutMS: 10000,
      bufferCommands: false
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);

    if (attempt < MAX_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
      return connectDB(attempt + 1);
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('MongoDB connection failed after all retries. Exiting.');
      process.exit(1);
    }
    console.warn('Continuing without MongoDB in non-production. DB-backed features will use existing fallbacks where available.');
    return null;
  }
};

module.exports = connectDB;
