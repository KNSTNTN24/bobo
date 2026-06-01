# Деплой на Vercel

BOBO — полноценное приложение (Next.js + сервер + БД), поэтому хостится на Vercel,
а данные — в **Postgres** (Vercel Postgres или Neon). SQLite в проде не используется.

## Переменные окружения
| Переменная | Зачем | Где взять |
|---|---|---|
| `DATABASE_URL` | строка подключения Postgres | Vercel Postgres → вкладка Prisma, или Neon |
| `JWT_SECRET` | подпись сессий (вход) | любая длинная случайная строка |
| `BLOB_READ_WRITE_TOKEN` | хранение фото (опц.) | Vercel → Storage → Blob (создаётся автоматически) |

## Шаги (в веб-интерфейсе Vercel)
1. **Add New → Project** → импортировать репозиторий `KNSTNTN24/bobo` (Vercel уже подключён к GitHub).
2. **Storage → Create → Postgres** (Vercel Postgres). Привязать к проекту. Убедиться, что в **Environment Variables** есть `DATABASE_URL` со строкой Postgres
   (если Vercel создал `POSTGRES_PRISMA_URL` — скопировать её значение в новую переменную `DATABASE_URL`; использовать pooled/Prisma-URL).
3. *(опционально, для фото доставок/инцидентов)* **Storage → Create → Blob** — переменная `BLOB_READ_WRITE_TOKEN` подставится сама.
4. **Settings → Environment Variables** → добавить `JWT_SECRET` = длинная случайная строка.
5. **Deploy.** Сборка: `prisma generate && next build` (схема к БД не применяется на сборке — см. п.6).
6. **Один раз** применить схему и залить демо-данные к боевой БД (локально, подставив строку подключения):
   ```bash
   DATABASE_URL="postgresql://…"  npx prisma db push
   DATABASE_URL="postgresql://…"  npm run db:seed
   ```

После этого приложение доступно по выданному Vercel URL; вход — демо-аккаунты из `README.md`.

## Локальная разработка
Теперь тоже на Postgres: пропишите `DATABASE_URL` (своя Neon-база или та же) в локальном `.env`
(см. `.env.example`), затем `npm run db:push && npm run db:seed && npm run dev`.
