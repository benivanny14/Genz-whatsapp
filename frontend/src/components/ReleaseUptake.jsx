import React, { useEffect, useState } from 'react';
import { fetchVersionManifest } from '../utils/versionManifest';

/**
 * Aggregate release uptake (opt-in analytics) — a single muted line like
 * "📊 v1.1.8: 2 updated · 5 shown — masaa 48 ya mwisho (last 48h)".
 *
 * Renders nothing until the current release actually has data (shown > 0),
 * so pages show no empty footer while the feature is opt-in and unused.
 * Shared by the login page and the install guide.
 */
const ReleaseUptake = ({ className = 'mt-1 text-center text-[10px] text-slate-600' }) => {
  const [line, setLine] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchVersionManifest()
      .then((data) => {
        if (!data?.version) return null;
        return fetch(
          `/api/telemetry/events/uptake?version=${encodeURIComponent(data.version)}&sinceHours=48`
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((u) => (u?.success && u.shown > 0 ? u : null));
      })
      .then((u) => {
        if (cancelled || !u) return;
        setLine(`📊 v${u.version}: ${u.updated} updated · ${u.shown} shown — masaa 48 ya mwisho (last 48h)`);
      })
      .catch(() => {}); // graceful: footer simply won't show
    return () => {
      cancelled = true;
    };
  }, []);

  if (!line) return null;
  return <p className={className}>{line}</p>;
};

export default ReleaseUptake;
