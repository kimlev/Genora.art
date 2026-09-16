# Genora production

- Клиентский сайт: `https://genora.art`
- Админка: `https://admin.genora.art`
- Docker project: `genora-prod`
- PostgreSQL volume: `genora-prod_genora-prod-pg`

Production использует собственные контейнеры, сеть, PostgreSQL и cookie names. Данные из dev не копируются.
Секреты хранятся только в серверном `infra/production/.env` и не коммитятся.
