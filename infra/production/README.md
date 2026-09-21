# Genora production

- Клиентский сайт: `https://genora.art`
- Админка: `https://admin.genora.art`
- Docker project: `genora-prod`
- PostgreSQL volume: `genora-prod_genora-prod-pg`

Production использует собственные контейнеры, сеть, PostgreSQL и cookie names. Данные из dev не копируются.
Секреты хранятся только в серверном `infra/production/.env` и не коммитятся.

Для будущей prod-базы подготовлен отдельный путь резервных копий
`genora/prod/backups/` в bucket HOSTKEY S3, отличающийся от `genora/dev/backups/`.
Перед запуском prod нужно создать `/etc/genora-art/prod-backup-s3.json` с
отдельным ключом шифрования, установить системные файлы
`genora-prod-db-backup.service` и `.timer`, выполнить пробную копию и
проверить её восстановление. Не включать таймер, пока prod-база не развернута.
Отдельный prod-ключ зашифровать для публичного ключа владельца через
`escrow-backup-key.py prod` и проверить файл восстановления до запуска таймера.
