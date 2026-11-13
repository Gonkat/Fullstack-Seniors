'use strict';

/**
 * Хранилище MVP: JSON-документ на диске с атомарной записью.
 * Слой намеренно изолирован (load/save/mutate), чтобы заменить его на
 * PostgreSQL/1С-совместимую БД без изменения бизнес-логики и API.
 */

const fs = require('fs');
const path = require('path');
const { buildSeed } = require('./seed');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

let state = null;

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function load() {
  if (state) return state;
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return state;
  }
  state = buildSeed(new Date());
  persist();
  return state;
}

function persist() {
  ensureDirs();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Документ небольшой, поэтому пишем сразу: изменения переживают остановку процесса. */
function save() {
  persist();
}

function mutate(fn) {
  load();
  const result = fn(state);
  save();
  return result;
}

function reset() {
  state = buildSeed(new Date());
  persist();
  return state;
}

function uploadsDir() {
  ensureDirs();
  return UPLOAD_DIR;
}

module.exports = { load, save, persist, mutate, reset, uploadsDir, DATA_DIR, DB_FILE, UPLOAD_DIR };
