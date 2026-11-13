/*
 * Слой доступа к данным «Модус Сигнал».
 *
 * Один интерфейс request(path, options) с контрактом /api/*:
 *   - apiMode = 'server' — запросы уходят в собственный API (server/index.js),
 *     который можно перевести на PostgreSQL без изменений клиента;
 *   - apiMode = 'mokky'  — тот же контракт исполняется в браузере поверх
 *     Mokky.dev: настоящие GET/POST/PATCH/DELETE, данные сохраняются на сервере.
 *
 * Доменные правила и представления берутся из public/shared/*, поэтому
 * поведение обоих режимов совпадает.
 */
import { CONFIG as cfg } from './config.js';
import D from './domain.js';
import V from './views.js';
import M from './mutations.js';

'use strict';

  const mode = cfg.apiMode === 'server' ? 'server' : 'mokky';
  const mokky = cfg.mokky || {};
  const baseUrl = String(mokky.baseUrl || '').replace(/\/+$/, '');
  const collection = mokky.collection || 'test';
  const uploadsResource = mokky.uploads || 'uploads';
  const timeoutMs = Number(mokky.requestTimeoutMs || 15000);
  const limits = cfg.limits || {};


  class ApiError extends Error {
    constructor(status, message, field) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.field = field;
    }
  }

  const ENTITIES = ['users', 'categories', 'appeals', 'events', 'comments', 'notifications'];

  function stripPrivate(record) {
    const copy = Object.assign({}, record);
    delete copy.docId;
    delete copy.id;
    return copy;
  }

  function withFetchTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal })).finally(() => clearTimeout(timer));
  }

  async function readJson(res) {
    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }
    return data;
  }

  async function mokkyFetch(path, options) {
    const url = `${baseUrl}/${path}`;
    const res = await withFetchTimeout(url, options);
    const data = await readJson(res);
    if (!res.ok) {
      const message = (data && (data.message || (data.error && data.error.message)))
        || `Mokky.dev: ошибка ${res.status}`;
      throw new ApiError(res.status, message);
    }
    return data;
  }

  /* ---------------- Состояние из Mokky ---------------- */

  async function loadState() {
    const docs = await mokkyFetch(collection);
    if (!Array.isArray(docs)) {
      throw new ApiError(502, 'Mokky.dev вернул неожиданный формат данных.');
    }
    const state = { users: [], categories: [], appeals: [], events: [], comments: [], notifications: [], meta: null };

    for (const doc of docs) {
      const entity = doc.entity;
      if (entity === 'meta') {
        const meta = stripPrivate(doc);
        delete meta.entity;
        delete meta.uid;
        state.meta = meta;
        continue;
      }
      if (!ENTITIES.includes(entity)) continue;
      const record = Object.assign({}, doc, {
        id: doc.uid || String(doc.id),
        docId: doc.id,
      });
      state[entity].push(record);
    }

    if (!state.meta) {
      state.meta = { seededAt: null, schemaVersion: 1, demo: true };
    }
    return state;
  }

  function snapshot(state) {
    const map = new Map();
    for (const entity of ENTITIES) {
      for (const record of state[entity]) {
        map.set(`${entity}:${record.id}`, JSON.stringify(stripPrivate(record)));
      }
    }
    return map;
  }

  async function persist(original, state, now) {
    for (const entity of ENTITIES) {
      const before = new Set();
      for (const key of original.keys()) {
        if (key.startsWith(`${entity}:`)) before.add(key.slice(entity.length + 1));
      }

      for (const record of state[entity]) {
        const key = `${entity}:${record.id}`;
        const currentJson = JSON.stringify(stripPrivate(record));
        if (!actuallyExisted(original, key)) {
          const body = Object.assign({ entity, uid: record.id }, stripPrivate(record));
          const created = await mokkyFetch(collection, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({}, body, { updatedAt: body.updatedAt || now })),
          });
          record.docId = created && created.id;
          original.set(key, currentJson);
        } else if (original.get(key) !== currentJson) {
          if (!record.docId) continue;
          await mokkyFetch(`${collection}/${record.docId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ entity, uid: record.id }, stripPrivate(record))),
          });
          original.set(key, currentJson);
        }
      }

      // Удаление записей, которых больше нет в состоянии.
      for (const uid of before) {
        if (!state[entity].some((r) => r.id === uid)) {
          const doc = await findDocId(entity, uid);
          if (doc) await mokkyFetch(`${collection}/${doc}`, { method: 'DELETE' });
        }
      }
    }
  }

  function actuallyExisted(original, key) {
    return original.has(key);
  }

  async function findDocId(entity, uid) {
    const docs = await mokkyFetch(collection);
    const doc = docs.find((d) => d.entity === entity && d.uid === uid);
    return doc ? doc.id : null;
  }

  async function mutateState(user, fn) {
    const state = await loadState();
    if (!user || !state.users.some((u) => u.id === user.id)) {
      throw new ApiError(401, 'Не выполнен вход: выберите демонстрационного пользователя.');
    }
    const currentUser = state.users.find((u) => u.id === user.id);
    const original = snapshot(state);
    const result = fn(state, currentUser);
    await persist(original, state, new Date().toISOString());
    return result;
  }

  /* ---------------- Файлы ---------------- */

  function base64ToBlob(dataBase64, mime) {
    const binary = atob(String(dataBase64));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  }

  async function prepareAttachments(files) {
    const result = [];
    const maxInline = Number(limits.mokkyInlineAttachmentMaxMb || 0.7) * 1024 * 1024;
    for (const file of files || []) {
      if (!file || !file.name || !file.dataBase64) continue;
      const id = M.newId('f');
      const mime = file.mime || 'application/octet-stream';
      try {
        const form = new FormData();
        form.append('file', base64ToBlob(file.dataBase64, mime), file.name);
        const uploaded = await mokkyFetch(uploadsResource, { method: 'POST', body: form });
        if (uploaded && uploaded.url) {
          result.push({ id, name: String(file.name).slice(0, 120), size: Number(file.size || 0), mime, url: uploaded.url });
          continue;
        }
      } catch (err) {
        // Ресурс /uploads не включён в проекте Mokky — используем встроенный файл.
      }
      if (Number(file.size || 0) > maxInline) {
        throw new ApiError(
          413,
          `Файл «${file.name}» не загружен: включите «Загрузку файлов» в настройках проекта Mokky.dev (ресурс /uploads) или уменьшите файл до ${Math.round(maxInline / 1024 / 1024 * 10) / 10} МБ.`,
          'attachments',
        );
      }
      result.push({
        id,
        name: String(file.name).slice(0, 120),
        size: Number(file.size || 0),
        mime,
        dataBase64: file.dataBase64,
        url: `data:${mime};base64,${file.dataBase64}`,
      });
    }
    return result.slice(0, Number(limits.maxFiles || 3));
  }

  /* ---------------- Маршруты Mokky-режима ---------------- */

  function parsePath(pathname) {
    const [rawPath, rawQuery] = String(pathname).split('?');
    return {
      path: rawPath.replace(/\/+$/, ''),
      query: new URLSearchParams(rawQuery || ''),
    };
  }

  function queryObject(params) {
    const out = {};
    for (const [key, value] of params.entries()) out[key] = value;
    return out;
  }

  function requireStateUser(state, user) {
    if (!user) throw new ApiError(401, 'Не выполнен вход: выберите демонстрационного пользователя.');
    const found = state.users.find((u) => u.id === user.id);
    if (!found) throw new ApiError(401, 'Демонстрационный пользователь не найден.');
    return found;
  }

  async function handleMokky(pathname, options) {
    const method = String((options && options.method) || 'GET').toUpperCase();
    const body = options && options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
      ? options.body
      : {};
    const user = options && options.user;
    const { path, query } = parsePath(pathname);

    if (path === '/api/health') return { ok: true, demo: true, apiMode: 'mokky' };

    if (path === '/api/users') {
      const state = await loadState();
      return { users: state.users.map(V.publicUser), categories: state.categories };
    }

    if (path === '/api/admin/reset' && method === 'POST') {
      const state = await loadState();
      requireStateUser(state, user);
      if (state.users.find((u) => u.id === user.id).role !== 'admin') {
        throw new ApiError(403, 'Сброс данных доступен только администратору.');
      }
      const seeded = await resetCollection();
      return { ok: true, meta: seeded.meta };
    }

    const state = await loadState();

    if (path === '/api/bootstrap' && method === 'GET') {
      return V.bootstrap(state, requireStateUser(state, user));
    }

    if (path === '/api/appeals' && method === 'GET') {
      const current = requireStateUser(state, user);
      const list = V.visibleAppeals(state, current, queryObject(query)).map((a) => V.decorate(state, a));
      return { appeals: list, total: list.length };
    }

    if (path === '/api/appeals' && method === 'POST') {
      const current = requireStateUser(state, user);
      const attachments = await prepareAttachments(body.attachments);
      const fresh = await loadState();
      const freshUser = fresh.users.find((u) => u.id === current.id);
      const original = snapshot(fresh);
      const result = M.createAppeal(fresh, freshUser, body, attachments, new Date().toISOString());
      await persist(original, fresh, new Date().toISOString());
      return result;
    }

    const detailMatch = /^\/api\/appeals\/([^/]+)$/.exec(path);
    if (detailMatch && method === 'GET') {
      const view = V.appealView(state, requireStateUser(state, user), decodeURIComponent(detailMatch[1]));
      if (view.error) throw new ApiError(view.status, view.error);
      return view;
    }

    if (detailMatch && method === 'PATCH') {
      const current = requireStateUser(state, user);
      const original = snapshot(state);
      const result = M.patchAppeal(state, current, decodeURIComponent(detailMatch[1]), body, new Date().toISOString());
      await persist(original, state, new Date().toISOString());
      return result;
    }

    const commentMatch = /^\/api\/appeals\/([^/]+)\/comments$/.exec(path);
    if (commentMatch && method === 'POST') {
      const current = requireStateUser(state, user);
      const original = snapshot(state);
      const result = M.addComment(state, current, decodeURIComponent(commentMatch[1]), body, new Date().toISOString());
      await persist(original, state, new Date().toISOString());
      return result;
    }

    const decisionMatch = /^\/api\/appeals\/([^/]+)\/decision$/.exec(path);
    if (decisionMatch && method === 'POST') {
      const current = requireStateUser(state, user);
      const original = snapshot(state);
      const result = M.setDecision(state, current, decodeURIComponent(decisionMatch[1]), body, new Date().toISOString());
      await persist(original, state, new Date().toISOString());
      return result;
    }

    if (path === '/api/notifications' && method === 'GET') {
      return V.notifications(state, requireStateUser(state, user));
    }

    if (path === '/api/notifications/read' && method === 'POST') {
      const current = requireStateUser(state, user);
      const original = snapshot(state);
      const result = M.markNotificationsRead(state, current, body.ids);
      await persist(original, state, new Date().toISOString());
      return result;
    }

    if (path === '/api/analytics' && method === 'GET') {
      return V.analytics(state, requireStateUser(state, user), queryObject(query));
    }

    if (path === '/api/admin/overview' && method === 'GET') {
      const current = requireStateUser(state, user);
      if (current.role !== 'admin') throw new ApiError(403, 'Действие доступно только администратору системы.');
      return V.adminOverview(state);
    }

    const categoryMatch = /^\/api\/categories\/([^/]+)$/.exec(path);
    if (categoryMatch && method === 'PATCH') {
      const current = requireStateUser(state, user);
      const original = snapshot(state);
      const result = M.updateCategory(state, current, decodeURIComponent(categoryMatch[1]), body, new Date().toISOString());
      await persist(original, state, new Date().toISOString());
      return result;
    }

    if (path === '/api/categories' && method === 'POST') {
      const current = requireStateUser(state, user);
      const original = snapshot(state);
      const result = M.createCategory(state, current, body, new Date().toISOString());
      await persist(original, state, new Date().toISOString());
      return result;
    }

    throw new ApiError(404, `Неизвестный маршрут API: ${method} ${path}`);
  }

  async function resetCollection() {
    await mokkyFetch(collection, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
    });

    const res = await fetch('/seed.json', { cache: 'no-store' });
    if (!res.ok) throw new ApiError(500, 'Не удалось загрузить seed.json для демо-данных.');
    const seed = await res.json();
    const records = [];
    for (const entity of ENTITIES) {
      for (const item of seed[entity] || []) {
        const copy = Object.assign({}, item);
        delete copy.id;
        records.push(Object.assign({ entity, uid: item.id }, copy));
      }
    }
    records.push(Object.assign({ entity: 'meta', uid: 'meta' }, seed.meta || {}));

    for (const record of records) {
      await mokkyFetch(collection, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    }

    const fresh = await loadState();
    return { meta: fresh.meta, counts: ENTITIES.reduce((acc, e) => Object.assign(acc, { [e]: fresh[e].length }), {}) };
  }

  /* ---------------- Серверный режим ---------------- */

  async function handleServer(pathname, options) {
    const headers = Object.assign({}, options && options.headers);
    if (options && options.user) headers['x-user-id'] = options.user.id;
    let body = options && options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await withFetchTimeout(`${(cfg.server && cfg.server.baseUrl) || ''}${pathname}`, {
      method: (options && options.method) || 'GET',
      headers,
      body,
    });
    const data = await readJson(res);
    if (!res.ok) {
      const message = (data && data.error && data.error.message) || `Ошибка ${res.status}`;
      throw new ApiError(res.status, message, data && data.error && data.error.field);
    }
    return data;
  }

  async function request(pathname, options) {
    return mode === 'mokky' ? handleMokky(pathname, options) : handleServer(pathname, options);
  }

  const backend = {
    mode,
    request,
    loadState,
    resetCollection,
    config: cfg,
  };

export default backend;
export { mode, request, loadState, resetCollection };
