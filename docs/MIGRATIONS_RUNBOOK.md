# Migration Runbook (production)

**Kwa Kiswahili:** migrations haziendeshwi na Render wala CI — `npm start` inaanzisha
server tu. Zinapaswa kuendeshwa kwa mkono kwa mpangilio **003 → 004 → 005**, na
kabla ya kila moja: backup, `--dry-run`, kisha apply, kisha kuthibitisha. Scripts
za dev (seeders/backfills) zinasikataa database isiyo ya local bila `--allow-remote`.

Why this exists: the Channels removal changed stored data (abuse-report content
types), and the earlier migrations clean up status documents. None of them run
automatically, so production needs an explicit, ordered, verified run.

---

## 1. What runs automatically (and what does not)

| Thing | Runs on deploy? |
| --- | --- |
| `backend/migrations/*.js` | **Only through the boot hook below** — nothing scans the folder. The individual files never run by themselves. |
| Boot hook (`MIGRATIONS_ON_BOOT`) | **Yes, by default.** `server.js` applies pending migrations right after it connects to MongoDB (see §5a). Set `MIGRATIONS_ON_BOOT=false` to opt out. |
| `GET /api/health` / `GET /api/health/migrations` | **Yes.** Both report `pendingCount` / `pendingIds` / `lastAppliedAt`, so a missed migration is visible to monitoring. |
| `backend/scripts/*` (seeders, backfills, cleanup) | **No.** Manual, local-only by default. |
| CI / deploy workflow | Tests + build only. `deploy.yml` runs the fast backend suite (`npm run test:ci`), the frontend build, and a **migration gate**; the `migrations` job in `ci.yml` runs every migration **up and down** against a throwaway MongoDB container (`tests/migrationsRoundtrip.integration.test.js`) plus the two documented `--dry-run` commands. A migration that crashes, silently no-ops or cannot be reverted therefore fails CI (and blocks the deploy) instead of being discovered in production. |

So a deploy does **not** migrate anything. If a migration matters, it has to be
run against production by hand, in the order below.

## 2. Migration inventory

| # | File | What it does | Dry-run | Reversible |
| --- | --- | --- | --- | --- |
| 003 | `migrations/003_status_text_search_indexes.js` | Adds the Status text index + compound indexes (`isRevoked+userId`, `archived+userId`, `isScheduled+scheduledAt`). Skips indexes that already exist. | ✗ (idempotent anyway) | `node migrations/003_…js down` drops them |
| 004 | `migrations/004_unset_empty_status_poll.js` | Unsets empty `poll` sub-documents that Mongoose nested-path defaults created. | `--dry-run` | Intentionally irreversible (documented no-op `down`) — the removed object holds no data |
| 005 | `migrations/005_channel_abuse_reports_to_other.js` | Rewrites abuse reports with `contentType: 'channel' \| 'channel_post'` to `'other'`, keeping the original value in `metadata.legacyContentType`. | `--dry-run` | `node migrations/005_…js down` restores from the metadata marker |

Deploy order for the Channels removal: run **005 before** (or at the same time
as) the code revision that dropped `channel`/`channel_post` from the
`AbuseReport` enum. The old code could still write those values; the new enum
rejects them, so migrating first means no window where a report can be filed in
a shape the new code refuses.

## 3. Before you touch production

1. **Get the production URI** from Render (`Dashboard → genz-whatsapp →
   Environment → MONGODB_URI`). Keep it in the shell session only — never in a
   file, a commit or a chat message.
2. **Take a backup.** Either an Atlas snapshot (Cloud → Backup → Take snapshot)
   or a local dump:
   ```bash
   mongodump --uri "$MONGODB_URI" --gzip \
     --archive="migration-backup-$(date +%Y%m%d-%H%M).archive"
   ```
   Confirm the archive is non-empty before continuing.
3. **Check current load.** 003 creates indexes and 004/005 only rewrite a small
   number of documents, so no maintenance window is required, but check that no
   incident is in progress.
