#!/usr/bin/env node
// Автоматическая настройка Supabase для «Тренера личности».
// Нужен только Access Token: https://supabase.com/dashboard/account/tokens
//
//   npm run setup:supabase
//
// Скрипт сам: найдёт (или создаст) проект, создаст таблицы и правила безопасности,
// настроит вход по email и запишет публичные ключи в файл .env.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.supabase.com/v1';
const PROJECT_NAME = 'trener-lichnosti';
const REGION = 'eu-central-1'; // Франкфурт — ближайший к России регион
const LOCAL_STATE = path.join(root, '.supabase-setup.json'); // не попадает в git

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q, def = '') => (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim() || def;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('›', ...a);

function readState() { try { return JSON.parse(fs.readFileSync(LOCAL_STATE, 'utf8')); } catch { return {}; } }
function writeState(s) { fs.writeFileSync(LOCAL_STATE, JSON.stringify(s, null, 2)); }

let TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

async function api(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('\n=== Настройка облака для «Тренера личности» ===\n');
  const state = readState();
  if (!TOKEN) {
    console.log('1. Откройте https://supabase.com/dashboard/account/tokens (войдите или зарегистрируйтесь).');
    console.log('2. Нажмите «Generate new token», назовите его как угодно и скопируйте.\n');
    TOKEN = await ask('Вставьте Access Token (начинается с sbp_)');
  }
  if (!TOKEN.startsWith('sbp_')) throw new Error('Токен должен начинаться с sbp_');

  // ---------- Проект ----------
  const projects = await api('GET', '/projects');
  let project = projects.find((p) => p.id === state.ref) || projects.find((p) => p.name === PROJECT_NAME);
  if (!project) {
    const orgs = await api('GET', '/organizations');
    if (!orgs.length) throw new Error('В аккаунте Supabase нет организации. Создайте её на supabase.com/dashboard (бесплатно) и запустите скрипт снова.');
    const org = orgs[0];
    const dbPass = crypto.randomBytes(18).toString('base64url');
    log(`Создаю бесплатный проект «${PROJECT_NAME}» в организации «${org.name}»…`);
    project = await api('POST', '/projects', { name: PROJECT_NAME, organization_id: org.id, db_pass: dbPass, region: REGION });
    writeState({ ...state, ref: project.id, dbPass });
  } else {
    log(`Найден проект «${project.name}» (${project.id})`);
    writeState({ ...state, ref: project.id });
  }
  const ref = project.id;

  log('Жду, пока проект запустится (обычно 1–2 минуты)…');
  for (let i = 0; i < 90; i++) {
    const p = await api('GET', `/projects/${ref}`);
    if (p.status === 'ACTIVE_HEALTHY') break;
    if (p.status === 'INACTIVE' || p.status === 'PAUSED') {
      log('Проект на паузе — восстанавливаю…');
      await api('POST', `/projects/${ref}/restore`).catch(() => {});
    }
    if (i === 89) throw new Error('Проект так и не запустился. Попробуйте позже.');
    await sleep(5000);
  }

  // ---------- Схема базы ----------
  log('Создаю таблицы и правила безопасности…');
  const sql = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
  for (let i = 0; ; i++) {
    try { await api('POST', `/projects/${ref}/database/query`, { query: sql }); break; } catch (e) {
      if (i >= 5) throw e;
      await sleep(5000); // база иногда ещё не принимает подключения
    }
  }

  // ---------- Ключи ----------
  const keys = await api('GET', `/projects/${ref}/api-keys`);
  const anon = keys.find((k) => k.name === 'anon')?.api_key;
  if (!anon) throw new Error('Не удалось получить anon key');
  const url = `https://${ref}.supabase.co`;

  // ---------- Адрес сайта ----------
  let site = state.site || '';
  if (!site) {
    const gh = await ask('Ваш логин на GitHub (для адреса сайта; Enter — пропустить)');
    if (gh) site = `https://${gh.toLowerCase()}.github.io/${PROJECT_NAME}/`;
  }

  // ---------- Настройки входа ----------
  log('Настраиваю вход по email и паролю…');
  const allow = [site, site && site + '**', 'http://localhost:5173/**'].filter(Boolean).join(',');
  await api('PATCH', `/projects/${ref}/config/auth`, {
    site_url: site || 'http://localhost:5173/',
    uri_allow_list: allow,
    external_email_enabled: true,
    // Встроенная почта Supabase отправляет лишь несколько писем в час,
    // поэтому подтверждение email отключено — иначе новые пользователи не смогут зарегистрироваться.
    mailer_autoconfirm: true,
    password_min_length: 6,
    disable_signup: false,
  });

  // ---------- .env ----------
  const env = [
    '# Публичные настройки клиента (anon key защищён правилами RLS и может быть публичным)',
    `VITE_SUPABASE_URL=${url}`,
    `VITE_SUPABASE_ANON_KEY=${anon}`,
    `VITE_SITE_URL=${site}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, '.env'), env);
  writeState({ ...readState(), ref, site });

  // проверка
  const ping = await fetch(`${url}/rest/v1/rpc/ping`, { method: 'POST', headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }, body: '{}' });
  log(ping.ok ? 'Проверка связи: OK' : `Проверка связи вернула ${ping.status}`);

  console.log('\n✅ Готово! Ключи записаны в файл .env.');
  console.log('   Токен нигде не сохранён. Его можно удалить на странице токенов Supabase.\n');
}

main()
  .catch((e) => { console.error('\n❌ Ошибка:', e.message, '\n'); process.exitCode = 1; })
  .finally(() => rl.close());
