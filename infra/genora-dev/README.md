# Genora dev deployment

This is an isolated dev deployment for `dev.genora.art`.

- It uses a new PostgreSQL volume and never clones production data.
- The only initial database record is the administrator supplied at deploy time.
- Secrets belong in `infra/genora-dev/.env` on the server and must not be committed.
- `NEXT_PUBLIC_STAGING=1` keeps the site out of search engines; analytics is disabled until a new property is explicitly enabled.

## Database backups

The dev PostgreSQL database is backed up daily at 02:30 UTC. A root-only
temporary dump in `/srv/backups/genora-art-dev` is checked with `pg_restore -l`,
encrypted with a Genora-only AES-256-GCM key, uploaded into the separate
`bce1ad038-genora-art-dev-backups` bucket under `genora/dev/backups/` at
HOSTKEY's Netherlands cold S3 endpoint, downloaded and verified by decryption
and SHA-256, then removed from
the VPS. Remote copies rotate in a 29- to 30-day window. If upload or
verification fails, the local dump is retained for recovery and the job fails.
The existing HOSTKEY S3 account also contains Blogoro backups. Its account
credentials can access both buckets; this shared-access trade-off was explicitly
approved by the owner. Never reuse Blogoro's encryption key: Genora generates
its own key on the Genora server. No S3 operation in these scripts targets the
Blogoro bucket. Production uses a distinct `genora/prod/` prefix and must have
its own encryption key and schedule when that environment is deployed.
The Genora encryption key is escrowed in `genora/recovery/dev-backup-key.age`,
encrypted to the owner's SSH public key. This recovery object is outside the
30-day lifecycle prefixes; do not remove the matching private key without a
separate recovery plan. The plaintext key is never placed in S3.

Provision `/etc/genora-art/dev-backup-s3.json` with root-only mode `0600` and
fields `endpoint`, `region`, `bucket`, `accessKeyId`, `secretAccessKey`, and a
new Genora-only 32-byte hexadecimal `encryptionKey`. Never use Blogoro's
encryption key. `provision-s3-config.py dev|prod` creates a distinct key for
each environment and refuses to replace an existing config. Install
`python3-boto3` and `python3-cryptography` from the OS packages. Install the
two `genora-dev-db-backup.*` units in `/etc/systemd/system/`, run
`systemctl daemon-reload`, enable the timer, and run the service once. A
successful `pg_restore -l` checks the archive catalog, not a full restore;
periodically test a full restore in an isolated database.