4. **Know how to roll back the code:** the deploy workflow pushes `main`; keep
   the previous Render deploy ID handy (Dashboard → Events → previous deploy →
   “Redeploy”).

## 4. Run order

### Recommended: the ordered runner

`scripts/run-migrations.js` runs every known migration in order, **dry-run by
default**, and records what it applied in the `migrationrecords` collection so
the next run knows what is already done.

```bash
export MONGODB_URI='<production uri>'   # this shell session only
cd backend

# 1. Preview: nothing is written, not even the bookkeeping collection.
npm run migrate

# 2. Review the printed findings, then apply. Stops at the first failure.
#    (Add --allow-remote because production is not on localhost.)
npm run migrate:apply -- --allow-remote

# 3. Confirm what this database has applied.
npm run migrate:status

unset MONGODB_URI
```

Notes:

- `--apply` skips migrations already recorded; `--force` re-runs them anyway.
- Migrations 001 / `add_status_features` are older, have no `--dry-run`, and are
  skipped unless you pass `--include-legacy`.
- The runner refuses a non-local database without `--allow-remote`.
- Every migration still prints what it found (`📋`) and changed (`✅`) and exits
  non-zero on failure — the runner stops at the first non-zero exit.

### Or run them one by one

```bash
cd backend
export MONGODB_URI='<production uri>'   # this shell session only

# 1. Indexes (idempotent, safe to re-run)
node migrations/003_status_text_search_indexes.js

# 2. Empty polls — preview, then apply
node migrations/004_unset_empty_status_poll.js --dry-run
node migrations/004_unset_empty_status_poll.js

# 3. Channels content types — preview, then apply
node migrations/005_channel_abuse_reports_to_other.js --dry-run
node migrations/005_channel_abuse_reports_to_other.js

unset MONGODB_URI
```

Running them by hand does **not** create the `migrationrecords` rows, so
`npm run migrate:status` will keep reporting them as pending — mention which
ones you ran manually if another operator continues the work.

## 5. Verify after each step

`005` — nothing may be left with a channel content type:
```bash
MONGODB_URI='<uri>' node -e "
const m=require('mongoose');(async()=>{
  await m.connect(process.env.MONGODB_URI);
  const c=m.connection.db.collection('abusereports');
  console.log('legacy channel reports left:',
    await c.countDocuments({contentType:{\$in:['channel','channel_post']}}));
  console.log('rewritten with metadata marker:',
    await c.countDocuments({'metadata.legacyContentType':{\$exists:true}}));
  await m.disconnect();
})();"
```

`004` — statuses holding an empty poll:
```bash
MONGODB_URI='<uri>' node -e "
const m=require('mongoose');(async()=>{
  await m.connect(process.env.MONGODB_URI);
  const c=m.connection.db.collection('status');
  console.log('statuses with any poll field:', await c.countDocuments({poll:{\$exists:true}}));
  console.log('empty polls left:', await c.countDocuments({poll:{\$exists:true},
    'poll.question':{\$in:[null,'']},'poll.options':{\$size:0}}));
  await m.disconnect();
})();"
```

`003` — the migration prints the final index list itself; the text index
`content_text_caption_text` must be present.

Then smoke the running service:
```bash
curl -s https://genz-whatsapp-1.onrender.com/api/health
# migration state on its own — `upToDate: true` and an empty `pendingIds` is
# what a healthy production database looks like
curl -s https://genz-whatsapp-1.onrender.com/api/health/migrations
```
and check Render logs for `Environment validation passed (production)` with no
unhandled rejection stack traces.

## 5a. Boot behaviour (`MIGRATIONS_ON_BOOT`)

Migrations used to be manual-only. They now also run at startup so a deploy
cannot serve a schema the database does not have yet:

