# 💰 Семейный бюджет

Веб-приложение для учёта расходов всей семьи. Каждый член семьи заходит под своим аккаунтом, видит общий дашборд и ведёт свои расходы.

## Возможности

- **Авторизация** — личные аккаунты для каждого члена семьи
- **Дашборд** — общая сумма, графики по категориям и участникам, последние расходы
- **Расходы** — добавление, редактирование, удаление; фильтрация по участнику, категории, дате
- **Личный кабинет** — смена имени, email, пароля, цвета аватара
- **Панель администратора** — управление участниками и категориями, скачивание резервной копии БД
- **Роли**: `ADMIN` (полный доступ) и `MEMBER` (только свои расходы + общий дашборд)

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) 18+

### Установка

```bash
git clone <ваш-репозиторий>
cd home_accountant

npm install
npx prisma db push
npx tsx prisma/seed.ts
```

### Запуск

```bash
# Разработка
npm run dev
# → http://localhost:3000

# Продакшн
npm run build
npm start
```

### Первый вход

| Поле | Значение |
|------|----------|
| Email | `admin@family.local` |
| Пароль | `admin123` |

> ⚠️ Смените пароль сразу после входа: **Профиль → Сменить пароль**

После входа перейдите в **Управление → Участники** и добавьте остальных членов семьи.

---

## Переменные окружения

Файл `.env.local` (создаётся автоматически при `db:push`):

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="замените-на-случайную-строку"
NEXTAUTH_URL="http://localhost:3000"
```

Для генерации `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Бесплатный хостинг

### Вариант 1 — Fly.io (рекомендуется)

Бесплатный тариф: 3 shared-CPU приложения, 256 MB RAM, 3 GB persistent storage. SQLite живёт на постоянном томе — данные не теряются при перезапуске.

```bash
# Установить CLI
brew install flyctl        # macOS
# или: curl -L https://fly.io/install.sh | sh

# Войти / зарегистрироваться
fly auth login

# Создать приложение (один раз)
fly launch --name family-budget --region ams --no-deploy

# Создать постоянный том для базы данных
fly volumes create data --size 1 --region ams

# Задать секреты
fly secrets set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
fly secrets set NEXTAUTH_URL="https://family-budget.fly.dev"
fly secrets set DATABASE_URL="file:/data/prod.db"

# Развернуть
fly deploy
```

Добавьте файл `fly.toml` (создаётся автоматически `fly launch`) и убедитесь, что том примонтирован в `/data`.

После деплоя выполните сид базы:
```bash
fly ssh console -C "npx tsx prisma/seed.ts"
```

---

### Вариант 2 — Локальная сеть дома

Самый простой способ, если все дома подключены к одному Wi-Fi.

```bash
npm run build
npm start
```

Узнайте локальный IP вашего компьютера:
```bash
ipconfig getifaddr en0   # macOS / Linux
# или: hostname -I        # Linux
```

Откройте на телефоне/планшете: `http://192.168.x.x:3000`

Чтобы приложение запускалось автоматически при старте системы, используйте [PM2](https://pm2.keymetrics.io/):
```bash
npm install -g pm2
pm2 start npm --name "family-budget" -- start
pm2 save
pm2 startup
```

---

### Вариант 3 — Railway

Бесплатный тариф: $5 кредитов в месяц (хватает на небольшое приложение).

> ⚠️ Railway использует ephemeral-файловую систему — SQLite будет сбрасываться при каждом деплое. Для Railway лучше использовать [Turso](https://turso.tech/) или PostgreSQL.

---

## Резервные копии

**Ручной способ:**  
Панель администратора → кнопка **«Скачать резервную копию»** — скачивает файл `backup_YYYY-MM-DD.db`.

**Автоматический (cron на сервере):**
```bash
# Ежедневно в 2:00 копировать базу в папку backups/
0 2 * * * cp /path/to/prisma/dev.db /path/to/backups/backup_$(date +\%F).db
```

**Восстановление:**
```bash
cp backup_2025-01-15.db prisma/dev.db
```

---

## Структура проекта

```
home_accountant/
├── prisma/
│   ├── schema.prisma      # схема БД
│   ├── seed.ts            # начальные данные
│   └── dev.db             # база SQLite (не в git)
├── src/
│   ├── app/
│   │   ├── page.tsx           # дашборд
│   │   ├── expenses/          # список расходов
│   │   ├── admin/             # панель администратора
│   │   ├── profile/           # личный кабинет
│   │   ├── login/             # страница входа
│   │   └── api/               # REST API
│   ├── components/
│   │   ├── AppLayout.tsx      # боковое меню + шапка
│   │   └── ExpenseModal.tsx   # модальное окно расхода
│   ├── lib/
│   │   ├── prisma.ts          # клиент БД
│   │   └── auth.ts            # конфигурация NextAuth
│   └── types/index.ts         # TypeScript-типы
├── .env.local                 # секреты (не в git)
└── package.json
```
