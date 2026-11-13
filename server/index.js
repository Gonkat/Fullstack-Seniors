'use strict';

/**
 * HTTP-API системы «Модус Сигнал» (режим собственного backend).
 *
 * Транспорт и загрузка файлов — здесь; доменные правила, чтение и изменения
 * находятся в public/shared/*, поэтому тот же код работает в браузере при
 * подключении временного backend Mokky.dev.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const store = require('./store');
const D = require('./domain');
const V = require('../public/shared/views');
const M = require('../public/shared/mutations');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, '..', 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const state = () => store.load();

function currentUser(req) {
  const id = req.get('x-user-id');
  if (!id) return null;
  return state().users.find((u) => u.id === id) || null;
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) {
    return res.status(401).json({ error: { message: 'Не выполнен вход: выберите демонстрационного пользователя.' } });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: { message: 'Действие доступно только администратору системы.' } });
  }
  next();
}

function sendError(res, err) {
  if (err && err.name === 'ApiError') {
    return res.status(err.status || 400).json({ error: { message: err.message, field: err.field } });
  }
  throw err;
}

/* ---------- Справочники и вход ---------- */

app.get('/api/health', (req, res) => res.json({ ok: true, demo: true }));

app.get('/api/users', (req, res) => {
  const s = state();
  res.json({ users: s.users.map(V.publicUser), categories: s.categories });
});

app.get('/api/bootstrap', requireUser, (req, res) => {
  res.json(V.bootstrap(state(), req.user));
});

/* ---------- Обращения ---------- */

app.get('/api/appeals', requireUser, (req, res) => {
  const s = state();
  const list = V.visibleAppeals(s, req.user, req.query).map((a) => V.decorate(s, a));
  res.json({ appeals: list, total: list.length });
});

app.get('/api/appeals/:id', requireUser, (req, res) => {
  const view = V.appealView(state(), req.user, req.params.id);
  if (view.error) return res.status(view.status).json({ error: { message: view.error } });
  res.json(view);
});

app.post('/api/appeals', requireUser, (req, res) => {
  const s = state();
  const body = req.body || {};
  const attachments = [];

  const files = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) : [];
  for (const file of files) {
    if (!file || !file.name || !file.dataBase64) continue;
    const buffer = Buffer.from(String(file.dataBase64), 'base64');
    if (buffer.length === 0 || buffer.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: { message: 'Вложение не должно превышать 3 МБ.', field: 'attachments' } });
    }
    const attachmentId = crypto.randomUUID();
    const storedName = `${attachmentId}.bin`;
    fs.writeFileSync(path.join(store.uploadsDir(), storedName), buffer);
    attachments.push({
      id: attachmentId,
      name: String(file.name).slice(0, 120),
      size: buffer.length,
      mime: String(file.mime || 'application/octet-stream'),
      storedName,
    });
  }

  try {
    const now = new Date().toISOString();
    const result = store.mutate((st) => M.createAppeal(st, req.user, body, attachments, now));
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.patch('/api/appeals/:id', requireUser, (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = store.mutate((st) => M.patchAppeal(st, req.user, req.params.id, req.body || {}, now));
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/appeals/:id/comments', requireUser, (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = store.mutate((st) => M.addComment(st, req.user, req.params.id, req.body || {}, now));
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/appeals/:id/decision', requireUser, (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = store.mutate((st) => M.setDecision(st, req.user, req.params.id, req.body || {}, now));
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

/* ---------- Файлы ---------- */

app.get('/api/attachments/:attachmentId', requireUser, (req, res) => {
  const s = state();
  const appeal = s.appeals.find((a) => (a.attachments || []).some((f) => f.id === req.params.attachmentId));
  if (!appeal) return res.status(404).json({ error: { message: 'Файл не найден.' } });
  if (!D.canView(req.user, appeal)) return res.status(403).json({ error: { message: 'Нет доступа к файлу.' } });
  const file = appeal.attachments.find((f) => f.id === req.params.attachmentId);
  const filePath = path.join(store.uploadsDir(), file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: { message: 'Файл отсутствует в хранилище.' } });
  res.setHeader('Content-Type', file.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.sendFile(filePath);
});

/* ---------- Уведомления ---------- */

app.get('/api/notifications', requireUser, (req, res) => {
  res.json(V.notifications(state(), req.user));
});

app.post('/api/notifications/read', requireUser, (req, res) => {
  const ids = Array.isArray((req.body || {}).ids) ? req.body.ids : null;
  const result = store.mutate((st) => M.markNotificationsRead(st, req.user, ids));
  res.json(result);
});

/* ---------- Аналитика ---------- */

app.get('/api/analytics', requireUser, (req, res) => {
  res.json(V.analytics(state(), req.user, req.query));
});

/* ---------- Администрирование ---------- */

app.get('/api/admin/overview', requireUser, requireAdmin, (req, res) => {
  res.json(V.adminOverview(state()));
});

app.patch('/api/categories/:id', requireUser, requireAdmin, (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = store.mutate((st) => M.updateCategory(st, req.user, req.params.id, req.body || {}, now));
    res.json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/categories', requireUser, requireAdmin, (req, res) => {
  try {
    const now = new Date().toISOString();
    const result = store.mutate((st) => M.createCategory(st, req.user, req.body || {}, now));
    res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/admin/reset', requireUser, requireAdmin, (req, res) => {
  store.reset();
  res.json({ ok: true, meta: state().meta });
});

/* ---------- Статика ---------- */

app.use(express.static(PUBLIC_DIR, { index: 'index.html' }));
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }
  return next();
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Слишком большой запрос: уменьшите размер вложений.' } });
  }
  console.error('[api] error:', err);
  res.status(500).json({ error: { message: 'Внутренняя ошибка сервера.' } });
});

if (require.main === module) {
  store.load();
  app.listen(PORT, () => {
    console.log(`Модус Сигнал · демо-сервер запущен на http://localhost:${PORT}`);
  });
}

module.exports = app;
