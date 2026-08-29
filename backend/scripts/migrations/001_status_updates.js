/**
 * Migration Script: 001_status_updates.js
 * Applies default values for new Status fields across all existing documents in MongoDB.
 */

const mongoose = require("mongoose");
const Status = require("../../models/Status");

async function migrateStatusSchema(mongoUri) {
  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri);
    }

    console.log("[Migration] Starting status schema migration...");

    const result = await Status.updateMany(
      { replySettings: { $exists: false } },
      {
        $set: {
          replySettings: "everyone",
          quality: "standard",
          maxDuration: 60,
          statusDuration: 24,
          mentions: [],
          isRevoked: false,
          revokedAt: null,
          parentStatusId: null,
          addYoursCount: 0,
        },
      },
    );

    console.log(
      `[Migration] Completed. Modified ${result.modifiedCount || result.nModified || 0} status documents.`,
    );
  } catch (err) {
    console.error("[Migration] Failed:", err);
    throw err;
  }
}

if (require.main === module) {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/genz_whatsapp";
  migrateStatusSchema(uri)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateStatusSchema;
