#!/usr/bin/env bash
set -euo pipefail

backup_dir=/srv/backups/genora-art-dev
container=genora-dev-postgres
# Daily rotation at 29 days ensures removal before a copy reaches 30 days.
retention_minutes=41759

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

# Remove only this job's completed dumps during the 29- to 30-day window.
find "$backup_dir" -maxdepth 1 -type f -name 'genora-dev-*.dump' -mmin +"$retention_minutes" -delete
printf 'Genora dev backup verified: %s (%s bytes)\n' "$backup_file" "$(stat -c %s "$backup_file")"
