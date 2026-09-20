#!/usr/bin/env bash
set -euo pipefail

backup_dir=/srv/backups/genora-art-dev
container=genora-dev-postgres

umask 077
install -d -m 0700 "$backup_dir"
test ! -L "$backup_dir"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_dir/genora-dev-$stamp.dump"
temp_file=$(mktemp "$backup_dir/.genora-dev-$stamp.XXXXXXXX")
trap 'rm -f -- "$temp_file"' EXIT

docker exec "$container" pg_dump -U genora -d genora_dev -Fc > "$temp_file"
test -s "$temp_file"
docker exec -i "$container" pg_restore -l < "$temp_file" > /dev/null
mv -n -- "$temp_file" "$backup_file"
trap - EXIT

python3 /srv/apps/genora-art-dev/infra/genora-dev/offload-postgres.py dev "$backup_file"
