#!/bin/bash

set -e

echo ""
echo "🚀 Startowanie aplikacji ShrooomzEye..."
echo ""

# Set working directory to script directory
cd "$(dirname "$0")" || exit 1

# 1. Sprawdzenie .env
echo "📝 Sprawdzanie konfiguracji..."
if [ ! -f .env ]; then
  echo "❌ Plik .env nie istnieje!"
  echo ""
  echo "Utwórz plik .env w katalogu $(pwd)/.env z zawartością:"
  echo ""
  echo "  DATABASE_URL=postgres://user:password@localhost:5432/shrooomzeye"
  echo "  PORT=5000"
  echo "  NODE_ENV=production"
  echo ""
  echo "📌 WAŻNE:"
  echo "   - Zmień hasło 'password' na rzeczywiste hasło PostgreSQL"
  echo "   - Zmień 'localhost' jeśli baza jest na innym serwerze"
  echo "   - Upewnij się że baza 'shrooomzeye' istnieje"
  echo ""
  exit 1
fi

# Sprawdzenie czy .env ma DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
  echo "❌ DATABASE_URL nie jest ustawiony w pliku .env"
  echo "   Dodaj linię: DATABASE_URL=postgres://user:password@host:5432/dbname"
  exit 1
fi

echo "✅ Konfiguracja OK"
echo ""

# 2. Sprawdzenie dependencji
echo "📦 Sprawdzanie dependencji..."
if [ ! -d node_modules ]; then
  echo "📥 Instalowanie dependencji (to może potrwać kilka minut)..."
  npm install
fi
echo "✅ Dependencje OK"
echo ""

# 3. Migracja Drizzle
echo "🗄️  Migrowanie bazy danych..."
npm run db:push || echo "⚠️  Migracja bazy danych się nie udała. Upewnij się, że PostgreSQL jest uruchomiony"
echo ""

# 4. Uruchomienie backendu i frontendu
echo "🎯 Uruchamianie aplikacji..."
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Aby zamknąć aplikację, naciśnij Ctrl+C"
echo ""

# Uruchomienie backendu
export NODE_ENV=production
npm run dev &
BACKEND_PID=$!

# Czekaj chwilę na uruchomienie backendu
sleep 2

# Uruchomienie frontend
cd client
export PORT=3000
npm run dev:client &
FRONTEND_PID=$!

cd ..

# Obsługa zamknięcia
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '👋 Aplikacja wyłączona'; exit 0" SIGINT

# Czekanie na procesy
wait

