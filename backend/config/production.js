/**
 * Production MongoDB Configuration
 * 
 * This file contains production-specific MongoDB configuration
 * including connection pooling, retry logic, and performance tuning
 */

const mongoose = require('mongoose');

// Production MongoDB connection options
const productionOptions = {
  // Connection pooling
  maxPoolSize: 50, // Maximum number of connections in the pool
  minPoolSize: 10, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  
  // Connection timeout
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  
  // Retry logic
  retryWrites: true, // Retry write operations
  retryReads: true, // Retry read operations
  
  // Performance tuning
  bufferMaxEntries: 0, // Disable buffering in production
  bufferCommands: false, // Disable command buffering
  
  // SSL/TLS (recommended for production)
  // ssl: true,
  // tlsCAFile: '/path/to/ca.pem',
  
  // Authentication
  authSource: 'admin', // Default authentication database
  
  // Monitoring
  monitorCommands: true, // Enable command monitoring
};

/**
 * Connect to MongoDB with production configuration
 */
const connectProduction = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Connect with production options
    await mongoose.connect(mongoUri, productionOptions);
    
    console.log('[MongoDB Production] Connected successfully');
    
    // Set up event listeners for production monitoring
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB Production] Connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Production] Disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[MongoDB Production] Reconnected');
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('[MongoDB Production] Connection failed:', error);
    throw error;
  }
};

/**
 * Graceful shutdown for MongoDB connection
 */
const disconnectProduction = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB Production] Connection closed gracefully');
  } catch (error) {
    console.error('[MongoDB Production] Error during disconnect:', error);
  }
};

module.exports = {
  connectProduction,
  disconnectProduction,
  productionOptions
};
