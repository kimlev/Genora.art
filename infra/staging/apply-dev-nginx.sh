#!/usr/bin/env bash
# Только хосты копии. Боевой сайт не трогает и не создаёт genora.art/dev.
set -euo pipefail

ROOT="${1:-/srv/apps/genora-art-dev}"
HTTP_SRC="$ROOT/infra/staging/nginx-dev-http.conf"
HOSTS_SRC="$ROOT/infra/staging/nginx-dev-hosts.conf"
SITE_DEST=/etc/nginx/sites-available/genora-dev.conf
SNIPPET_DEST=/etc/nginx/snippets/genora-dev.conf

test -f "$HTTP_SRC"
test -f "$HOSTS_SRC"

if [ -f /etc/letsencrypt/live/genora-dev/fullchain.pem ]; then
  cp "$HOSTS_SRC" "$SITE_DEST"
else
  cp "$HTTP_SRC" "$SITE_DEST"
fi
ln -sfn "$SITE_DEST" /etc/nginx/sites-enabled/genora-dev.conf

rm -f "$SNIPPET_DEST"
python3 - <<'PY'
from pathlib import Path
import re

needle = re.compile(r"\n[ \t]*include /etc/nginx/snippets/genora-dev\.conf;\n?")
for folder in (Path("/etc/nginx/sites-enabled"), Path("/etc/nginx/conf.d")):
    if not folder.is_dir():
        continue
    for path in folder.iterdir():
        if not path.is_file():
            continue
        text = path.read_text()
        if "snippets/genora-dev.conf" not in text:
            continue
        path.write_text(needle.sub("\n", text, count=1))
PY

nginx -t
systemctl reload nginx
echo "==> nginx: копия на dev.genora.art, адреса /dev на боевом сайте нет"
