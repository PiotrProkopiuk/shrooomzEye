# ShrooomzEye - Instrukcja Uruchomienia

## Wymagania

- **Node.js** v18+ (https://nodejs.org)
- **PostgreSQL** v12+ działający lokalnie lub dostępny przez sieć
- **npm** lub **yarn**

## Konfiguracja

### 1. Zmienne środowiskowe (`.env`)

Plik `.env` powinien zawierać:

```
DATABASE_URL=postgres://postgres@localhost:5432/shrooomzeye
PORT=5000
NODE_ENV=development
```

> **Ważne**: Zmień hasło `postgres` na rzeczywiste hasło do PostgreSQL oraz dostosuj host/port jeśli baza nie jest lokalna.

### 2. Utworzenie bazy danych

Przed uruchomieniem aplikacji, upewnij się że PostgreSQL ma bazę danych `shrooomzeye`:

```sql
CREATE DATABASE shrooomzeye;
```

Lub zaloguj się do PostgreSQL i utwórz bazę:

```bash
psql -U postgres
# W psql:
CREATE DATABASE shrooomzeye;
```

## Uruchomienie

### Dla Windows

Wykonaj jeden z poniższych poleceń:

```bash
# Opcja 1: Skrypt batch (otwiera 2 okna terminala)
npm run start:windows

# Opcja 2: Ręczne uruchomienie w dwóch terminalach
npm run dev &
cd client && npm run dev:client
```

### Dla macOS/Linux

```bash
# Opcja 1: Skrypt bash
bash start.sh

# Opcja 2: Node.js skrypt (uniwersalny)
node start.js

# Opcja 3: Ręczne uruchomienie w dwóch terminalach
npm run dev &
cd client && npm run dev:client
```

## Dostęp do aplikacji

Po uruchomieniu:

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:3000

## Rozwiązywanie problemów

### ❌ `Error: connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL nie jest dostępny. Upewnij się że:
1. PostgreSQL jest zainstalowany i uruchomiony
2. Dane w `.env` są prawidłowe (host, port, user, password)

```bash
# Sprawdź status PostgreSQL (Windows PowerShell)
Get-Service postgresql-*

# Sprawdź status PostgreSQL (Linux/Mac)
brew services list  # macOS
sudo systemctl status postgresql  # Linux
```

### ❌ `Error: database "shrooomzeye" does not exist`

Baza danych nie istnieje. Utwórz ją:

```bash
psql -U postgres -c "CREATE DATABASE shrooomzeye;"
```

### ❌ Port 5000/3000 już w użyciu

Zmień zmienne w `.env`:

```
PORT=5001  # Backend na porcie 5001
```

A dla frontendu, zmień w pliku `package.json` lub użyj zmiennej środowiskowej:

```bash
PORT=3001 npm run dev:client
```

### ❌ Błędy przy instalacji dependencji

Wyczyść cache npm i zainstaluj ponownie:

```bash
npm cache clean --force
npm install
```

## Skrypty npm

```bash
npm run dev              # Backend - development mode
npm run dev:client       # Frontend - development mode
npm run build            # Build do produkcji
npm run start            # Backend - production mode
npm run db:push          # Migracja schematu Drizzle
npm run check            # TypeScript type check
```

## Struktura projektu

```
shrooomzEye/
├── server/              # Backend (Express.js)
├── client/              # Frontend (React + Vite)
├── shared/              # Wspólne typy i schemat Drizzle
├── migrations/          # SQL migracje Drizzle
├── .env                 # Zmienne środowiskowe (NIE COMMIT do GIT!)
├── start.sh             # Skrypt start dla Linux/Mac
├── start.bat            # Skrypt start dla Windows
├── start.js             # Skrypt start (Node.js, uniwersalny)
└── package.json         # Dependencje i skrypty
```

## Development workflow

1. **Backend** edytuje się w `server/`
2. **Frontend** edytuje się w `client/src/`
3. **Wspólne typy** i **database schema** to `shared/schema.ts`
4. **Baza danych**: Edytuj `shared/schema.ts`, uruchom `npm run db:push`

## Deployment

Przed deploymentem:

```bash
npm run build           # Build backendu
npm run check           # Type check
cd client && npm run build && cd ..  # Build frontendu
```

> Więcej informacji znajdziesz w dokumentacji frameworków:
> - [Express.js](https://expressjs.com)
> - [Vite](https://vitejs.dev)
> - [React](https://react.dev)
> - [Drizzle ORM](https://orm.drizzle.team)

