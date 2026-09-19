/**
 * The one list of known migrations, in application order.
 *
 * Both the CLI (`scripts/run-migrations.js` / `npm run migrate`) and the boot
 * runner (`services/migrationRunner.js`) read this, so the two can never
 * disagree about what exists, what runs first, or which migration supports
 * `--dry-run`.
 *
 * Adding a migration: create `migrations/00X_<name>.js` that is safe to re-run,
 * support `--dry-run` when it mutates data, support `down` when a rollback is
 * possible, then add an entry here (and to docs/MIGRATIONS_RUNBOOK.md).
 */
const MIGRATIONS = [
  {
    id: '003_status_text_search_indexes',
    file: 'migrations/003_status_text_search_indexes.js',
    description: 'Status text search + compound indexes',
    supportsDryRun: false,
    reversible: true,
    legacy: false,
  },
  {
    id: '004_unset_empty_status_poll',
    file: 'migrations/004_unset_empty_status_poll.js',
    description: 'Unset empty Status.poll sub-documents',
    supportsDryRun: true,
    reversible: false,
    legacy: false,
  },
  {
    id: '005_channel_abuse_reports_to_other',
    file: 'migrations/005_channel_abuse_reports_to_other.js',
    description: 'Rewrite legacy channel abuse reports to "other"',
    supportsDryRun: true,
    reversible: true,
    legacy: false,
  },
  {
    id: '001_status_updates',
    file: 'scripts/migrations/001_status_updates.js',
    description: 'Backfill legacy Status field defaults',
    supportsDryRun: false,
    reversible: false,
    legacy: true,
  },
  {
    id: 'add_status_features',
    file: 'migrations/add_status_features.js',
    description: 'Add extended Status/User feature fields',
    supportsDryRun: false,
    reversible: false,
    legacy: true,
  },
];

// Collection the runner records successes in (models/MigrationRecord.js).
const MIGRATION_RECORDS_COLLECTION = 'migrationrecords';

// Distributed lock id inside the same collection: several instances can boot at
// once (Render rolling deploys), and migrations must not run twice concurrently.
const MIGRATION_LOCK_ID = '__lock__';
const MIGRATION_LOCK_TTL_MS = 10 * 60 * 1000;

const selectMigrations = ({ includeLegacy = false } = {}) =>
  MIGRATIONS.filter((migration) => includeLegacy || !migration.legacy);

module.exports = {
  MIGRATIONS,
  MIGRATION_RECORDS_COLLECTION,
  MIGRATION_LOCK_ID,
  MIGRATION_LOCK_TTL_MS,
  selectMigrations,
};
