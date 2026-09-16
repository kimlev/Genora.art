#!/usr/bin/env bash
# Выкатывает ветку dev на копию https://dev.genora.art
# Боевые контейнеры genora-app и genora-postgres не трогает.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="genora-prod"
REMOTE="/srv/apps/genora-art-dev"

echo "==> rsync → $HOST:$REMOTE"
ssh "$HOST" "mkdir -p '$REMOTE'"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.gitnexus' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.env' \
  --exclude 'prototype/.next' \
  --exclude 'infra/staging/.env' \
  --exclude 'infra/production/.env' \
  "$ROOT/" "$HOST:$REMOTE/"

echo "==> поднимаем копию на сервере"
ssh "$HOST" "bash -s" <<'EOF'
set -euo pipefail
cd /srv/apps/genora-art-dev
bash infra/staging/prepare-env.sh
bash infra/staging/update-env.sh
bash infra/staging/apply-dev-nginx.sh /srv/apps/genora-art-dev
cd /srv/apps/genora-art-dev/infra/staging
docker compose up -d postgres
for attempt in $(seq 1 30); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' genora-dev-postgres 2>/dev/null || true)"
  if [ "$status" = healthy ]; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    docker compose logs --tail=80 postgres
    exit 1
  fi
  sleep 2
done
if ! docker exec genora-dev-postgres psql -U genora -d genora_dev -tAc "SELECT to_regclass('public.users')" | grep -q users; then
  bash /srv/apps/genora-art-dev/infra/staging/clone-prod-db.sh
fi
docker compose up -d --build app support-worker
for attempt in $(seq 1 40); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' genora-dev-app 2>/dev/null || true)"
  if [ "$status" = healthy ]; then
    break
  fi
  if [ "$attempt" -eq 40 ]; then
    docker compose ps
    docker compose logs --tail=120 app
    exit 1
  fi
  sleep 5
done
docker compose ps
EOF

echo "==> копия: https://dev.genora.art"
