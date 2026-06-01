@echo off
REM ShrooomzEye - Skrypt uruchamiający aplikację na Windows

echo.
echo 🚀 Startowanie aplikacji ShrooomzEye...
echo.

REM 1. Sprawdzenie .env
echo 📝 Sprawdzanie konfiguracji...
if not exist .env (
  echo ⚠️  Plik .env nie istnieje, tworzę nowy...
  (
    echo DATABASE_URL=postgres://postgres@localhost:5432/shrooomzeye
    echo PORT=5000
    echo NODE_ENV=development
  ) > .env
)
echo ✅ Konfiguracja OK
echo.

REM 2. Sprawdzenie dependencji
echo 📦 Sprawdzanie dependencji...
if not exist node_modules (
  echo 📥 Instalowanie dependencji (to może potrwać kilka minut)...
  call npm install
  if errorlevel 1 (
    echo ❌ Instalacja dependencji nie udała się
    pause
    exit /b 1
  )
)
echo ✅ Dependencje OK
echo.

REM 3. Migracja Drizzle
echo 🗄️  Migrowanie bazy danych...
call npm run db:push
if errorlevel 1 (
  echo ⚠️  Migracja bazy danych nie udała się
  echo    Upewnij się, że PostgreSQL jest uruchomiony i dostępny
  echo.
)
echo ✅ Gotowe
echo.

REM 4. Uruchomienie backendu i frontendu
echo 🎯 Uruchamianie aplikacji...
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Aby zamknąć aplikację, naciśnij Ctrl+C w obu terminalach
echo.

REM Otworg nowe okna terminala dla backend i frontend
start "ShrooomzEye - Backend" cmd /k "set NODE_ENV=development && npm run dev"
timeout /t 2 /nobreak
cd client
start "ShrooomzEye - Frontend" cmd /k "set PORT=3000 && npm run dev:client"
cd ..

echo.
echo ✅ Aplikacja została uruchomiona w dwóch oknach terminala
pause

