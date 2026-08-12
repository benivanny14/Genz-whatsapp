/**
 * Automated MongoDB backup (mongodump) with retention + optional cloud copy.
 *
 * Architecture improvement (C.3): the app has user-level chat backups via
 * /api/backup/schedule, but there was no database-level backup strategy. This
 * script snapshots the whole database with mongodump into
 * BACKUP_DIR/<date>, keeps BACKUP_RETENTION_DAYS daily dumps, and (when
 * configured) uploads the archive to a cloud destination.
 *
 * Cloud upload backends (set exactly one):
 *   - AWS S3:  BACKUP_S3_BUCKET (uses AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY,
 *              region from AWS_REGION or default)
 *   - GCS:     BACKUP_GCS_BUCKET (uses GOOGLE_APPLICATION_CREDENTIALS)
 *
 * Without a cloud bucket it simply keeps local rotated copies — still far
 * better than nothing.
 *
 * Usage (cron, daily):
 *   0 3 * * * node backend/scripts/db-backup.js >> /var/log/genz-db-backup.log 2>&1
 *
 * Env:
 *   MONGODB_URI            connection string (defaults to .env)
 *   BACKUP_DIR             local destination (default ./backups)
 *   BACKUP_RETENTION_DAYS  how many daily dumps to keep (default 7)
 *   BACKUP_S3_BUCKET       optional S3 bucket name
 *   BACKUP_GCS_BUCKET      optional GCS bucket name
 */
require('dotenv').config();
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '..', 'backups');
const RETENTION_DAYS = Math.max(1, parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 7);
const S3_BUCKET = process.env.BACKUP_S3_BUCKET || '';
const GCS_BUCKET = process.env.BACKUP_GCS_BUCKET || '';

const log = (...args) => console.log(new Date().toISOString(), ...args);

async function run() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is required (set it in .env or the environment)');
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  const dumpDir = path.join(BACKUP_DIR, dateStamp);
  const archive = path.join(BACKUP_DIR, `genz-mongo-${dateStamp}.tar.gz`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  log(`Dumping MongoDB -> ${dumpDir}`);
  // mongodump accepts both mongodb:// and mongodb+srv:// URIs directly.
  execFileSync('mongodump', [
    '--uri', MONGODB_URI,
    '--out', dumpDir,
    '--gzip'
  ], { stdio: 'inherit' });

  // Archive for single-file cloud upload / easy restore.
  log(`Archiving -> ${archive}`);
  const tar = execFileSync('tar', ['-czf', archive, '-C', dumpDir, '.'], { encoding: 'buffer' });

  // Cloud copy (optional).
  if (S3_BUCKET) {
    log(`Uploading to s3://${S3_BUCKET}/${path.basename(archive)}`);
    execFileSync('aws', ['s3', 'cp', archive, `s3://${S3_BUCKET}/${path.basename(archive)}`], { stdio: 'inherit' });
  }
  if (GCS_BUCKET) {
    log(`Uploading to gs://${GCS_BUCKET}/${path.basename(archive)}`);
    execFileSync('gsutil', ['cp', archive, `gs://${GCS_BUCKET}/${path.basename(archive)}`], { stdio: 'inherit' });
  }

  // Rotation: delete dumps older than RETENTION_DAYS.
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const entry of fs.readdirSync(BACKUP_DIR)) {
    const full = path.join(BACKUP_DIR, entry);
    const st = fs.statSync(full);
    if (st.mtimeMs < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
      removed++;
    }
  }
  log(`Backup complete. Retained ${RETENTION_DAYS}d, removed ${removed} old entr${removed === 1 ? 'y' : 'ies'}.`);

  // Cleanup the un-archived dump dir (archive is the artifact we keep).
  fs.rmSync(dumpDir, { recursive: true, force: true });
  log('Done.');
}

run().catch((err) => {
  console.error(new Date().toISOString(), 'BACKUP FAILED:', err.message);
  process.exit(1);
});
