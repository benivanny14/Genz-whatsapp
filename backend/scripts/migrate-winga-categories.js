/**
 * WINGA category ID migration — nguo→clothes, simu→phones, viwanja→plots,
 * dalari→currency, viatu→shoes.
 *
 * The old category ids were Swahili; the ids are part of the API contract
 * (listings POST category, feed grouping, e2e test-ids). This script rewrites
 * existing `businesses` and `orders` documents so no data is orphaned.
 *
 * Usage:
 *   node scripts/migrate-winga-categories.js            # apply
 *   DRY_RUN=1 node scripts/migrate-winga-categories.js  # preview only
 *
 * Requires: MongoDB up, MONGODB_URI set (defaults to local dev DB).
 */
require('dotenv').config();
const mongoose = require('mongoose');

const CATEGORY_MAP = {
  nguo: 'clothes',
  simu: 'phones',
  viwanja: 'plots',
  dalari: 'currency',
  viatu: 'shoes'
};

const DRY_RUN = process.env.DRY_RUN === '1';
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/genz-whatsapp';

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  const collections = ['businesses', 'orders'];
  let total = 0;

  for (const name of collections) {
    const col = db.collection(name);
    const docs = await col.find({ category: { $in: Object.keys(CATEGORY_MAP) } }).toArray();
    if (docs.length === 0) {
      console.log(`[${name}] no documents to migrate`);
      continue;
    }
    console.log(`[${name}] ${docs.length} document(s) found with old category ids:`);
    docs.forEach((d) => console.log(`  - ${d.title || d.listingTitle || '(untitled)'}: ${d.category} → ${CATEGORY_MAP[d.category]}`));

    if (!DRY_RUN) {
      for (const d of docs) {
        await col.updateOne(
          { _id: d._id },
          { $set: { category: CATEGORY_MAP[d.category] } }
        );
      }
      console.log(`[${name}] migrated ${docs.length} document(s)`);
    }
    total += docs.length;
  }

  if (DRY_RUN) {
    console.log(`\nDRY RUN — nothing changed. ${total} document(s) would be migrated.`);
  } else {
    console.log(`\nDone — migrated ${total} document(s).`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
