# Деплой на Render.com — пошаговая инструкция

## Предварительные требования

- Аккаунт на [Render.com](https://render.com)
- Репозиторий подключён к Render (GitHub/GitLab)
- Аккаунт Clerk **production** инстанс (важно: не development!)
- База данных PostgreSQL (Render Managed Postgres или внешняя)

---

## Шаг 1 — Миграция базы данных

Перед первым запуском необходимо применить схему Drizzle к вашей БД.

Выполните локально (с `DATABASE_URL` указывающим на продакшен-БД):

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
```

Или через `push-force` если нужно принудительно:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push-force
```

---

## Шаг 2 — Создание Blueprint через render.yaml

1. В Render Dashboard нажмите **New → Blueprint**
2. Выберите ваш репозиторий
3. Render автоматически обнаружит `render.yaml` в корне и предложит создать два сервиса:
   - `peaceful-call-api` — Web Service (API)
   - `peaceful-call-web` — Static Site (фронтенд)

---

## Шаг 3 — Переменные окружения (задать вручную в Dashboard)

### API-сервис (`peaceful-call-api`)

| Переменная | Описание |
|---|---|
| `CLERK_SECRET_KEY` | Секретный ключ Clerk (из Clerk Dashboard → API Keys) |
| `CLERK_PUBLISHABLE_KEY` | Публичный ключ Clerk (из Clerk Dashboard → API Keys) |
| `CORS_ALLOWED_ORIGINS` | URL фронтенда, например `https://peaceful-call-web.onrender.com` |
| `DATABASE_URL` | Строка подключения PostgreSQL (Render Managed Postgres или внешняя) |
| `SESSION_SECRET` | Случайная строка 32+ символов для подписи сессий |
| `S3_REGION` | Регион S3-бакета, например `eu-central-1` |
| `S3_ACCESS_KEY_ID` | Access Key ID для S3 |
| `S3_SECRET_ACCESS_KEY` | Secret Access Key для S3 |
| `S3_BUCKET` | Имя S3-бакета |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Пути к публичным объектам в бакете (через запятую) |
| `PRIVATE_OBJECT_DIR` | Путь к директории приватных объектов в бакете |

> `OBJECT_STORAGE_PROVIDER` уже выставлен в `s3` в render.yaml — менять не нужно.

### Фронтенд (`peaceful-call-web`)

| Переменная | Описание |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Публичный ключ Clerk (тот же, что для API) |
| `VITE_API_BASE_URL` | Полный URL API-сервиса, например `https://peaceful-call-api.onrender.com` |

---

## Шаг 4 — Переключение Clerk на Production-инстанс

⚠️ **Важно:** ключи Clerk в режиме разработки (`pk_test_...`, `sk_test_...`) не работают корректно в продакшене.

1. В Clerk Dashboard создайте (или переключитесь на) **Production** инстанс
2. Скопируйте `Publishable Key` (`pk_live_...`) и `Secret Key` (`sk_live_...`)
3. Укажите их в переменных окружения обоих сервисов
4. В Clerk Dashboard в разделе **Domains** добавьте домен вашего Render-фронтенда

---

## Шаг 5 — Первый деплой

1. После настройки всех переменных нажмите **Deploy** для каждого сервиса
2. Проверьте health-check API: `https://peaceful-call-api.onrender.com/api/healthz`
3. Откройте фронтенд и убедитесь, что авторизация и запросы к API работают

---

## Заметки

- Render на бесплатном плане усыпляет сервисы при неактивности — рекомендуется план Starter
- Для S3-совместимых провайдеров (Backblaze B2, MinIO и др.) дополнительно укажите `S3_ENDPOINT`
- Логи API-сервиса доступны в Render Dashboard → Logs
