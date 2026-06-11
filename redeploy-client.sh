#!/usr/bin/env bash
#
# Rebuild the LibreChat client and restart the backend so it serves the
# fresh bundle. The backend caches index.html in memory at startup, so a
# client rebuild alone is NOT enough — it must be restarted or it keeps
# serving the old shell (which references deleted asset hashes → white screen).
#
# Usage:  ./redeploy-client.sh
#
set -euo pipefail

REPO="/Users/ajay/Documents/Librechat"
NODE_BIN="/opt/homebrew/opt/node@24/bin"
LABEL="com.librechat.backend"
URL="http://localhost:3080/"

export PATH="$NODE_BIN:$PATH"

echo "▶ Building client (Node $(node -v))…"
cd "$REPO/client"
npm run build

echo "▶ Restarting backend service ($LABEL)…"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

echo "▶ Waiting for backend to come back up…"
code="000"
for _ in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$URL" || true)"
  [ "$code" = "200" ] && break
  sleep 1
done

disk_entry="$(grep -oE '/assets/index\.[^"]+\.js' "$REPO/client/dist/index.html" | head -1)"
srv_entry="$(curl -s "$URL" | grep -oE '/assets/index\.[^"]+\.js' | head -1)"

echo "  HTTP status : $code"
echo "  disk entry  : $disk_entry"
echo "  server entry: $srv_entry"

if [ "$code" = "200" ] && [ -n "$disk_entry" ] && [ "$disk_entry" = "$srv_entry" ]; then
  echo "✅ Redeploy complete — backend is serving the fresh bundle."
  echo "   Hard-refresh the browser (⌘⇧R) to pick it up."
else
  echo "⚠️  Something is off — server entry does not match disk (or backend not 200)."
  echo "   Check the log:  tail -f ~/Library/Logs/lc-backend.log"
  exit 1
fi
