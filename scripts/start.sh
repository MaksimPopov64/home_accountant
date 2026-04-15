#!/bin/sh
set -e

echo "→ Running database migrations..."
node_modules/.bin/prisma db push --skip-generate

echo "→ Seeding database (if needed)..."
node_modules/.bin/tsx prisma/seed.ts 2>/dev/null || true

echo "→ Starting Next.js..."
exec node server.js
