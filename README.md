# 💰 Семейный бюджет

Веб-приложение для учёта расходов всей семьи. Каждый член семьи заходит под своим аккаунтом, видит общий дашборд и ведёт свои расходы.

## Возможности

- **Авторизация** — личные аккаунты для каждого члена семьи
- **Дашборд** — общая сумма, графики по категориям и участникам, последние расходы
- **Расходы** — добавление, редактирование, удаление; фильтрация по участнику, категории, дате
- **Личный кабинет** — смена имени, email, пароля, цвета аватара
- **Панель администратора** — управление участниками и категориями, скачивание резервной копии БД
- **Роли**: `ADMIN` (полный доступ) и `MEMBER` (только свои расходы + общий дашборд)

---

## Локальный запуск

### Требования

- [Node.js](https://nodejs.org/) 18+

### Установка и запуск

```bash
git clone <ваш-репозиторий>
cd home_accountant
npm install
```

Создай файл `.env` в корне проекта:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="любая-случайная-строка"
NEXTAUTH_URL="http://localhost:3000"
```

```bash
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
# → http://localhost:3000
```

### Первый вход

| Поле | Значение |
|------|----------|
| Email | `admin@family.local` |
| Пароль | `admin123` |

> ⚠️ Смените пароль сразу после входа: **Профиль → Сменить пароль**

После входа перейдите в **Управление → Участники** и добавьте остальных членов семьи.

---

## Деплой в облако — Vercel + Neon (бесплатно, карта не нужна)

Проверенный способ деплоя. Vercel хостит Next.js-приложение, Neon предоставляет бесплатную PostgreSQL-базу.

### Шаг 1 — Neon (база данных)

1. Зарегистрируйся на [neon.tech](https://neon.tech) через GitHub
2. Нажми **New Project**, назови его `home-accountant`
3. Скопируй **Connection string** — выглядит так:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Шаг 2 — GitHub репозиторий

Vercel деплоит из GitHub:

```bash
git init
git add .
git commit -m "initial commit"
```

Создай репозиторий на [github.com/new](https://github.com/new) (можно приватный), затем:

```bash
git remote add origin https://github.com/ВАШ_ЮЗЕРНЕЙМ/home-accountant.git
git push -u origin main
```

### Шаг 3 — Vercel

1. Зарегистрируйся на [vercel.com](https://vercel.com) через GitHub
2. Нажми **New Project** → выбери репозиторий `home-accountant`
3. В разделе **Environment Variables** добавь три переменные:

| Name | Value |
|------|-------|
| `DATABASE_URL` | строка подключения от Neon |
| `NEXTAUTH_URL` | `https://ИМЯ-ПРОЕКТА.vercel.app` |
| `NEXTAUTH_SECRET` | любая длинная случайная строка |

4. Нажми **Deploy**

> Vercel сам запустит `prisma generate && next build` — это уже прописано в `package.json`.

### Шаг 4 — Инициализация базы данных

После успешного деплоя нужно создать таблицы и admin-аккаунт. Выполни **локально** — команды подключатся к облачной Neon-базе:

Вставь Neon-строку подключения в локальный `.env`:

```env
DATABASE_URL="postgresql://ТУТ_ТВОЯ_СТРОКА_ОТ_NEON"
```

Затем:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Увидишь:
```
✅ Admin created: admin@family.local / admin123
✅ Database seeded
```

Теперь заходи на `https://ИМЯ-ПРОЕКТА.vercel.app` и логинься.

### Последующие деплои

При каждом `git push` Vercel автоматически пересобирает и деплоит приложение. База данных при этом не трогается.

---

## Резервные копии

**Ручной способ** — только для администратора:
Панель **Управление** → кнопка **«Скачать резервную копию»** — скачивает дамп базы.

**Через Neon** — в консоли [console.neon.tech](https://console.neon.tech) есть встроенные бэкапы с хранением 7 дней на бесплатном тарифе.

---

## Структура проекта

```
home_accountant/
├── prisma/
│   ├── schema.prisma      # схема БД (PostgreSQL)
│   └── seed.ts            # начальные данные и admin-аккаунт
├── src/
│   ├── app/
│   │   ├── page.tsx           # дашборд
│   │   ├── expenses/          # список расходов
│   │   ├── admin/             # панель администратора
│   │   ├── profile/           # личный кабинет
│   │   ├── login/             # страница входа
│   │   └── api/               # REST API (все роуты)
│   ├── components/
│   │   ├── AppLayout.tsx      # боковое меню + шапка
│   │   └── ExpenseModal.tsx   # модальное окно расхода
│   └── lib/
│       ├── prisma.ts          # клиент БД
│       └── auth.ts            # конфигурация NextAuth
├── .env                   # секреты — не коммитить в git!
├── fly.toml               # конфиг Fly.io (не используется)
└── package.json
```
