#!/usr/bin/env bash
# Собирает .env копии из боевого, не печатая секреты.
set -euo pipefail

PROD_ENV="${PROD_ENV:-/srv/apps/genora-art/infra/production/.env}"
DEST_ENV="${DEST_ENV:-/srv/apps/genora-art-dev/infra/staging/.env}"

test -f "$PROD_ENV"
mkdir -p "$(dirname "$DEST_ENV")"

if [ -f "$DEST_ENV" ]; then
  echo "==> $DEST_ENV уже есть, не перезаписываем"
  exit 0
fi

python3 - "$PROD_ENV" "$DEST_ENV" <<'PY'
from pathlib import Path
import secrets
import sys
from urllib.parse import urlparse, urlunparse

src, dest = Path(sys.argv[1]), Path(sys.argv[2])
password = secrets.token_hex(16)
values = {}
for raw in src.read_text().splitlines():
    if not raw or raw.lstrip().startswith("#") or "=" not in raw:
        continue
    key, value = raw.split("=", 1)
    values[key] = value

database = values.get("DATABASE_URL", "")
parsed = urlparse(database)
if parsed.scheme.startswith("postgres"):
    host = "postgres"
    user = parsed.username or "genora"
    database_url = urlunparse(parsed._replace(
        netloc=f"{user}:{password}@{host}:5432",
        path="/genora_dev",
    ))
else:
    database_url = f"postgresql://genora:{password}@postgres:5432/genora_dev"

values["DATABASE_URL"] = database_url
values["POSTGRES_PASSWORD"] = password
values["APP_BASE_URL"] = "https://dev.genora.art"
values["APP_ORIGIN"] = "https://dev.genora.art,https://dev.admin.genora.art"
values["ADMIN_PUBLIC_ORIGIN"] = "https://dev.admin.genora.art"
values["SESSION_COOKIE_NAME"] = "genora_dev_session"
values["ADMIN_COOKIE_NAME"] = "genora_dev_admin"
values["COOKIE_PATH"] = "/"
values["NEXT_PUBLIC_APP_ORIGIN"] = "https://dev.genora.art"
values["NEXT_PUBLIC_STAGING"] = "1"
values["IMAP_HOST"] = ""
values["IMAP_USER"] = ""
values["IMAP_PASSWORD"] = ""

lines = [f"{key}={value}" for key, value in values.items()]
dest.write_text("\n".join(lines) + "\n")
dest.chmod(0o600)
PY

echo "==> создан .env копии"
