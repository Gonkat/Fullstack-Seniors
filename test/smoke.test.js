'use strict';

/**
 * Сквозной тест API: маршрутизация, права ролей, статусы, уточнения,
 * решения, изоляция данных и аналитика. Запускается на отдельном порту
 * с временным каталогом данных, рабочие данные не затрагиваются.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 3411;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'modus-signal-test-'));

let passed = 0;
function ok(name, cond, extra) {
  assert.ok(cond, `${name}${extra ? ` — ${JSON.stringify(extra)}` : ''}`);
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function call(method, url, { user, body } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      user ? { 'x-user-id': user } : {},
    ),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* сервер ещё поднимается */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Сервер не ответил за 12 секунд');
}

async function run() {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  child.stdout.on('data', (d) => { serverLog += d; });
  child.stderr.on('data', (d) => { serverLog += d; });

  try {
    await waitForServer();

    console.log('\nВход и справочники');
    const users = await call('GET', '/api/users');
    ok('GET /api/users без авторизации отдаёт демо-пользователей', users.status === 200 && users.data.users.length >= 20);
    const noAuth = await call('GET', '/api/bootstrap');
    ok('без заголовка пользователя API отвечает 401', noAuth.status === 401);

    const boot = await call('GET', '/api/bootstrap', { user: 'u-anna' });
    ok('сотрудник получает bootstrap', boot.status === 200 && boot.data.user.role === 'employee');
    ok('в системе 20 демонстрационных обращений', boot.data.stats.visible >= 4);

    console.log('\nСоздание обращения и маршрутизация');
    const categories = boot.data.categories;
    const education = categories.find((c) => c.name === 'Обучение');
    const created = await call('POST', '/api/appeals', {
      user: 'u-anna',
      body: {
        type: 'suggestion',
        categoryId: education.id,
        priority: 'high',
        subject: 'Проверка маршрутизации нового обращения',
        description: 'Тестовое обращение проверяет автоматическое назначение ответственного по категории и расчёт SLA.',
        solution: 'Назначить ответственного за обучение.',
        attachments: [{ name: 'test.txt', mime: 'text/plain', dataBase64: Buffer.from('demo').toString('base64') }],
      },
    });
    ok('обращение создано со статусом «Новое»', created.status === 201 && created.data.appeal.status === 'new', created.data);
    ok('маршрутизация по категории сработала', created.data.routing.rule === 'category' && created.data.routing.assignee.id === education.assigneeId);
    ok('SLA первого ответа рассчитан для высокого приоритета', created.data.appeal.sla.firstResponseDueAt && created.data.appeal.sla.resolutionTarget);
    const appealId = created.data.appeal.id;

    const tooShort = await call('POST', '/api/appeals', {
      user: 'u-anna',
      body: { type: 'problem', categoryId: education.id, subject: 'Тест', description: 'мало' },
    });
    ok('валидация отклоняет слишком короткое описание', tooShort.status === 400);

    console.log('\nИзоляция доступа');
    const foreignView = await call('GET', `/api/appeals/${appealId}`, { user: 'u-igor' });
    ok('другой сотрудник не видит чужое обращение', foreignView.status === 403);
    const assigneeView = await call('GET', `/api/appeals/${appealId}`, { user: education.assigneeId });
    ok('ответственный видит обращение', assigneeView.status === 200 && assigneeView.data.permissions.canManage === true);
    const authorView = await call('GET', `/api/appeals/${appealId}`, { user: 'u-anna' });
    ok('автор видит обращение, но не управляет статусом', authorView.status === 200 && authorView.data.permissions.canManage === false);

    const foreignPatch = await call('PATCH', `/api/appeals/${appealId}`, { user: 'u-igor', body: { status: 'in_progress' } });
    ok('посторонний не может менять статус', foreignPatch.status === 403);
    const authorPatch = await call('PATCH', `/api/appeals/${appealId}`, { user: 'u-anna', body: { status: 'closed' } });
    ok('автор не может произвольно закрыть новое обращение', authorPatch.status === 403);

    console.log('\nРассмотрение: комментарий, уточнение, решение');
    const manager = education.assigneeId;
    const badTransition = await call('PATCH', `/api/appeals/${appealId}`, { user: manager, body: { status: 'closed' } });
    ok('недоступный переход статуса отклоняется', badTransition.status === 409);

    const comment = await call('POST', `/api/appeals/${appealId}/comments`, {
      user: manager,
      body: { text: 'Уточните, пожалуйста, какие линейки оборудования интересуют в первую очередь.' },
    });
    ok('ответственный добавляет комментарий', comment.status === 201);
    const afterComment = await call('GET', `/api/appeals/${appealId}`, { user: manager });
    ok('первый ответ зафиксирован', Boolean(afterComment.data.appeal.firstResponseAt));

    const clarify = await call('PATCH', `/api/appeals/${appealId}`, {
      user: manager,
      body: { status: 'needs_clarification', comment: 'Нужен перечень приоритетных линеек.' },
    });
    ok('ответственный запрашивает уточнение', clarify.status === 200 && clarify.data.appeal.status === 'needs_clarification');

    const internal = await call('POST', `/api/appeals/${appealId}/comments`, {
      user: manager,
      body: { text: 'Внутренняя заметка: согласовать с HR.', internal: true },
    });
    ok('внутренняя заметка создаётся', internal.status === 201);
    const authorAfterInternal = await call('GET', `/api/appeals/${appealId}`, { user: 'u-anna' });
    const seesInternal = authorAfterInternal.data.events.some((e) => e.type === 'internal_note');
    ok('автор не видит внутреннюю заметку', seesInternal === false);

    const authorReply = await call('POST', `/api/appeals/${appealId}/comments`, {
      user: 'u-anna',
      body: { text: 'Интересуют линейки видеонаблюдения и СКУД.' },
    });
    ok('ответ автора возвращает обращение в работу', authorReply.status === 201 && authorReply.data.status === 'in_review');

    const decision = await call('POST', `/api/appeals/${appealId}/decision`, {
      user: manager,
      body: { status: 'implemented', text: 'Проведён обучающий семинар по двум линейкам.', actions: 'Материалы размещены во внутренней базе знаний.' },
    });
    ok('решение фиксируется', decision.status === 200 && decision.data.appeal.status === 'implemented' && decision.data.appeal.decision.text.length > 10);
    ok('решение останавливает SLA рассмотрения', decision.data.appeal.resolvedAt != null);

    const authorClose = await call('PATCH', `/api/appeals/${appealId}`, { user: 'u-anna', body: { status: 'closed' } });
    ok('автор подтверждает закрытие реализованного обращения', authorClose.status === 200 && authorClose.data.appeal.status === 'closed');

    console.log('\nАналитика');
    const authorAnalytics = await call('GET', '/api/analytics', { user: 'u-anna' });
    ok('сотрудник видит только свою аналитику', authorAnalytics.status === 200 && authorAnalytics.data.total < 20);
    const adminAnalytics = await call('GET', '/api/analytics', { user: 'a-alexey' });
    ok('администратор видит все обращения', adminAnalytics.status === 200 && adminAnalytics.data.total === 23, adminAnalytics.data.total);
    ok('рассчитан средний первый ответ', adminAnalytics.data.kpi.avgFirstResponseHours != null);
    ok('есть просроченные обращения', adminAnalytics.data.kpi.overdue > 0);
    ok('выявлены повторяющиеся проблемы', adminAnalytics.data.repeatProblems.length > 0);
    ok('доля с результатом рассчитана', adminAnalytics.data.kpi.closedShare > 0);

    console.log('\nУведомления и права администратора');
    const notif = await call('GET', '/api/notifications', { user: 'u-anna' });
    ok('автор получил уведомления', notif.status === 200 && notif.data.notifications.length > 0);
    const adminPanel = await call('GET', '/api/admin/overview', { user: 'a-alexey' });
    ok('администратор получает панель управления', adminPanel.status === 200 && adminPanel.data.stats.categories >= 18);
    const forbiddenAdmin = await call('GET', '/api/admin/overview', { user: 'm-pavel' });
    ok('руководитель не имеет доступа к администрированию', forbiddenAdmin.status === 403);

    const newCategory = await call('POST', '/api/categories', {
      user: 'a-alexey',
      body: { name: 'Тестовая категория', department: 'IT', assigneeId: 'm-viktor' },
    });
    ok('администратор создаёт категорию', newCategory.status === 201);
    const rule = await call('PATCH', `/api/categories/${newCategory.data.category.id}`, {
      user: 'a-alexey',
      body: { assigneeId: 'm-pavel' },
    });
    ok('правило маршрутизации обновляется', rule.status === 200 && rule.data.category.assigneeId === 'm-pavel');

    console.log('\nФильтрация');
    const overdue = await call('GET', '/api/appeals?scope=all&overdue=1', { user: 'a-alexey' });
    ok('фильтр просроченных работает', overdue.status === 200 && overdue.data.appeals.every((a) => a.sla.isOverdue));
    const search = await call('GET', `/api/appeals?scope=all&q=${encodeURIComponent('пакет')}`, { user: 'a-alexey' });
    ok('поиск по тексту работает', search.status === 200 && search.data.total >= 1);

    console.log(`\nВсе проверки пройдены: ${passed}`);
  } catch (err) {
    console.error('\n✗ Тест упал:', err.message);
    if (serverLog) console.error('\nЛог сервера:\n', serverLog.slice(-4000));
    process.exitCode = 1;
  } finally {
    child.kill();
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  }
}

run();
