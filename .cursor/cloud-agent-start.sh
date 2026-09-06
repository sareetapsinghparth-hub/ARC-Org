#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  echo "ARC dev server already running on port 3000"
  exit 0
fi

nohup npm run dev > /tmp/arc-dev-server.log 2>&1 &
echo $! > /tmp/arc-dev-server.pid

for _ in $(seq 1 45); do
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "ARC dev server ready at http://127.0.0.1:3000"
    exit 0
  fi
  sleep 1
done

echo "ARC dev server failed to become ready; see /tmp/arc-dev-server.log" >&2
tail -20 /tmp/arc-dev-server.log >&2 || true
exit 1
