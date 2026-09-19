const mongoose = require('mongoose');

/**
 * One row per migration that `scripts/run-migrations.js --apply` has run against
 * a database. Migrations here are manual (nothing runs them on deploy), so this
 * collection is the only durable answer to "which migrations has this database
 * already seen?" — `npm run migrate:status` reads it.
 *
 * Failures are NOT recorded: a migration only gets a row once it exited 0.
 */
const migrationRecordSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    // Tail of the migration's stdout, trimmed — enough context to see what it
    // actually reported (e.g. "Rewrote 2 report(s)") without storing everything.
    output: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('MigrationRecord', migrationRecordSchema);
