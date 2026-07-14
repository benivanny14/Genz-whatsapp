#!/usr/bin/env node
// Run: node scripts/generate-vapid.js
// Add output to your .env file
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\n✅ VAPID Keys Generated!\nAdd these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:admin@yourdomain.com\n`);
