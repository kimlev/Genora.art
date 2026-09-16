#!/usr/bin/env bash
# Отдельный сертификат только для копии. Боевой сертификат не трогает.
set -euo pipefail

for name in dev.genora.art dev.admin.genora.art; do
  ip="$(dig +short "$name" A | tail -n 1)"
  if [ "$ip" != "66.29.130.39" ]; then
    echo "DNS $name ещё не указывает на 66.29.130.39 (сейчас: ${ip:-пусто})" >&2
    exit 1
  fi
done

certbot certonly --webroot -w /var/www/genora --agree-tos --non-interactive \
  --cert-name genora-dev \
  -d dev.genora.art \
  -d dev.admin.genora.art

bash /srv/apps/genora-art-dev/infra/staging/apply-dev-nginx.sh /srv/apps/genora-art-dev
echo "==> сертификат копии выпущен"
