'use strict';

/**
 * Первичное наполнение временного backend Mokky.dev демо-данными.
 *
 * В проекте Mokky.dev должен существовать ресурс (по умолчанию /test).
 * Скрипт очищает его и записывает демонстрационный набор через настоящие
 * POST-запросы. Запуск: npm run seed:mokky
 *
 * Переопределения: MOKKY_BASE_URL, MOKKY_COLLECTION.
 */

const fs = require('fs');
const path = require('path');

global.window = {};
require('../legacy/config.js');
const cfg = global.window.MODUS_CONFIG.mokky;

const BASE_URL = String(process.env.MOKKY_BASE_URL || cfg.baseUrl).replace(/\/+$/, '');
const COLLECTION = process.env.MOKKY_COLLECTION || cfg.collection;
const ENTITIES = ['users', 'categories', 'appeals', 'events', 'comments', 'notifications'];

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'seed.json'), 'utf8'));

async function request(url, options, attempt) {
  const tries = attempt || 0;
  const res = await fetch(url, options);
  if (res.status === 429 || res.status >= 500) {
    if (tries < 4) {
      const wait = 500 * (tries + 1);
      console.log(`  … ${res.status}, повтор через ${wait} мс`);
      await new Promise((r) => setTimeout(r, wait));
      return request(url, options, tries + 1);
    }
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${url} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log(`Mokky.dev: ${BASE_URL}/${COLLECTION}`);
  console.log('Очистка ресурса…');
  await request(`${BASE_URL}/${COLLECTION}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: '[]',
  });

  const records = [];
  for (const entity of ENTITIES) {
    for (const item of seed[entity] || []) {
      const copy = Object.assign({}, item);
      delete copy.id;
      records.push(Object.assign({ entity, uid: item.id }, copy));
    }
  }
  records.push(Object.assign({ entity: 'meta', uid: 'meta' }, seed.meta));

  console.log(`Запись ${records.length} записей…`);
  let done = 0;
  for (const record of records) {
    await request(`${BASE_URL}/${COLLECTION}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    done += 1;
    if (done % 25 === 0) console.log(`  ${done}/${records.length}`);
  }

  const stored = await request(`${BASE_URL}/${COLLECTION}`);
  const counts = {};
  for (const doc of stored) counts[doc.entity] = (counts[doc.entity] || 0) + 1;
  console.log('Готово. Записей в Mokky:', stored.length, counts);
  if ((counts.appeals || 0) !== seed.appeals.length) {
    throw new Error('Количество обращений не совпало с seed.json.');
  }
}

main().catch((err) => {
  console.error('Ошибка наполнения Mokky.dev:', err.message);
  process.exitCode = 1;
});
