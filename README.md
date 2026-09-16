# Агрегатор нейросетей

**Production:** https://genora.art
**Production Admin:** https://admin.genora.art
**Dev copy:** https://dev.genora.art — ветка `dev`, коммиты с пометкой `(dev)`, закрыта от индексации
**Dev admin:** https://dev.admin.genora.art
**Production deployment:** `/srv/apps/genora-art`

Стартовая страница проекта и сбор анамнеза (кнопка GO).

После заполнения описания создаётся приватный GitHub-репозиторий с первым коммитом.

**GitHub:** https://github.com/kimlev/Genora.art (private)

## Вход через Google

Требуемые переменные в `.env` на сервере:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APP_BASE_URL` — уже используется для писем, задаёт origin redirect URI

Authorized redirect URI в Google Cloud Console: `https://genora.art/api/auth/google/callback`.
Кнопка входа появляется только когда обе Google-переменные заданы.

## Публикация статей из Blogoro

Приёмник: `https://genora.art/blogoro/publish`

В Blogoro, в блоке «Публикация — Webhook»:
- URL приёмника: `https://genora.art/blogoro/publish`
- секрет: тот же, что в `BLOGORO_WEBHOOK_SECRET` на сервере
- URL сайта в базовых настройках: `https://genora.art/blog`

Статья сразу открывается по адресу `https://genora.art/blog/<slug>`.
