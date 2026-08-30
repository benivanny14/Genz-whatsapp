#!/usr/bin/env node
/**
 * Migration 003: Add text search index and compound indexes to Status collection.
 *
 * Run: node migrations/003_status_text_search_indexes.js
 *
 * This adds:
 *   1. Text index on { content: 'text', caption: 'text' } for search
 *   2. Compound index on { isRevoked: 1, userId: 1 } for revoked queries
 *   3. Compound index on { archived: 1, userId: 1 } for archive queries
 *   4. Compound index on { isScheduled: 1, scheduledAt: 1 } for scheduled queries
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/genz_whatsapp';

async function up() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('statuses');

  // List existing indexes
  const existingIndexes = await collection.indexes();
  const existingNames = existingIndexes.map(idx => idx.name);
  console.log(`📋 Found ${existingIndexes.length} existing indexes`);

  // 1. Text search index
  const textIndexName = 'content_text_caption_text';
  if (existingNames.includes(textIndexName)) {
    console.log('⏭️  Text search index already exists, skipping');
  } else {
    try {
      await collection.createIndex(
        { content: 'text', caption: 'text' },
        { name: textIndexName, default_language: 'english', language_override: 'none' }
      );
      console.log('✅ Created text search index on { content, caption }');
    } catch (err) {
      if (err.code === 85 || err.message?.includes('already exists')) {
        console.log('⏭️  Text search index already exists (race condition), skipping');
      } else {
        console.warn('⚠️  Failed to create text index:', err.message);
      }
    }
  }

  // 2. Compound index: isRevoked + userId
  const revokedIdxName = 'isRevoked_1_userId_1';
  if (existingNames.includes(revokedIdxName)) {
    console.log('⏭️  isRevoked+userId index already exists, skipping');
  } else {
    await collection.createIndex(
      { isRevoked: 1, userId: 1 },
      { name: revokedIdxName }
    );
    console.log('✅ Created compound index { isRevoked: 1, userId: 1 }');
  }

  // 3. Compound index: archived + userId
  const archivedIdxName = 'archived_1_userId_1';
  if (existingNames.includes(archivedIdxName)) {
    console.log('⏭️  archived+userId index already exists, skipping');
  } else {
    await collection.createIndex(
      { archived: 1, userId: 1 },
      { name: archivedIdxName }
    );
    console.log('✅ Created compound index { archived: 1, userId: 1 }');
  }

  // 4. Compound index: isScheduled + scheduledAt
  const scheduledIdxName = 'isScheduled_1_scheduledAt_1';
  if (existingNames.includes(scheduledIdxName)) {
    console.log('⏭️  isScheduled+scheduledAt index already exists, skipping');
  } else {
    await collection.createIndex(
      { isScheduled: 1, scheduledAt: 1 },
      { name: scheduledIdxName }
    );
    console.log('✅ Created compound index { isScheduled: 1, scheduledAt: 1 }');
  }

  // Verify final index list
  const finalIndexes = await collection.indexes();
  console.log(`\n📋 Final indexes on 'statuses' collection (${finalIndexes.length}):`);
  for (const idx of finalIndexes) {
    const keys = Object.entries(idx.key).map(([k, v]) => `${k}:${v}`).join(', ');
    console.log(`   - ${idx.name}: { ${keys} }`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Migration 003 completed successfully');
}

async function down() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collection = db.collection('statuses');

  const indexesToDrop = [
    'content_text_caption_text',
    'isRevoked_1_userId_1',
    'archived_1_userId_1',
    'isScheduled_1_scheduledAt_1'
  ];

  for (const name of indexesToDrop) {
    try {
      await collection.dropIndex(name);
      console.log(`✅ Dropped index: ${name}`);
    } catch (err) {
      console.log(`⏭️  Index ${name} not found, skipping`);
    }
  }

  await mongoose.disconnect();
  console.log('✅ Migration 003 reverted');
}

// CLI support
if (require.main === module) {
  const command = process.argv[2] || 'up';
  if (command === 'down') {
    down().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
  } else {
    up().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
  }
}

module.exports = { up, down };
