'use strict';

/**
 * Экспорт демонстрационного набора в public/seed.json.
 * Используется кнопкой «Сбросить демо-данные» в режиме Mokky.dev
 * и скриптом seed:mokky для первичного наполнения хранилища.
 */

const fs = require('fs');
const path = require('path');
const { buildSeed } = require('../server/seed');

const seed = buildSeed(new Date());
const outFile = path.join(__dirname, '..', 'public', 'seed.json');
fs.writeFileSync(outFile, JSON.stringify(seed, null, 1));

console.log(`seed.json: ${seed.appeals.length} обращений, ${seed.users.length} пользователей, ${seed.categories.length} категорий.`);
console.log(`Файл: ${outFile}`);