| Value | Behaviour |
| --- | --- |
| unset / anything else (`auto`) | Apply every pending migration, then record it. |
| `dry-run` | Report what would change, write nothing. |
| `false` / `off` / `skip` | Do nothing (deploy alone never migrates). |

The boot hook is inert when `NODE_ENV=test`.

What it guarantees:

- **Order + registry:** it reads the same list as `npm run migrate`
  (`config/migrations.js`), so CLI and startup can never disagree.
- **No double runs:** runs are serialised through a lock row (10-minute TTL) in
  `migrationrecords`, because a rolling deploy can boot several instances at
  once. A stale lock (instance killed mid-run) is taken over after the TTL.
- **No repeats:** applied migrations are recorded and skipped on later boots.
- **Never fatal:** a failing migration is logged, is *not* recorded, and the API
  keeps serving. The health endpoint keeps listing it as pending, so the fix is
  the manual route in §4.
- **Slightly late, not early:** the HTTP listener starts before the hook runs, so
  for a few seconds the API can serve while an idempotent, backward-compatible
  migration is finishing. Watch the first `GET /api/health` after a deploy.

## 6. Rollback

| Situation | Action |
| --- | --- |
| 005 rewrote reports you need back as channel types | `node migrations/005_channel_abuse_reports_to_other.js down` (only restores reports that still carry `metadata.legacyContentType`) |
| 003 indexes caused a problem | `node migrations/003_status_text_search_indexes.js down` |
| 004 | Nothing to revert; it only deleted empty poll objects |
| Anything else went wrong | Restore the backup archive (`mongorestore --uri "$MONGODB_URI" --gzip --archive=<file> --drop`) and redeploy the previous Render deploy |

A rollback of the data does not roll back the bookkeeping: delete the matching
`migrationrecords` row (or the whole collection) so the next `npm run migrate`
re-runs the migration you reverted.

```bash
MONGODB_URI='<uri>' node -e "
const m=require('mongoose');(async()=>{
  await m.connect(process.env.MONGODB_URI);
  const r=await m.connection.db.collection('migrationrecords').deleteOne({id:'005_channel_abuse_reports_to_other'});
  console.log('records removed:', r.deletedCount);
  await m.disconnect();
})();"
```

## 7. Dev-only vs production tooling

**Never point these at production** — local/dev tooling, all guarded by a
non-local host check (`--allow-remote` is the only override, and it should not be
needed in production):

- `scripts/seed-test-data.js`, `scripts/seed-all-test-data.js` — fake users,
  statuses, conversations and messages.
- `scripts/restore-seed-statuses.js` — marketing copy statuses.
- `scripts/backfill-seed-schema-defaults.js` — repairs dev seed data written by
  old raw-driver seeders. Production data never needs it.
- `scripts/cleanup-stray-statuses-collection.js` — drops a collection that only
  ever existed in dev databases.
- `scripts/create-test-user.js` — creates a test account with a known password.

**Legitimate for production** — the destructive ones still require
`--allow-remote` or an explicit credential:

- `scripts/run-migrations.js` (`npm run migrate`, `migrate:apply`, `migrate:status`)
  — the sanctioned way to run the migrations above in order.
- `scripts/reset-password.cjs --username=<name> --password=<new password>` —
  account recovery; credentials come from flags/env, never the repository.
- `scripts/verify-seed-visible.js` — read-only, but only useful where seed data
  exists, so normally local.

## 8. Post-deploy checklist

- [ ] `GET /api/health` → 200
- [ ] `GET /api/health/migrations` → `upToDate: true`, `pendingIds: []` (alert on
      `pendingCount > 0` if you have uptime monitoring)
- [ ] Log in on the web app, confirm chat list loads (messages visible, not empty)
- [ ] Status tab shows the statuses users posted today
- [ ] `/api/channels` → 404 (the removed feature is still gone)
- [ ] Admin → Reports loads, and no report shows a blank content type
- [ ] Run `npm run migrate` again later: it must report nothing left to do,
      proving no migration was silently skipped or reintroduced data
