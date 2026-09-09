#!/usr/bin/env bash
OUT=.ci-report3.txt
rm -f "$OUT"
for i in $(seq 1 90); do
  curl -s -m 20 "https://r.jina.ai/https://api.github.com/repos/benivanny14/Genz-whatsapp/actions/runs/34240336069/jobs" 2>/dev/null > .ci3.json
  SZ=$(stat -c%s .ci3.json 2>/dev/null || echo 0)
  if [ "$SZ" -gt 1000 ]; then
    echo "=== $(date -u +%H:%M:%S) ===" >> "$OUT"
    python - <<'PY' >> "$OUT" 2>&1
import json
txt = open('.ci3.json', encoding='utf-8', errors='replace').read()
start = txt.index('{')
d = json.loads(txt[start:])
for j in d.get('jobs', []):
    if j['name'] == 'E2E (Playwright)':
        print('E2E:', j['status'], j.get('conclusion'))
PY
    if grep -q "E2E: completed" "$OUT"; then break; fi
  fi
  sleep 150
done
