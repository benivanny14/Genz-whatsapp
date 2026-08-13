# Update Analytics — how the data flows

Anonymous, **opt-in** telemetry for the update banner ("Update available — vX").
Purpose: know whether users actually update when a new release ships, and spot
releases nobody acted on.

## What is collected

Every event is one document in the `appevents` collection (`backend/models/AppEvent.js`):

| Field       | Example        | Notes                                                        |
|-------------|----------------|--------------------------------------------------------------|
| `event`     | `update_shown` | allowlist: `update_shown` · `update_dismissed` · `update_tapped` · `update_reload_tapped` |
| `version`   | `1.1.6`        | the release the banner was about                              |
| `versionCode`| 8             | numeric, for ordering                                          |
| `platform`  | `web` / `apk`  | where the banner was shown                                     |
| `anonId`    | `uuid-…`       | random per-device id (localStorage `genz_anon_id`) — **no phone, no username, no messages** |
| `createdAt` | (auto)         | TTL index — documents are **automatically deleted after 180 days** |

**Nothing is sent until the user opts in**: Settings → Privacy → **Update
Analytics** (`localStorage.genz_update_analytics === '1'`). Same opt-in
pattern as Crash Reporting. The login-page Privacy panel explains what is
collected before the toggle is switched on.

`update_shown` is additionally deduped per version in the browser, so the
metric is *how many devices saw the banner*, not how many page loads.

## Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/telemetry/events` | public (rate-limited) | ingest an event; only allowlisted names accepted, values clamped |
| `GET /api/telemetry/events/uptake?version=1.1.6&sinceHours=48` | public | returns **four integers only** (`shown`, `updated`, `dismissed`) — used by the nightly check and the login footer; no PII |
| `GET /api/admin/app-events` | admin (`superAdminAuth`) | 30-day aggregate: totals per event + per-version table (shown/dismissed/updated) |

The public endpoints leak nothing beyond aggregate counts; the admin endpoint
is protected by the existing admin auth (mounted under `/api/admin`, which
requires the admin JWT).

## Where it shows up

- **Admin dashboard** → Overview → **Update Analytics (server)** panel
  (`frontend/src/pages/AdminDashboard.jsx` → `UpdateEventsPanel`): last-30-day
  totals + per-version table.
- **Login page footer**: when the current release has data, a muted line
  `📊 v1.1.6: 2 updated · 5 shown (last 48h)` appears under the version line
  (aggregate only, only when `shown > 0`).

## Stuck-release alert (nightly)

`.github/workflows/prod-health-nightly.yml` runs nightly (03:15 UTC) and now
includes an **uptake step**: it queries
`/api/telemetry/events/uptake?version=<repo-version>&sinceHours=48` and, if the
release was shown to **≥ 3 devices but none updated**, files a dedicated
**"Users may be stuck on an old version"** issue with the numbers and likely
causes (GitHub asset download failing, keystore/signature mismatch, Play
Protect blocking, banner dismissed everywhere).

It never fails the health check itself — the site can be perfectly healthy
while a release is stuck, so it gets its own issue.

## Testing

- Backend: `backend/tests/telemetryController.unit.test.js` — allowlist
  enforcement, clamping, uptake query, admin summary.
- Frontend: `frontend/src/tests/updateAnalytics.test.js` — opt-in gate,
  dedupe, beacon payload, anon id stability.

## Reading the data (ad-hoc)

```bash
# totals per event, last 30 days (admin JWT required)
curl -H "Authorization: Bearer <admin-jwt>" \
  https://genz-whatsapp.onrender.com/api/admin/app-events

# uptake for one version (public)
curl "https://genz-whatsapp.onrender.com/api/telemetry/events/uptake?version=1.1.6&sinceHours=48"

# or directly in MongoDB
db.appevents.aggregate([{ $group: { _id: '$event', count: { $sum: 1 } } }])
```

> **Note on the free tier:** the instances sleep when idle, so a single-shot
> check can see a cold start. The nightly verifies against the API host
> (`genz-whatsapp.onrender.com`, where MongoDB lives) with retries/backoff —
> the UI host's `/api/health` was the source of a false-positive alert and is
> intentionally not used for health checks anymore.
