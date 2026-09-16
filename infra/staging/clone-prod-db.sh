#!/usr/bin/env bash
# Копирует данные с боевой базы Genora.art в отдельную базу копии.
# Боевые контейнеры и том не меняет.
set -euo pipefail

PROD_CONTAINER="${PROD_CONTAINER:-genora-postgres}"
DEV_CONTAINER="${DEV_CONTAINER:-genora-dev-postgres}"
PROD_DB="${PROD_DB:-genora}"
PROD_USER="${PROD_USER:-genora}"
DEV_DB="${DEV_DB:-genora_dev}"
DEV_USER="${DEV_USER:-genora}"

if ! docker inspect "$PROD_CONTAINER" >/dev/null 2>&1; then
  echo "Нет боевого контейнера $PROD_CONTAINER" >&2
  exit 1
fi
if ! docker inspect "$DEV_CONTAINER" >/dev/null 2>&1; then
  echo "Нет контейнера копии $DEV_CONTAINER" >&2
  exit 1
fi

echo "==> снимаем копию с $PROD_CONTAINER/$PROD_DB"
docker exec "$PROD_CONTAINER" pg_dump -U "$PROD_USER" -Fc -d "$PROD_DB" > /tmp/genora-prod.dump
echo "==> заливаем в $DEV_CONTAINER/$DEV_DB"
docker cp /tmp/genora-prod.dump "$DEV_CONTAINER":/tmp/genora-prod.dump
set +e
docker exec "$DEV_CONTAINER" pg_restore -U "$DEV_USER" -d "$DEV_DB" --clean --if-exists --no-owner --no-acl /tmp/genora-prod.dump
status=$?
set -e
docker exec "$DEV_CONTAINER" rm -f /tmp/genora-prod.dump
rm -f /tmp/genora-prod.dump
if [ "$status" -gt 1 ]; then
  echo "pg_restore завершился с ошибкой $status" >&2
  exit "$status"
fi
echo "==> данные копии обновлены"
