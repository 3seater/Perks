#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p deploy/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="deploy/backups/perks-$stamp.dump"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres pg_dump -U perks -d perks -Fc > "$backup.partial"
test -s "$backup.partial"
mv "$backup.partial" "$backup"
printf 'Database backup saved: %s\n' "$backup"
