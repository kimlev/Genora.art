#!/usr/bin/env bash
# Отдельный сертификат только для копии. Боевой сертификат не трогает.
set -euo pipefail

for name in dev.genora.art dev.admin.genora.art; do
  if ! getent ahostsv4 "$name" | grep -q .; then
    echo "DNS $name ещё не опубликован" >&2
    exit 1
  fi
done

mkdir -p /var/www/genora/.well-known/acme-challenge
bash /srv/apps/genora-art-dev/infra/staging/apply-dev-nginx.sh /srv/apps/genora-art-dev

certbot certonly --webroot -w /var/www/genora --agree-tos --non-interactive \
  --cert-name genora-dev \
  -d dev.genora.art \
  -d dev.admin.genora.art

bash /srv/apps/genora-art-dev/infra/staging/apply-dev-nginx.sh /srv/apps/genora-art-dev
echo "==> сертификат копии выпущен"
