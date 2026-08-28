/**
 * Migration: Add Status Features
 * 
 * This migration adds new fields to support enhanced Status features:
 * - User.statusFeaturesSettings.ghostMode (Boolean)
 * - User.statusFeaturesSettings.tmModEnabled (Boolean)
 * - User.statusFeaturesSettings.hideSeenFromStatuses (Boolean)
 * - Status.poll (Object)
 * - Status.forwards (Array)
 * - Status.forwardCount (Number)
 * - Status.isRevoked (Boolean)
 * - Status.revokedAt (Date)
 * - Status.isDeleted (Boolean)
 * - Status.deletedAt (Date)
 * - Status.mentions (Array)
 * - Status.replySettings (String)
 * - Status.quality (String)
 * - Status.maxDuration (Number)
 * - Status.statusDuration (Number)
 * - Status.parentStatusId (ObjectId)
 * - Status.addYoursPrompt (String)
 * - Status.addYoursCount (Number)
 * - Status.locationSticker (Object)
 * - Status.linkPreview (Object)
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Status = require('../models/Status');

async function migrate() {
  try {
    console.log('Starting Status features migration...');

    // Update User documents to add new statusFeaturesSettings fields
    const userUpdateResult = await User.updateMany(
      { statusFeaturesSettings: { $exists: true } },
      {
        $set: {
          'statusFeaturesSettings.ghostMode': false,
          'statusFeaturesSettings.tmModEnabled': false,
          'statusFeaturesSettings.hideSeenFromStatuses': false
        }
      }
    );
    console.log(`Updated ${userUpdateResult.modifiedCount} users with new statusFeaturesSettings fields`);

    // Initialize statusFeaturesSettings for users who don't have it
    const userInitResult = await User.updateMany(
      { statusFeaturesSettings: { $exists: false } },
      {
        $set: {
          statusFeaturesSettings: {
            ghostMode: false,
            statusDuration: 24,
            hideSeenFrom: [],
            defaultPrivacy: 'contacts',
            tmModEnabled: false,
            hideSeenFromStatuses: false
          }
        }
      }
    );
    console.log(`Initialized statusFeaturesSettings for ${userInitResult.modifiedCount} users`);

    // Update Status documents to add new fields
    const statusUpdateResult = await Status.updateMany(
      {},
      {
        $set: {
          isRevoked: false,
          isDeleted: false,
          deletedAt: null,
          revokedAt: null,
          mentions: [],
          replySettings: 'everyone',
          quality: 'standard',
          maxDuration: 60,
          statusDuration: 24,
          parentStatusId: null,
          addYoursPrompt: '',
          addYoursCount: 0,
          locationSticker: { name: '', lat: 0, lng: 0 },
          linkPreview: { url: '', title: '', description: '', image: '', domain: '' },
          poll: null,
          forwards: [],
          forwardCount: 0
        }
      }
    );
    console.log(`Updated ${statusUpdateResult.modifiedCount} statuses with new fields`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('Connected to MongoDB');
    migrate();
  }).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
}

module.exports = migrate;
