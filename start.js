#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Startowanie aplikacji ShrooomzEye...\n');

// Funkcja do uruchomienia procesu
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function main() {
  try {
    // 1. Sprawdzenie .env
    console.log('📝 Sprawdzanie konfiguracji...');
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      console.log('⚠️  Plik .env nie istnieje, tworzę nowy...');
      fs.writeFileSync(envPath, `DATABASE_URL=postgres://postgres@localhost:5432/shrooomzeye
PORT=5000
NODE_ENV=development
`);
    }
    console.log('✅ Konfiguracja OK\n');

    // 2. Sprawdzenie dependencji (npm modules)
    console.log('📦 Sprawdzanie dependencji...');
    const nodeModulesPath = path.join(__dirname, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('📥 Instalowanie dependencji...');
      await runProcess('npm', ['install']);
    }
    console.log('✅ Dependencje OK\n');

    // 3. Migracja Drizzle
    console.log('🗄️  Migrowanie bazy danych...');
    try {
      await runProcess('npm', ['run', 'db:push']);
      console.log('✅ Baza danych zmigrowana\n');
    } catch (err) {
      console.warn('⚠️  Migracja nie udała się, kontynuuję mimo to...');
      console.warn('   Upewnij się, że PostgreSQL jest uruchomiony\n');
    }

    // 4. Uruchomienie backendu i frontendu
    console.log('🎯 Uruchamianie aplikacji...\n');
    console.log('Backend:  http://localhost:5000');
    console.log('Frontend: http://localhost:3000\n');

    // Backend
    const backend = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    // Frontend
    const frontend = spawn('npm', ['run', 'dev:client'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, 'client'),
      env: { ...process.env, PORT: 3000 }
    });

    // Obsługa zamknięcia
    process.on('SIGINT', () => {
      console.log('\n\n👋 Wyłączanie aplikacji...');
      backend.kill();
      frontend.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Błąd:', error.message);
    process.exit(1);
  }
}

main();

