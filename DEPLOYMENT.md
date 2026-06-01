# 🚀 Instrukcja wdrażania ShrooomzEye na serwerze Linux

## 1. Przygotowanie serwera

### Wymagane oprogramowanie

```bash
# Zainstaluj Node.js v18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Sprawdź wersję
node --version   # v20+
npm --version    # 10+

# Zainstaluj PostgreSQL (jeśli baza jest lokalna)
sudo apt-get install -y postgresql postgresql-contrib

# Zainstaluj PM2 do zarządzania procesami
sudo npm install -g pm2

# Zainstaluj Git
sudo apt-get install -y git
```

### Sprawdzenie statusu PostgreSQL

```bash
# Sprawdź czy PostgreSQL działa
sudo systemctl status postgresql

# Jeśli nie działa, uruchom:
sudo systemctl start postgresql

# Włącz autostart:
sudo systemctl enable postgresql
```

## 2. Pobranie kodu

```bash
# Przejdź do katalogu /var/www
cd /var/www

# Klonuj repozytorium
git clone https://github.com/username/shrooomzEye.git

# Wejdź do katalogu
cd shrooomzEye

# Zamień origin na swoje repozytorium
git remote set-url origin https://github.com/username/shrooomzEye.git
```

## 3. Konfiguracja bazy danych

### Logowanie do PostgreSQL

```bash
# Zaloguj się jako użytkownik postgres
sudo -u postgres psql

# W psql:
CREATE USER shrooomzeye WITH PASSWORD 'haslo_bezpieczne';
CREATE DATABASE shrooomzeye OWNER shrooomzeye;
ALTER ROLE shrooomzeye WITH CREATEDB SUPERUSER;
\q
```

> **⚠️ BEZPIECZEŃSTWO**: Zmień `haslo_bezpieczne` na silne hasło!

### Weryfikacja połączenia

```bash
# Sprawdź czy możesz się połączyć
psql -U shrooomzeye -h localhost -d shrooomzeye

# Jeśli zadziała, wpisz \q aby wyjść
```

## 4. Konfiguracja aplikacji

### Utwórz plik `.env`

```bash
# Przejdź do katalogu aplikacji
cd /var/www/shrooomzEye

# Utwórz plik .env
nano .env
```

Wklej poniższą zawartość i dostosuj:

```env
DATABASE_URL=postgres://shrooomzeye:haslo_bezpieczne@localhost:5432/shrooomzeye
PORT=5000
NODE_ENV=production
```

> Zmień `haslo_bezpieczne` na to samo hasło co w punkcie 3!

### Zapisz i wyjdź z nano:
- Ctrl+O (Save)
- Enter
- Ctrl+X (Exit)

## 5. Instalacja zależności

```bash
cd /var/www/shrooomzEye

# Zainstaluj npm zależności
npm install

# Zoptymalizuj dla produkcji
npm run build

# Migruj schemat bazy danych
npm run db:push
```

## 6. Konfiguracja PM2 do autostartu

### Utwórz plik konfiguracyjny PM2

```bash
nano ecosystem.config.js
```

Wklej:

```javascript
module.exports = {
  apps: [
    {
      name: 'shrooomzeye',
      script: '/var/www/shrooomzEye/dist/index.cjs',
      cwd: '/var/www/shrooomzEye',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/www/shrooomzEye/logs/error.log',
      out_file: '/var/www/shrooomzEye/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

### Uruchom aplikację z PM2

```bash
# Uruchom aplikację
pm2 start ecosystem.config.js

# Ustaw autostart
pm2 startup
pm2 save

# Sprawdź status
pm2 status
pm2 logs shrooomzeye
```

## 7. Konfiguracja Nginx (reverse proxy)

### Zainstaluj Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Skonfiguruj Nginx

```bash
sudo nano /etc/nginx/sites-available/shrooomzeye
```

Wklej:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Zmień `yourdomain.com` na twoją domenę!

### Włącz konfigurację

```bash
sudo ln -s /etc/nginx/sites-available/shrooomzeye /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL Certificate (Certbot)

```bash
# Zainstaluj Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Uzyskaj certyfikat
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot automatycznie Updates Nginx
# Certifikat będzie auto-renewalny
```

## 9. Utrzymanie i monitorowanie

### Wyświetl logi aplikacji

```bash
# Realne logi
pm2 logs shrooomzeye

# Logi błędów
tail -f /var/www/shrooomzEye/logs/error.log
```

### Update aplikacji

```bash
cd /var/www/shrooomzEye

# Pobierz najnowszy kod
git pull origin main

# Zainstaluj zależy
npm install

# Build
npm run build

# Migruj bazę
npm run db:push

# Restartuj aplikację
pm2 restart shrooomzeye
```

### Monitorowanie

```bash
# Status PM2
pm2 status

# Szczegóły monitorowania
pm2 monit

# Restartu aplikacji
pm2 restart shrooomzeye

# Zatrzymaj aplikację
pm2 stop shrooomzeye

# Uruchom znowu
pm2 start shrooomzeye
```

## 10. Troubleshooting

### Aplikacja nie startuje

```bash
# Sprawdź logi
pm2 logs shrooomzeye

# Sprawdzenie konkretnego błędu
npm run dev  # Spróbuj uruchomić ręcznie

# Sprawdź czy PORT 5000 nie jest w użyciu
sudo lsof -i :5000
```

### Problemy z bazą danych

```bash
# Sprawdź czy PostgreSQL działa
sudo systemctl status postgresql

# Sprawdź połączenie
psql -U shrooomzeye -h localhost -d shrooomzeye -c "SELECT 1;"

# Sprawdź logi PostgreSQL
sudo tail -f /var/log/postgresql/postgresql.log
```

### Problemy z Nginx

```bash
# Sprawdzenie konfiguracji
sudo nginx -t

# Sprawdzenie logów
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## 📝 Szybka kontrola post-deployment

```bash
# Czy Node.js zainstalowany?
node --version

# Czy PostgreSQL działa?
sudo systemctl status postgresql

# Czy aplikacja uruchomiona?
pm2 status

# Czy Nginx działa?
sudo systemctl status nginx

# Czy domena dostępna?
curl http://yourdomain.com
```

## 🔒 Bezpieczeństwo

- ✅ Ustaw silne hasło do PostgreSQL
- ✅ Nie commituj `.env` do Git
- ✅ Używaj HTTPS (SSL)
- ✅ Regularnie aktualizuj zależy: `npm audit fix`
- ✅ Monitoruj logi aplikacji
- ✅ Rób backupy bazy danych

---

**Potrzebujesz pomocy?** Sprawdź logi: `pm2 logs shrooomzeye`

