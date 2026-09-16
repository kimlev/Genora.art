# Genora dev deployment

This is an isolated dev deployment for `dev.genora.art`.

- It uses a new PostgreSQL volume and never clones production data.
- The only initial database record is the administrator supplied at deploy time.
- Secrets belong in `infra/genora-dev/.env` on the server and must not be committed.
- `NEXT_PUBLIC_STAGING=1` keeps the site out of search engines; analytics is disabled until a new property is explicitly enabled.
