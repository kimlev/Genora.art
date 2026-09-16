#!/usr/bin/env bash
# Обновляет адреса копии на поддомены. Секреты не печатает.
set -euo pipefail

DEST_ENV="${DEST_ENV:-/srv/apps/genora-art-dev/infra/staging/.env}"
test -f "$DEST_ENV"

python3 - "$DEST_ENV" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
values = {}
order = []
for raw in path.read_text().splitlines():
    if not raw or raw.lstrip().startswith("#") or "=" not in raw:
        continue
    key, value = raw.split("=", 1)
    if key not in values:
        order.append(key)
    values[key] = value

values["APP_BASE_URL"] = "https://dev.genora.art"
values["APP_ORIGIN"] = "https://dev.genora.art,https://dev.admin.genora.art"
values["ADMIN_PUBLIC_ORIGIN"] = "https://dev.admin.genora.art"
values["SESSION_COOKIE_NAME"] = "genora_dev_session"
values["ADMIN_COOKIE_NAME"] = "genora_dev_admin"
values["COOKIE_PATH"] = "/"
values["NEXT_PUBLIC_APP_ORIGIN"] = "https://dev.genora.art"
values["NEXT_PUBLIC_STAGING"] = "1"
values["TURNSTILE_ALLOWED_HOSTNAME"] = "dev.genora.art"
values["PREVIEW_COOKIE_DOMAIN"] = ""
values["IMAP_HOST"] = ""
values["IMAP_USER"] = ""
values["IMAP_PASSWORD"] = ""
values.pop("NEXT_PUBLIC_BASE_PATH", None)

for key in (
    "APP_BASE_URL", "APP_ORIGIN", "ADMIN_PUBLIC_ORIGIN", "SESSION_COOKIE_NAME",
    "ADMIN_COOKIE_NAME", "COOKIE_PATH", "NEXT_PUBLIC_APP_ORIGIN", "NEXT_PUBLIC_STAGING",
    "TURNSTILE_ALLOWED_HOSTNAME", "PREVIEW_COOKIE_DOMAIN",
):
    if key not in order:
        order.append(key)

path.write_text("".join(f"{key}={values[key]}\n" for key in order if key in values))
path.chmod(0o600)
PY

echo "==> адреса копии переведены на dev.genora.art"
