# 🍄 ShrooomzEye

Aplikacja do śledzenia informacji o gildiach w grze Tibia - dashboard z real-time tracking i analityką.

## 🚀 Szybki start

### Warunki wstępne

- **Node.js** v18+
- **PostgreSQL** v12+
- **npm** lub **yarn**

### Instalacja i uruchomienie

**Windows:**
```bash
npm run start:windows
```

**Linux/macOS:**
```bash
bash start.sh
```

**Uniwersalne (wszystkie systemy):**
```bash
node start.js
```

> Szczegółowe instrukcje: patrz [`START_README.md`](./START_README.md)

## 📱 Co to jest?

ShrooomzEye to zaawansowany dashboard do zarządzania informacjami o gildiach Tibia z:

- 📊 Real-time tracking statusu graczy
- 📈 Analityka i statystyki
- 🔄 Synchronizacja danych z serwerem Tibia
- 🎯 Zarządzanie poziomami postavów
- 📋 Historia śmierci i aktywności
- 🌐 Multi-tenant wsparcie
- 🔐 Autoryzacja i kontrola dostępu

## 📁 Struktura projektu

```
shrooomzEye/
├── server/              # Backend (Express.js + TypeScript)
├── client/              # Frontend (React + Vite)
├── shared/              # Wspólne typy i schemat bazy danych
├── migrations/          # SQL migracje Drizzle ORM
├── script/              # Build scripts
├── attached_assets/     # Zasoby załączone
├── .env                 # Zmienne środowiskowe
├── drizzle.config.ts    # Konfiguracja ORM
├── vite.config.ts       # Konfiguracja frontend bundlera
├── tsconfig.json        # Konfiguracja TypeScript
└── package.json         # Definicja projektu
```

## 🛠️ Technologia

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Language**: TypeScript
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: Passport.js

### Frontend
- **Framework**: React v19
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Components**: Radix UI
- **State**: React Query
- **Forms**: React Hook Form
- **Routing**: Wouter

## 📝 Dostępne skrypty

```bash
npm run dev              # Uruchom backend w dev mode
npm run dev:client       # Uruchom frontend w dev mode
npm run build            # Build do produkcji
npm run start            # Uruchom backend w prod mode
npm run check            # Type checking
npm run db:push          # Synchronizuj schemat z bazą
npm run start:windows    # All-in-one start na Windows
npm run start:unix       # All-in-one start na Linux/macOS
npm run start:node       # Universal start (wszystkie systemy)
```

## 🌍 Porty

- **Backend API**: `http://localhost:5000`
- **Frontend**: `http://localhost:3000` (dev) / na backendzie (prod)

## 🔧 Konfiguracja

Utwórz plik `.env` w głównym katalogu:

```env
DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/shrooomzeye
PORT=5000
NODE_ENV=development
```

> ⚠️ NIE COMMITUJ `.env` do repozytorium!

## 📚 Dokumentacja

- [Instrukcja uruchomienia](./START_README.md)
- [Express.js docs](https://expressjs.com)
- [React docs](https://react.dev)
- [Drizzle ORM docs](https://orm.drizzle.team)
- [Vite docs](https://vitejs.dev)

## 🐛 Troubleshooting

Jeśli napotkasz problemy, sprawdź [`START_README.md`](./START_README.md#troubleshooting) sekcję rozwiązywania problemów.

## 📄 Licencja

MIT

## 👨‍💻 Development

1. Utwórz branch dla feature'u: `git checkout -b feature/nazwa`
2. Commituj zmiany: `git commit -am "Add feature"`
3. Pushuj do brancha: `git push origin feature/nazwa`
4. Otwórz Pull Request

## 📞 Wsparcie

Jeśli masz pytania lub problemy, sprawdź dokumentację w `START_README.md`.

