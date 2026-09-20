#!/usr/bin/env bash
set -euo pipefail

backup_dir=/srv/backups/genora-art-prod
container=genora-prod-postgres

umask 077
install -d -m 0700 "$backup_dir"
test ! -L "$backup_dir"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_dir/genora-prod-$stamp.dump"
temp_file=$(mktemp "$backup_dir/.genora-prod-$stamp.XXXXXXXX")
trap 'rm -f -- "$temp_file"' EXIT

docker exec "$container" pg_dump -U genora -d genora_prod -Fc > "$temp_file"
test -s "$temp_file"
docker exec -i "$container" pg_restore -l < "$temp_file" > /dev/null
mv -n -- "$temp_file" "$backup_file"
trap - EXIT

python3 /srv/apps/genora-art/infra/genora-dev/offload-postgres.py prod "$backup_file"
