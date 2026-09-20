# Genora dev deployment

This is an isolated dev deployment for `dev.genora.art`.

- It uses a new PostgreSQL volume and never clones production data.
- The only initial database record is the administrator supplied at deploy time.
- Secrets belong in `infra/genora-dev/.env` on the server and must not be committed.
- `NEXT_PUBLIC_STAGING=1` keeps the site out of search engines; analytics is disabled until a new property is explicitly enabled.

## Database backups

The dev PostgreSQL database is backed up daily at 02:30 UTC to
`/srv/backups/genora-art-dev` on the same HOSTKEY VPS in Helsinki, Finland.
Only completed, catalog-verified custom-format dumps are retained for up to 30 days;
older dumps are removed by the backup job. Files and directory are root-only.
This local backup does not protect against loss of the entire VPS. Set up a
separately approved off-site destination before claiming disaster recovery.

Install the two `genora-dev-db-backup.*` units in `/etc/systemd/system/`, run
`systemctl daemon-reload`, enable the timer, and run the service once. A
successful `pg_restore -l` checks the archive catalog, not a full restore;
periodically test a full restore in an isolated database.
