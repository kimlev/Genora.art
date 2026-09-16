-- Доступы к поисковым консолям живут в базе: токен Яндекса обновляется сам,
-- а новый ключ не требует правки файла переменных и перезапуска контейнера.
CREATE TABLE IF NOT EXISTS search_credentials (
  name text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
