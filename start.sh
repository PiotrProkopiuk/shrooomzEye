#!/bin/bash

set -e

echo ""
echo "🚀 Startowanie aplikacji ShrooomzEye..."
echo ""

# 1. Sprawdzenie .env
echo "📝 Sprawdzanie konfiguracji..."
if [ ! -f .env ]; then
  echo "⚠️  Plik .env nie istnieje, tworzę nowy..."
  cat > .env << EOF
DATABASE_URL=postgres://postgres@localhost:5432/shrooomzeye
PORT=5000
NODE_ENV=development
EOF
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
export NODE_ENV=development
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

