#!/usr/bin/env node
/**
 * export-fcm-tokens.js — export FCM tokens kutoka MongoDB kwa ajili ya
 * Firebase console → Cloud Messaging → campaign ("Send test message" au
 * "Upload tokens").
 *
 * Usage:
 *   MONGODB_URI=mongodb+srv://... node scripts/export-fcm-tokens.js [out.csv]
 *
 * Default output: fcm-tokens-export.csv (gitignored) — faili moja, token
 * moja kwa kila mstari, na count mwishoni.
 *
 * Tokens hizi si siri za kiwango cha juu (zinajulikana na kifaa lenyewe),
 * lakini zinaweza kutumika kutuma push — usiweke faili kwenye git.
 */
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI haipo — weka kama env (mf. Atlas connection string).');
  process.exit(1);
}

const outFile = path.resolve(process.argv[2] || 'fcm-tokens-export.csv');

(async () => {
  const mongoose = require('mongoose');
  await mongoose.connect(uri);
  const User = require('../backend/models/User');
  const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } })
    .select('username fcmTokens')
    .lean();

  const tokens = [];
  for (const u of users) {
    for (const t of u.fcmTokens || []) {
      if (t && t.length >= 100) tokens.push(t);
    }
  }

  if (tokens.length === 0) {
    console.log('ℹ️ Hakuna FCM tokens kwenye DB bado — watumiaji wanahitaji APK ya v1.1.14+ kwanza.');
    await mongoose.disconnect();
    return;
  }

  fs.writeFileSync(outFile, tokens.join('\n') + '\n');
  console.log(`✅ Tokens ${tokens.length} zimeandikwa kwenye: ${outFile}`);
  console.log('   (token moja kwa kila mstari — tayari kwa Firebase console upload)');
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('❌ Imeshindikana:', e.message);
  process.exit(1);
});
