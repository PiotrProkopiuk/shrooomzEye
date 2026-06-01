#!/bin/bash

# Sprawdzenie i ustawienie zmiennych środowiskowych
if [ ! -f .env ]; then
  echo "Plik .env nie istnieje. Tworzę nowy plik .env."
  echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tibia_guild_db" > .env
fi

# Utworzenie bazy danych
echo "Tworzenie bazy danych..."
psql -U postgres -c "CREATE DATABASE tibia_guild_db;"

# Uruchomienie migracji Prisma
if ls *.prisma 1> /dev/null 2>&1; then
  echo "Uruchamianie migracji Prisma..."
  npx prisma migrate deploy
else
  echo "Brak plików migracji. Wykonywanie push schematu..."
  npx prisma db push
fi

# Uruchomienie backendu
echo "Uruchamianie backendu..."
export NODE_ENV=development
npm run dev &

# Uruchomienie frontend
echo "Uruchamianie frontend..."
cd client
npm run dev &

