#!/usr/bin/env bash
# Создаёт изолированное prod-окружение из общей конфигурации dev, но с новой БД и внутренними секретами.
set -euo pipefail

SOURCE_ENV="${SOURCE_ENV:-/srv/apps/genora-art-dev/infra/genora-dev/.env}"
DEST_ENV="${DEST_ENV:-/srv/apps/genora-art/infra/production/.env}"

test -f "$SOURCE_ENV"
mkdir -p "$(dirname "$DEST_ENV")"

if [ -f "$DEST_ENV" ]; then
  echo "==> production .env уже существует, не перезаписываем"
  exit 0
fi

python3 - "$SOURCE_ENV" "$DEST_ENV" <<'PY'
from pathlib import Path
import secrets
import sys

source, destination = Path(sys.argv[1]), Path(sys.argv[2])
values = {}
order = []
for raw in source.read_text().splitlines():
    if not raw or raw.lstrip().startswith("#") or "=" not in raw:
        continue
    key, value = raw.split("=", 1)
    if key not in values:
        order.append(key)
    values[key] = value

database_password = secrets.token_urlsafe(32)
values.update({
    "POSTGRES_PASSWORD": database_password,
    "DATABASE_URL": f"postgresql://genora:{database_password}@postgres:5432/genora_prod",
    "APP_BASE_URL": "https://genora.art",
    "APP_ORIGIN": "https://genora.art,https://www.genora.art,https://admin.genora.art",
    "ADMIN_PUBLIC_ORIGIN": "https://admin.genora.art",
    "SESSION_COOKIE_NAME": "genora_prod_session",
    "ADMIN_COOKIE_NAME": "genora_prod_admin",
    "COOKIE_PATH": "/",
    "NEXT_PUBLIC_APP_ORIGIN": "https://genora.art",
    "NEXT_PUBLIC_STAGING": "",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID": "G-D07763XPWC",
    "TURNSTILE_ALLOWED_HOSTNAME": "genora.art",
    "PREVIEW_COOKIE_DOMAIN": "",
    "PREVIEW_COOKIE_SECRET": secrets.token_urlsafe(48),
    "SUPPORT_WORKER_SECRET": secrets.token_urlsafe(48),
})

for key in values:
    if key not in order:
        order.append(key)

destination.write_text("".join(f"{key}={values[key]}\n" for key in order))
destination.chmod(0o600)
PY

echo "==> создано изолированное production-окружение"
