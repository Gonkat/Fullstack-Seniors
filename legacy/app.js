/* Модус Сигнал — демонстрационный SPA-клиент (без сборки и фреймворков) */
(function () {
  'use strict';

  const ICONS = {
    inbox: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    bell: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    back: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    out: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    file: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  };

  const STATUS_ORDER = ['new', 'in_review', 'in_progress', 'needs_clarification', 'implemented', 'rejected', 'closed'];
  const FINAL = ['implemented', 'rejected', 'closed'];
  const IS_MOKKY = window.ModusBackend && window.ModusBackend.mode === 'mokky';

  const S = {
    user: null,
    boot: null,
    notifications: [],
    bellOpen: false,
    loginUsers: null,
    loginRole: 'employee',
    loginQuery: '',
    loginError: '',
    newFiles: [],
    filters: {
      list: { scope: null, q: '', type: '', status: '', priority: '', categoryId: '', department: '', overdue: false, sort: 'updated_desc' },
    },
    emptyScopeSet: false,
  };

  /* ---------------- Утилиты ---------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const dtfDate = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dtfShort = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });
  const dtfDateTime = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function fmtDate(iso) {
    if (!iso) return '—';
    return dtfDate.format(new Date(iso));
  }
  function fmtShort(iso) {
    if (!iso) return '—';
    return dtfShort.format(new Date(iso));
  }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    return dtfDateTime.format(new Date(iso));
  }
  function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'только что';
    if (min < 60) return `${min} мин назад`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} ч назад`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d} дн назад`;
    return fmtDate(iso);
  }
  function hoursHuman(h) {
    if (h == null) return '—';
    if (h < 24) return `${Math.round(h * 10) / 10} ч`;
    const d = Math.round((h / 24) * 10) / 10;
    return `${d} дн`;
  }
  function daysHuman(h) {
    if (h == null) return '—';
    const d = Math.round((h / 24) * 10) / 10;
    return `${d} дн`;
  }
  function initials(name) {
    return String(name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }
  function avatarColor(name) {
    const palette = ['#2b4a75', '#37526b', '#4a3f6b', '#6b4a3a', '#2f5d55', '#544a2f', '#3f4b6b', '#5a3550'];
    let hash = 0;
    for (const ch of String(name || '')) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
    return palette[hash % palette.length];
  }
  function avatar(name, cls) {
    return `<span class="avatar ${cls || ''}" style="background:${avatarColor(name)}">${esc(initials(name))}</span>`;
  }
  function bytes(n) {
    if (n < 1024) return `${n} Б`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
    return `${(n / 1024 / 1024).toFixed(1)} МБ`;
  }
  function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }
  function statusChip(status, label) {
    const text = label || (S.boot && S.boot.dictionaries.statuses[status]) || status;
    return `<span class="chip status-${esc(status)}"><span class="chip-dot"></span>${esc(text)}</span>`;
  }
  function typeChip(type, label) {
    const text = label || (S.boot && S.boot.dictionaries.types[type]) || type;
    return `<span class="chip type-${esc(type)}">${esc(text)}</span>`;
  }
  function priorityChip(priority, label) {
    const text = label || (S.boot && S.boot.dictionaries.priorities[priority]) || priority;
    return `<span class="chip prio-${esc(priority)}">${esc(text)}</span>`;
  }
  function options(map, current, emptyLabel) {
    const entries = Object.entries(map);
    return (emptyLabel ? `<option value="">${esc(emptyLabel)}</option>` : '') +
      entries.map(([k, v]) => `<option value="${esc(k)}"${k === current ? ' selected' : ''}>${esc(v)}</option>`).join('');
  }
  function withDefault(text) {
    return `<option value="">${esc(text)}</option>`;
  }

  async function api(path, opts) {
    const options = Object.assign({}, opts);
    options.user = S.user;
    try {
      return await window.ModusBackend.request(path, options);
    } catch (err) {
      if (err.status === 401 && S.user) signOut(true);
      throw err;
    }
  }

  function attachmentHref(file) {
    return file.url || `/api/attachments/${encodeURIComponent(file.id)}`;
  }

  function toast(message, kind) {
    const root = $('#toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast ${kind || ''}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, arguments), ms);
    };
  }

  function renderApp(html) {
    const active = document.activeElement;
    const focusId = active && active.id && document.body.contains(active) ? active.id : null;
    let start = null;
    let end = null;
    try {
      start = active.selectionStart;
      end = active.selectionEnd;
    } catch (err) { /* поле без выделения */ }
    const scroll = window.scrollY;
    $('#app').innerHTML = html;
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) {
        el.focus();
        try {
          if (start != null) el.setSelectionRange(start, end);
        } catch (err) { /* не текстовое поле */ }
      }
    }
    if (scroll > 0) window.scrollTo(0, scroll);
  }

  /* ---------------- Маршрутизация ---------------- */

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { name: 'list' };
    if (parts[0] === 'appeal') return { name: 'appeal', id: parts[1] };
    if (['new', 'analytics', 'admin', 'login'].includes(parts[0])) return { name: parts[0] };
    return { name: 'list' };
  }

  function go(hash) {
    if (location.hash === hash) return route();
    location.hash = hash;
  }

  /* ---------------- Вход ---------------- */

  async function loadLoginUsers() {
    const data = await api('/api/users');
    S.loginUsers = { users: data.users, categories: data.categories };
  }

  function loginHtml() {
    const users = (S.loginUsers && S.loginUsers.users) || [];
    const roles = [
      ['employee', 'Сотрудники'],
      ['manager', 'Руководители'],
      ['admin', 'Администратор'],
    ];
    const query = S.loginQuery.trim().toLowerCase();
    const filtered = users.filter(
      (u) => u.role === S.loginRole && (!query || `${u.name} ${u.position} ${u.department}`.toLowerCase().includes(query)),
    );

    return `
    <div class="login">
      <div class="login-brand">
        <div class="brand">
          <div class="brand-mark">М</div>
          <div>
            <div class="brand-name">Модус Сигнал</div>
            <div class="brand-sub">ГК «Модус Трейд»</div>
          </div>
        </div>
        <div class="login-hero">
          <div class="login-eyebrow">Внутренний канал обратной связи</div>
          <h1>Проблемы и предложения сотрудников — на виду, а не в переписке</h1>
          <p>Единый канал для сообщений о проблемах и улучшениях. Обращение регистрируется, автоматически направляется ответственному по категории и остаётся в истории вместе с решением.</p>
          <div class="login-points">
            <div class="login-point"><span class="dot">1</span><div><b>Подача за минуту.</b> Тип, категория, описание и материалы в одной форме.</div></div>
            <div class="login-point"><span class="dot">2</span><div><b>Маршрутизация по правилам.</b> Ответственный по категории и SLA первого ответа.</div></div>
            <div class="login-point"><span class="dot">3</span><div><b>Прозрачный результат.</b> Автор видит статус, уточнения и обоснованное решение.</div></div>
            <div class="login-point"><span class="dot">4</span><div><b>Аналитика.</b> Просрочки, повторяющиеся проблемы и доля закрытых обращений.</div></div>
          </div>
        </div>            <div class="login-foot">Демонстрационный стенд хакатона · синтетические данные · вход без пароля${IS_MOKKY ? ' · данные Mokky.dev' : ''}</div>
      </div>

      <div class="login-panel">
        <div class="login-card">
          <h2>Демонстрационный вход</h2>
          <p>Выберите пользователя, чтобы увидеть систему с его ролью и правами.</p>
          ${S.loginError ? `<div class="info-note" style="border-color:#fecdca;background:#fff7f6;color:#b42318;margin-bottom:14px">${esc(S.loginError)}</div>` : ''}
          <div class="role-tabs">
            ${roles.map(([role, label]) => `<button class="role-tab${S.loginRole === role ? ' active' : ''}" data-action="login-role" data-role="${role}">${esc(label)}</button>`).join('')}
          </div>
          <div class="login-search">
            <input class="input" id="login-search" placeholder="Поиск по имени или подразделению" value="${esc(S.loginQuery)}" autocomplete="off" />
          </div>
          <div class="user-list">
            ${filtered.length
              ? filtered.map((u) => `
                <button class="user-option" data-action="login-user" data-id="${esc(u.id)}">
                  ${avatar(u.name)}
                  <span>
                    <span class="uo-name">${esc(u.name)}</span>
                    <span class="uo-sub" style="display:block">${esc(u.position)} · ${esc(u.department)}</span>
                  </span>
                  <span class="uo-arrow">→</span>
                </button>`).join('')
              : '<div class="popover-empty">Пользователи не найдены</div>'}
          </div>
          <div class="login-note">В демонстрационном стенде пароль не запрашивается: в промышленной версии вход выполняется через корпоративную учётную запись (SSO / Битрикс24). ${IS_MOKKY ? 'Сейчас данные хранятся в Mokky.dev, а роли проверяются в браузере — это временная схема до собственного backend.' : 'Права доступа в MVP проверяются на сервере.'}</div>
        </div>
      </div>
    </div>`;
  }

  async function renderLogin() {
    if (!S.loginUsers) {
      $('#app').innerHTML = '<div class="loading"><div class="spinner"></div>Загружаем демонстрационных пользователей…</div>';
      try {
        await loadLoginUsers();
      } catch (err) {
        $('#app').innerHTML = `<div class="loading">Не удалось загрузить данные: ${esc(err.message)}<br>${IS_MOKKY ? 'Проверьте подключение к Mokky.dev и наличие ресурса /test.' : 'Проверьте, что сервер запущен.'}</div>`;
        return;
      }
    }
    renderApp(loginHtml());
  }

  function signOut(silent) {
    localStorage.removeItem('modus.signal.user');
    S.user = null;
    S.boot = null;
    S.notifications = [];
    S.bellOpen = false;
    S.filters.list.scope = null;
    S.emptyScopeSet = false;
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    renderLogin();
    if (!silent) toast('Вы вышли из демонстрационного профиля');
  }

  /* ---------------- Каркас ---------------- */

  function navCount(value, alert) {
    if (!value) return '';
    return `<span class="nav-count${alert ? ' alert' : ''}">${value}</span>`;
  }

  function shell(content, opts) {
    const o = opts || {};
    const user = S.user;
    const stats = (S.boot && S.boot.stats) || {};
    const unread = (S.boot && S.boot.unread) || 0;
    const isManager = user.role === 'manager' || user.role === 'admin';
    const nav = (active, hash, icon, label, count, alert) => `
      <button class="nav-item${active === hash ? ' active' : ''}" data-route="${hash}">
        <span class="nav-icon">${icon}</span>${esc(label)}${navCount(count, alert)}
      </button>`;

    const bellList = S.bellOpen ? `
      <div class="popover">
        <div class="popover-head">
          <strong style="font-size:13px">Уведомления</strong>
          <button class="btn btn-ghost btn-sm" data-action="read-all" ${unread ? '' : 'disabled'}>Прочитать все</button>
        </div>
        <div class="popover-list">
          ${S.notifications.length ? S.notifications.map((n) => `
            <button class="notif${n.read ? '' : ' unread'}" data-action="open-notification" data-id="${esc(n.id)}" data-appeal="${esc(n.appealId)}">
              <div class="notif-text">${esc(n.text)}</div>
              <div class="notif-meta">${esc(n.appealNumber || '')} · ${esc(relTime(n.createdAt))}</div>
            </button>`).join('') : '<div class="popover-empty">Новых уведомлений нет</div>'}
        </div>
      </div>` : '';

    return `
      <div class="layout">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">М</div>
            <div>
              <div class="brand-name">Модус Сигнал</div>
              <div class="brand-sub">Обратная связь</div>
            </div>
          </div>

          <nav class="nav">
            <div class="nav-section">Работа</div>
            ${nav(o.active, 'list', ICONS.inbox, 'Обращения', isManager ? stats.inbox : stats.mine, stats.overdue > 0 && isManager)}
            ${nav(o.active, 'new', ICONS.plus, 'Новое обращение')}
            ${isManager ? nav(o.active, 'analytics', ICONS.chart, 'Аналитика', stats.overdue, stats.overdue > 0) : ''}
            ${user.role === 'admin' ? nav(o.active, 'admin', ICONS.gear, 'Администрирование') : ''}
          </nav>

          <div class="sidebar-foot">
            <div class="demo-note"><b>Демо-стенд.</b> Синтетические данные, вход без пароля. ${IS_MOKKY ? 'Хранилище: Mokky.dev (временное).' : 'Права проверяются на сервере.'}</div>
            <div class="user-card">
              ${avatar(user.name)}
              <div class="user-meta">
                <div class="user-name">${esc(user.name)}</div>
                <div class="user-role">${esc(user.roleLabel)} · ${esc(user.department)}</div>
              </div>
              <button class="btn-signout" title="Выйти" data-action="logout">${ICONS.out}</button>
            </div>
          </div>
        </aside>

        <div class="workspace">
          <header class="topbar">
            <div class="topbar-title">${esc(o.title || '')}${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</div>
            <div class="topbar-actions">
              <button class="btn btn-primary btn-sm" data-route="#/new">${ICONS.plus} Обращение</button>
              <div class="bell-wrap">
                <button class="bell" data-action="toggle-bell" aria-label="Уведомления">
                  ${ICONS.bell}
                  ${unread ? `<span class="bell-dot">${unread}</span>` : ''}
                </button>
                ${bellList}
              </div>
            </div>
          </header>
          <main class="main">${content}</main>
        </div>
      </div>`;
  }

  /* ---------------- Список обращений ---------------- */

  function currentScope() {
    const f = S.filters.list;
    if (f.scope) return f.scope;
    if (S.user.role === 'admin') return 'all';
    if (S.user.role === 'manager') return 'inbox';
    return 'mine';
  }

  function listQuery() {
    const f = S.filters.list;
    const params = new URLSearchParams();
    params.set('scope', currentScope());
    if (f.q) params.set('q', f.q);
    if (f.type) params.set('type', f.type);
    if (f.status) params.set('status', f.status);
    if (f.priority) params.set('priority', f.priority);
    if (f.categoryId) params.set('categoryId', f.categoryId);
    if (f.department) params.set('department', f.department);
    if (f.overdue) params.set('overdue', '1');
    if (f.sort) params.set('sort', f.sort);
    return params.toString();
  }

  function deadlineCell(appeal) {
    const sla = appeal.sla;
    if (sla.isOverdue) {
      const target = sla.firstResponseOverdue ? sla.firstResponseDueAt : sla.resolutionTarget;
      const days = Math.max(0, Math.round(((Date.now() - new Date(target)) / 86400000) * 10) / 10);
      return `<span class="chip chip-overdue">просрочено ${days < 1 ? `${Math.max(1, Math.round((Date.now() - new Date(target)) / 3600000))} ч` : `${days} дн`}</span>`;
    }
    return `<span class="cell-muted">до ${esc(fmtDate(sla.resolutionTarget))}</span>`;
  }

  function tableRow(appeal) {
    return `
      <tr data-action="open-appeal" data-id="${esc(appeal.id)}" class="${appeal.sla.isOverdue ? 'row-overdue' : ''}">
        <td>
          <div class="cell-subject"><span class="row-num">${esc(appeal.number)}</span>${esc(appeal.subject)}</div>
          <div class="cell-sub">${esc(appeal.typeLabel)} · обновлено ${esc(relTime(appeal.updatedAt))}${appeal.attachments && appeal.attachments.length ? ' · файл' : ''}</div>
        </td>
        <td><div>${esc(appeal.categoryName)}</div><div class="cell-sub">${esc(appeal.department)}</div></td>
        <td class="cell-muted">${esc(appeal.authorName)}</td>
        <td class="cell-muted">${esc(appeal.assigneeName)}</td>
        <td>${statusChip(appeal.status, appeal.statusLabel)}</td>
        <td>${priorityChip(appeal.priority, appeal.priorityLabel)}</td>
        <td class="cell-nowrap">${deadlineCell(appeal)}</td>
        <td class="cell-muted cell-nowrap">${esc(fmtShort(appeal.createdAt))}</td>
      </tr>`;
  }

  async function viewList() {
    const scope = currentScope();
    const res = await api(`/api/appeals?${listQuery()}`);
    const appeals = res.appeals;
    const f = S.filters.list;
    const stats = S.boot.stats || {};
    const isManager = S.user.role === 'manager' || S.user.role === 'admin';
    const departments = [...new Set(S.boot.categories.map((c) => c.department))].sort((a, b) => a.localeCompare(b, 'ru'));
    const activeFilterCount = [f.q, f.type, f.status, f.priority, f.categoryId, f.department].filter(Boolean).length + (f.overdue ? 1 : 0);

    const tabs = [];
    if (isManager) tabs.push(['inbox', 'Входящие', stats.inbox]);
    tabs.push(['mine', 'Мои обращения', stats.mine]);
    if (S.user.role === 'admin') tabs.push(['all', 'Все обращения', stats.visible]);

    const content = `
      <div class="page-head">
        <div>
          <h1>Обращения</h1>
          <div class="page-sub">Проблемы, предложения и отзывы сотрудников · ${appeals.length} ${plural(appeals.length, 'запись', 'записи', 'записей')} в выборке</div>
        </div>
        <button class="btn btn-primary" data-route="#/new">${ICONS.plus} Новое обращение</button>
      </div>

      <div class="tabs">
        ${tabs.map(([key, label, count]) => `<button class="tab${scope === key ? ' active' : ''}" data-action="scope" data-scope="${key}">${esc(label)}<span class="tab-count">${count || 0}</span></button>`).join('')}
      </div>

      <div class="filters">
        <div class="search-field">
          <input class="input" id="list-search" placeholder="Поиск по номеру, теме или описанию" value="${esc(f.q)}" autocomplete="off" />
        </div>
        <select class="select" data-filter="type">${withDefault('Тип: все')}${options(S.boot.dictionaries.types, f.type)}</select>
        <select class="select" data-filter="status">${withDefault('Статус: все')}${options(S.boot.dictionaries.statuses, f.status)}</select>
        <select class="select" data-filter="categoryId">${withDefault('Категория: все')}${S.boot.categories.map((c) => `<option value="${esc(c.id)}"${f.categoryId === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select class="select" data-filter="department">${withDefault('Подразделение: все')}${departments.map((d) => `<option value="${esc(d)}"${f.department === d ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select>
        <label class="checkline"><input type="checkbox" data-filter="overdue"${f.overdue ? ' checked' : ''} /> Только просроченные</label>
        <select class="select" data-filter="sort">
          <option value="updated_desc"${f.sort === 'updated_desc' ? ' selected' : ''}>Сначала обновлённые</option>
          <option value="created_desc"${f.sort === 'created_desc' ? ' selected' : ''}>Сначала новые</option>
          <option value="due_asc"${f.sort === 'due_asc' ? ' selected' : ''}>По сроку рассмотрения</option>
          <option value="priority"${f.sort === 'priority' ? ' selected' : ''}>По приоритету</option>
        </select>
        ${activeFilterCount ? `<button class="btn btn-ghost btn-sm" data-action="reset-filters">Сбросить фильтры (${activeFilterCount})</button>` : ''}
      </div>

      <div class="table-wrap">
        <div class="table-scroll">
          <table class="table">
            <thead>
              <tr>
                <th>Обращение</th><th>Категория</th><th>Автор</th><th>Ответственный</th><th>Статус</th><th>Приоритет</th><th>Срок</th><th>Создано</th>
              </tr>
            </thead>
            <tbody>
              ${appeals.length ? appeals.map(tableRow).join('') : `
                <tr><td colspan="8">
                  <div class="empty">
                    <div class="empty-icon">⌕</div>
                    <h3>Ничего не найдено</h3>
                    <p>${activeFilterCount ? 'Измените фильтры или сбросьте их.' : 'В этой выборке пока нет обращений — создайте первое.'}</p>
                  </div>
                </td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="table-foot">
          <span>${scope === 'inbox' ? 'Обращения, которые вы рассматриваете как ответственный или руководитель подразделения' : scope === 'mine' ? 'Обращения, автором которых вы являетесь' : 'Все обращения компании (доступ администратора)'}</span>
          <span>${stats.overdue ? `Просрочено: <b style="color:#b42318">${stats.overdue}</b>` : 'Просроченных нет'}</span>
        </div>
      </div>`;

    renderApp(shell(content, { title: 'Обращения', sub: scopeLabel(scope), active: 'list' }));
  }

  function scopeLabel(scope) {
    return { inbox: 'Входящие', mine: 'Мои обращения', all: 'Все обращения' }[scope] || '';
  }

  /* ---------------- Карточка обращения ---------------- */

  const EVENT_TITLES = {
    created: 'Обращение зарегистрировано',
    comment: 'Комментарий',
    internal_note: 'Внутренняя заметка',
    clarification_requested: 'Запрошено уточнение',
    status_changed: 'Изменение статуса',
    decision: 'Решение',
    assigned: 'Назначение ответственного',
    priority_changed: 'Изменение приоритета',
    due_changed: 'Изменение срока',
  };

  function timelineItem(event, appeal) {
    const isComment = ['comment', 'internal_note'].includes(event.type);
    const isDecision = event.type === 'decision';
    const isClarification = event.type === 'clarification_requested';

    if (isComment) {
      return `
        <div class="tl-item">
          ${avatar(event.actorName, 'sm')}
          <div class="tl-body">
            <div class="tl-head">
              <span class="tl-author">${esc(event.actorName)}</span>
              <span class="tl-time">${esc(fmtDateTime(event.createdAt))} · ${esc(relTime(event.createdAt))}</span>
              ${event.type === 'internal_note' ? '<span class="chip" style="background:#fdf3e1;color:#b54708">видно только ответственным</span>' : ''}
            </div>
            ${event.type === 'internal_note'
              ? `<div class="tl-note"><div class="tl-note-label">Внутренняя заметка</div>${esc(event.text)}</div>`
              : `<div class="tl-text">${esc(event.text)}</div>`}
          </div>
        </div>`;
    }

    const icon = isDecision
      ? '<span class="avatar sm" style="background:#067647">✓</span>'
      : isClarification
        ? '<span class="avatar sm" style="background:#a3126c">?</span>'
        : '<span class="avatar sm" style="background:#98a2b3">•</span>';

    return `
      <div class="tl-item">
        ${icon}
        <div class="tl-body">
          <div class="tl-head">
            <span class="tl-author">${esc(EVENT_TITLES[event.type] || event.text)}</span>
            <span class="tl-time">${esc(fmtDateTime(event.createdAt))}</span>
          </div>
          <div class="tl-system">
            ${esc(event.actorName)}
            ${event.type === 'status_changed' && event.meta && event.meta.status ? ` · новый статус: ${statusChip(event.meta.status)}` : ''}
          </div>
          ${isDecision
            ? `<div class="tl-decision">${esc(event.text.replace(/^Решение \([^)]*\):\s*/, ''))}${event.meta && event.meta.actions ? `<div style="margin-top:6px;color:#475467"><b>Действия:</b> ${esc(event.meta.actions)}</div>` : ''}</div>`
            : isClarification
              ? `<div class="tl-note">${esc(event.text.replace(/^Запрошено уточнение:\s*/, ''))}</div>`
              : `<div class="tl-text">${esc(event.text)}</div>`}
        </div>
      </div>`;
  }

  function detailMeta(appeal) {
    return `
      <div class="meta-grid">
        <div class="meta-item"><div class="meta-label">Автор</div><div class="meta-value">${esc(appeal.authorName)}<small>${esc(appeal.authorDepartment || '')}</small></div></div>
        <div class="meta-item"><div class="meta-label">Ответственный</div><div class="meta-value">${esc(appeal.assigneeName)}<small>${esc(appeal.assigneeDepartment || '')}</small></div></div>
        <div class="meta-item"><div class="meta-label">Категория</div><div class="meta-value">${esc(appeal.categoryName)}<small>${esc(appeal.department)}</small></div></div>
        <div class="meta-item"><div class="meta-label">Создано</div><div class="meta-value">${esc(fmtDateTime(appeal.createdAt))}<small>${esc(relTime(appeal.createdAt))}</small></div></div>
        <div class="meta-item"><div class="meta-label">Приоритет и SLA</div><div class="meta-value">${esc(appeal.priorityLabel)}<small>первый ответ до ${esc(fmtDateTime(appeal.sla.firstResponseDueAt))}</small></div></div>
        <div class="meta-item"><div class="meta-label">Первый ответ</div><div class="meta-value">${appeal.firstResponseAt ? esc(fmtDateTime(appeal.firstResponseAt)) : 'Ожидается'}<small>${appeal.sla.firstResponseHours != null ? `через ${hoursHuman(appeal.sla.firstResponseHours)}` : 'SLA первого ответа'}</small></div></div>
        <div class="meta-item"><div class="meta-label">Срок рассмотрения</div><div class="meta-value">${esc(fmtDate(appeal.sla.resolutionTarget))}${appeal.sla.resolutionOverdue ? ' · <span style="color:#b42318">просрочено</span>' : ''}<small>${appeal.dueAt ? 'установлен вручную' : 'по SLA'}</small></div></div>
        <div class="meta-item"><div class="meta-label">Результат</div><div class="meta-value">${appeal.resolvedAt ? esc(fmtDate(appeal.resolvedAt)) : '—'}<small>${appeal.decision ? appeal.decision.status === 'rejected' ? 'отклонено с обоснованием' : 'решение зафиксировано' : 'ещё не зафиксирован'}</small></div></div>
      </div>`;
  }

  async function viewDetail(id) {
    const data = await api(`/api/appeals/${encodeURIComponent(id)}`);
    const appeal = data.appeal;
    const events = data.events;
    const p = data.permissions;
    const managers = S.boot.users.filter((u) => ['manager', 'admin'].includes(u.role));
    const statusOptions = (p.availableStatuses || []).map((s) => `<option value="${esc(s)}">${esc(S.boot.dictionaries.statuses[s] || s)}</option>`).join('');

    const decisionBox = appeal.decision ? `
      <div class="card"><div class="card-body">
        <div class="decision-box${appeal.decision.status === 'rejected' ? ' rejected' : ''}">
          <div class="decision-head">${appeal.decision.status === 'rejected' ? '✕ Отклонено' : '✓ Реализовано'}
            <span class="chip" style="margin-left:auto">${esc(fmtDate(appeal.decision.at))}</span>
          </div>
          <div class="prose">${esc(appeal.decision.text)}</div>
          ${appeal.decision.actions ? `<div class="decision-actions"><b>Предпринятые действия:</b><br>${esc(appeal.decision.actions)}</div>` : ''}
        </div>
      </div></div>` : '';

    const attachments = appeal.attachments && appeal.attachments.length ? `
      <div class="card">
        <div class="card-head"><h2>Материалы</h2><span class="card-sub">${appeal.attachments.length} ${plural(appeal.attachments.length, 'файл', 'файла', 'файлов')}</span></div>
        <div class="card-body"><div class="attachments">
          ${appeal.attachments.map((f) => `
            <div class="attachment">
              <span class="file-ico">${ICONS.file}</span>
              <a href="${esc(attachmentHref(f))}" target="_blank" rel="noopener">${esc(f.name)}</a>
              <span class="file-size">${esc(bytes(f.size))}</span>
            </div>`).join('')}
        </div></div>
      </div>` : '';

    const canPickStatus = (p.availableStatuses || []).length > 0;
    const managerPanel = p.canManage ? `
      <div class="card">
        <div class="card-head"><h2>Действия ответственного</h2><span class="card-sub">${esc(S.user.roleLabel)}</span></div>
        <div class="card-body side-actions">
          <form data-form="params" data-id="${esc(appeal.id)}" class="side-actions">
            <div class="side-block">
              <label class="side-label" for="status-select">Статус обращения</label>
              ${canPickStatus
                ? `<select class="select" id="status-select" name="status">
                     <option value="">Не изменять (${esc(appeal.statusLabel)})</option>
                     ${statusOptions}
                   </select>
                   <input class="input" name="statusComment" placeholder="Комментарий к смене статуса (необязательно)" />`
                : `<div class="chip status-${esc(appeal.status)}">${esc(appeal.statusLabel)} — переходы недоступны</div>`}
            </div>
            <div class="side-block">
              <label class="side-label" for="assignee-select">Ответственный</label>
              <select class="select" id="assignee-select" name="assigneeId">
                <option value="">Оставить ${esc(appeal.assigneeName)}</option>
                ${managers.map((m) => `<option value="${esc(m.id)}">${esc(m.name)} — ${esc(m.position)}</option>`).join('')}
              </select>
            </div>
            <div class="side-block">
              <span class="side-label">Приоритет</span>
              <select class="select" name="priority">${options(S.boot.dictionaries.priorities, appeal.priority)}</select>
              <label class="side-label" for="due-input" style="margin-top:4px">Срок рассмотрения вручную</label>
              <input class="input" id="due-input" type="date" name="dueAt" value="${appeal.dueAt ? appeal.dueAt.slice(0, 10) : ''}" />
              <span class="field-hint">Пустое значение — применяется SLA по приоритету.</span>
            </div>
            <button class="btn btn-primary" type="submit">Сохранить изменения</button>
          </form>

          ${p.canDecide ? `
          <form data-form="decision" data-id="${esc(appeal.id)}" class="side-block">
            <span class="side-label">Зафиксировать решение</span>
            <select class="select" name="status">
              <option value="implemented">Реализовано</option>
              <option value="rejected">Отклонено с обоснованием</option>
            </select>
            <textarea class="textarea" name="text" placeholder="Что решено по обращению" required minlength="10" style="min-height:78px"></textarea>
            <textarea class="textarea" name="actions" placeholder="Какие действия предприняты (необязательно)" style="min-height:56px"></textarea>
            <button class="btn btn-accent" type="submit">Сохранить решение</button>
            <span class="field-hint">Автор увидит решение и сможет подтвердить закрытие.</span>
          </form>` : ''}
        </div>
      </div>` : `
      <div class="card">
        <div class="card-head"><h2>Действия автора</h2></div>
        <div class="card-body side-actions">
          ${p.availableStatuses && p.availableStatuses.length ? `
            <p class="field-hint">Вы автор обращения и можете подтвердить результат или вернуть его в работу.</p>
            <div class="side-buttons">
              ${p.availableStatuses.map((s) => `<button class="btn ${s === 'closed' ? 'btn-primary' : ''}" data-action="author-status" data-id="${esc(appeal.id)}" data-status="${esc(s)}">${esc(authorActionLabel(s))}</button>`).join('')}
            </div>` : '<p class="field-hint">Ответственный рассматривает обращение. Вы получите уведомление при изменении статуса.</p>'}
          <div class="side-block">
            <span class="side-label">Ответственный</span>
            <div class="meta-value">${esc(appeal.assigneeName)}<small>${esc(appeal.assigneeDepartment || '')}</small></div>
          </div>
        </div>
      </div>`;

    const content = `
      <div class="detail-head">
        <button class="backlink" data-route="#/">${ICONS.back} К списку обращений</button>
        <div class="detail-title">
          <div>
            <div class="detail-number">${esc(appeal.number)} · ${esc(appeal.categoryName)} · создано ${esc(fmtDateTime(appeal.createdAt))}</div>
            <h1>${esc(appeal.subject)}</h1>
          </div>
        </div>
        <div class="chip-row">
          ${statusChip(appeal.status, appeal.statusLabel)}
          ${typeChip(appeal.type, appeal.typeLabel)}
          ${priorityChip(appeal.priority, appeal.priorityLabel)}
          ${appeal.sla.isOverdue ? `<span class="chip chip-overdue">Просрочено${appeal.sla.firstResponseOverdue ? ' · нет первого ответа' : ''}</span>` : ''}
          ${appeal.sla.firstResponseHours != null ? `<span class="chip chip-ok">Первый ответ за ${esc(hoursHuman(appeal.sla.firstResponseHours))}</span>` : ''}
        </div>
      </div>

      <div class="detail-grid">
        <div class="stack">
          <div class="card"><div class="card-body">
            ${detailMeta(appeal)}
            <div class="prose-block" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line-soft)">
              <div class="prose-title">Описание</div>
              <div class="prose">${esc(appeal.description)}</div>
            </div>
            ${appeal.solution ? `<div class="prose-block"><div class="prose-title">Предлагаемое решение</div><div class="prose">${esc(appeal.solution)}</div></div>` : ''}
          </div></div>

          ${decisionBox}
          ${attachments}

          <div class="card">
            <div class="card-head">
              <h2>История рассмотрения</h2>
              <span class="card-sub">${events.length} ${plural(events.length, 'событие', 'события', 'событий')}</span>
            </div>
            <div class="card-body">
              <div class="timeline" id="timeline">
                ${events.map((e) => timelineItem(e, appeal)).join('')}
              </div>
              <form class="comment-form" data-form="comment" data-id="${esc(appeal.id)}">
                <textarea class="textarea" name="text" placeholder="${p.canSeeInternal ? 'Комментарий, уточнение или внутренняя заметка' : 'Комментарий или ответ на уточнение'}" required minlength="2" style="min-height:84px"></textarea>
                <div class="comment-actions">
                  ${p.canSeeInternal ? '<label class="checkline"><input type="checkbox" name="internal" /> Внутренняя заметка (не видна автору)</label>' : '<span class="field-hint">Автор видит все комментарии ответственного</span>'}
                  <button class="btn btn-primary" type="submit">Отправить</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="stack">
          ${managerPanel}
          <div class="card">
            <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
              <div class="side-label">Прозрачность и доступ</div>
              <p class="field-hint">Автор видит собственное обращение, комментарии и решение. Ответственный и руководитель подразделения — обращения своего направления. Внутренние заметки автору недоступны. Администратор видит все обращения.</p>
              <div class="route-row" style="font-size:12px;display:flex;justify-content:space-between"><span>Маршрутизация</span><span>по категории</span></div>
              <button class="btn btn-ghost btn-sm" data-route="#/new">${ICONS.plus} Новое обращение</button>
            </div>
          </div>
        </div>
      </div>`;

    renderApp(shell(content, { title: `${appeal.number} · ${appeal.statusLabel}`, sub: appeal.categoryName, active: 'list' }));
  }

  function authorActionLabel(status) {
    return {
      in_review: 'Вернуть в работу',
      closed: 'Подтвердить закрытие',
      needs_clarification: 'Ответить на уточнение',
    }[status] || `Перевести в «${S.boot.dictionaries.statuses[status] || status}»`;
  }

  /* ---------------- Новое обращение ---------------- */

  function routePreview() {
    const categoryId = $('#new-category') ? $('#new-category').value : '';
    const priority = $('#new-priority') ? $('#new-priority').value : 'medium';
    const category = S.boot.categories.find((c) => c.id === categoryId);
    const owner = category ? S.boot.users.find((u) => u.id === category.assigneeId) : null;
    const sla = S.boot.dictionaries.sla[priority] || S.boot.dictionaries.sla.medium;
    const first = new Date(Date.now() + sla.firstResponse * 3600000);
    const resolve = new Date(Date.now() + sla.resolution * 3600000);
    const systemOwner = S.boot.users.find((u) => u.role === 'admin');

    return `
      <div class="route-preview">
        <div class="route-row"><span>Ответственный</span><span>${owner ? esc(owner.name) : systemOwner ? `${esc(systemOwner.name)} (администратор)` : 'будет назначен'}</span></div>
        <div class="route-row"><span>Подразделение</span><span>${esc(category ? category.department : '—')}</span></div>
        <div class="route-row"><span>Первый ответ</span><span>${esc(fmtDateTime(first.toISOString()))}</span></div>
        <div class="route-row"><span>Срок рассмотрения</span><span>${esc(fmtDate(resolve.toISOString()))}</span></div>
        <div class="route-row"><span>Правило</span><span>${owner ? 'по категории' : 'резервное: администратор'}</span></div>
      </div>
      <p class="field-hint" style="margin-top:8px">Маршрутизация выполняется по правилу категории при регистрации. Если ответственный не задан, обращение уходит администратору и не теряется.</p>`;
  }

  function filesHtml() {
    if (!S.newFiles.length) return '';
    return `<div class="attach-list">${S.newFiles.map((f, i) => `
      <div class="attach-item"><span>${ICONS.file}</span><span>${esc(f.name)}</span><span style="color:#98a2b3">${esc(bytes(f.size))}</span><button type="button" data-action="remove-file" data-index="${i}" aria-label="Удалить">×</button></div>`).join('')}</div>`;
  }

  async function viewNew() {
    const categories = S.boot.categories.filter((c) => c.isActive !== false);
    const byDept = new Map();
    for (const c of categories) {
      if (!byDept.has(c.department)) byDept.set(c.department, []);
      byDept.get(c.department).push(c);
    }

    const content = `
      <div class="page-head">
        <div>
          <h1>Новое обращение</h1>
          <div class="page-sub">Опишите проблему или предложение — система направит обращение ответственному и зафиксирует сроки</div>
        </div>
        <button class="btn" data-route="#/">Отмена</button>
      </div>

      <form data-form="create" class="form-grid">
        <div class="stack">
          <div class="card"><div class="card-body">
            <div class="field">
              <label>Тип обращения <span class="req">*</span></label>
              <div class="segmented">
                <label class="seg-option"><input type="radio" name="type" value="problem" checked /><span>Проблема<small>Мешает работе</small></span></label>
                <label class="seg-option"><input type="radio" name="type" value="suggestion" /><span>Предложение<small>Как улучшить</small></span></label>
                <label class="seg-option"><input type="radio" name="type" value="praise" /><span>Отзыв<small>Отметить полезное</small></span></label>
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label for="new-category">Категория <span class="req">*</span></label>
                <select class="select" id="new-category" name="categoryId" required>
                  <option value="">Выберите категорию</option>
                  ${[...byDept.entries()].map(([dept, list]) => `<optgroup label="${esc(dept)}">${list.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}
                </select>
                <span class="field-hint">От категории зависит ответственный и подразделение.</span>
              </div>
              <div class="field">
                <label for="new-priority">Приоритет <span class="req">*</span></label>
                <select class="select" id="new-priority" name="priority">
                  <option value="low">Низкий — предложение, можно планово</option>
                  <option value="medium" selected>Средний — влияет на работу</option>
                  <option value="high">Высокий — блокирует процесс</option>
                </select>
                <span class="field-hint">Приоритет определяет срок первого ответа и рассмотрения.</span>
              </div>
            </div>

            <div class="field">
              <label for="new-subject">Тема <span class="req">*</span></label>
              <input class="input" id="new-subject" name="subject" maxlength="160" required minlength="5" placeholder="Коротко: что происходит и где" />
              <div class="counter" id="subject-counter">0 / 160</div>
            </div>

            <div class="field">
              <label for="new-description">Описание ситуации <span class="req">*</span></label>
              <textarea class="textarea" id="new-description" name="description" maxlength="6000" required minlength="20" placeholder="Что происходит, в каких процессах, к чему это приводит. Без реальных имён клиентов и коммерческих условий." style="min-height:130px"></textarea>
              <div style="display:flex;justify-content:space-between"><span class="field-hint">Минимум 20 символов. Не указывайте конфиденциальные сведения.</span><span class="counter" id="description-counter">0 / 6000</span></div>
            </div>

            <div class="field">
              <label for="new-solution">Предлагаемое решение</label>
              <textarea class="textarea" id="new-solution" name="solution" maxlength="4000" placeholder="Что, по вашему мнению, стоит изменить (необязательно)" style="min-height:84px"></textarea>
            </div>

            <div class="field">
              <label>Материалы</label>
              <label class="attach-drop" for="file-input">Прикрепить до 3 файлов (до 3 МБ). Для демонстрации используйте файлы-заглушки.</label>
              <input id="file-input" type="file" multiple style="display:none" />
              <div id="attach-list">${filesHtml()}</div>
            </div>
          </div></div>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-head"><h2>Маршрутизация и сроки</h2></div>
            <div class="card-body" id="route-preview">${routePreview()}</div>
          </div>
          <div class="card">
            <div class="card-body">
              <button class="btn btn-primary" style="width:100%" type="submit">Отправить обращение</button>
              <p class="field-hint" style="margin-top:10px">Обращение регистрируется автоматически, автор увидит его в разделе «Мои обращения» и получит уведомления об изменении статуса.</p>
            </div>
          </div>
        </div>
      </form>`;

    renderApp(shell(content, { title: 'Новое обращение', sub: 'Регистрация и маршрутизация', active: 'new' }));
  }

  /* ---------------- Аналитика ---------------- */

  function barChart(items, valueKey, total, cls) {
    const max = Math.max(1, ...items.map((i) => i[valueKey]));
    return `<div class="chart">${items.map((i) => `
      <div class="bar-row">
        <span class="bar-label" title="${esc(i.label || i.name)}">${esc(i.label || i.name)}</span>
        <span class="bar-track"><span class="bar-fill ${cls || ''}" style="width:${Math.round((i[valueKey] / max) * 100)}%"></span></span>
        <span class="bar-value">${i[valueKey]}</span>
      </div>`).join('')}
      ${total === 0 ? '<div class="field-hint" style="text-align:center">Нет данных за выбранный период</div>' : ''}
    </div>`;
  }

  async function viewAnalytics() {
    const a = await api('/api/analytics');
    const k = a.kpi;
    const maxMonth = Math.max(1, ...a.months.map((m) => Math.max(m.created, m.closed)));

    const content = `
      <div class="page-head">
        <div>
          <h1>Аналитика обращений</h1>
          <div class="page-sub">${esc(a.scope.label)} · показатели пересчитываются по каждому запросу</div>
        </div>
        <div class="chip">${esc(fmtDate(new Date().toISOString()))}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Всего обращений</div><div class="kpi-value">${k.total}</div><div class="kpi-foot">${k.open} в работе · ${k.closedShare}% с результатом</div></div>
        <div class="kpi"><div class="kpi-label">Средний первый ответ</div><div class="kpi-value">${k.avgFirstResponseHours == null ? '—' : esc(hoursHuman(k.avgFirstResponseHours))}</div><div class="kpi-foot">${k.slaFirstResponsePct == null ? 'нет данных' : `${k.slaFirstResponsePct}% в рамках SLA`}</div></div>
        <div class="kpi"><div class="kpi-label">Среднее рассмотрение</div><div class="kpi-value">${k.avgResolutionHours == null ? '—' : esc(daysHuman(k.avgResolutionHours))}</div><div class="kpi-foot">по обращениям с решением</div></div>
        <div class="kpi ${k.overdue ? 'danger' : 'ok'}"><div class="kpi-label">Просрочено</div><div class="kpi-value">${k.overdue}</div><div class="kpi-foot">${k.overdue ? 'требуют внимания руководителя' : 'сроки соблюдаются'}</div></div>
        <div class="kpi ok"><div class="kpi-label">Реализовано</div><div class="kpi-value">${k.implemented}</div><div class="kpi-foot">включая подтверждённые автором</div></div>
        <div class="kpi"><div class="kpi-label">Отклонено</div><div class="kpi-value">${k.rejected}</div><div class="kpi-foot">с обоснованием для автора</div></div>
        <div class="kpi"><div class="kpi-label">Новых за 7 дней</div><div class="kpi-value">${k.newLast7Days}</div><div class="kpi-foot">${k.decidedLast30Days} решений за 30 дней</div></div>
        <div class="kpi"><div class="kpi-label">Открытых</div><div class="kpi-value">${k.open}</div><div class="kpi-foot">включая ожидающие уточнения</div></div>
      </div>

      <div class="analytics-grid">
        <div class="card">
          <div class="card-head"><h2>По типам обращений</h2><span class="card-sub">${k.total} всего</span></div>
          <div class="card-body">${barChart(a.byType, 'count', k.total)}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>По статусам</h2><span class="card-sub">воронка рассмотрения</span></div>
          <div class="card-body">${barChart(a.byStatus, 'count', k.total, 'accent')}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>По подразделениям</h2><span class="card-sub">в зоне вашей ответственности</span></div>
          <div class="card-body">${barChart(a.byDepartment.map((d) => ({ label: d.name, count: d.count })), 'count', k.total, 'ok')}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Динамика за 6 месяцев</h2><span class="card-sub">создано / закрыто</span></div>
          <div class="card-body">
            <div class="month-chart">
              ${a.months.map((m) => `
                <div class="month-col">
                  <div class="month-bars">
                    <div class="month-bar" title="Создано: ${m.created}" style="height:${Math.max(2, Math.round((m.created / maxMonth) * 100))}%"></div>
                    <div class="month-bar closed" title="Закрыто: ${m.closed}" style="height:${Math.max(2, Math.round((m.closed / maxMonth) * 100))}%"></div>
                  </div>
                  <div class="month-label">${esc(m.label)}</div>
                </div>`).join('')}
            </div>
            <div class="legend" style="margin-top:12px">
              <span><i style="background:#1f4ed8"></i> создано</span>
              <span><i style="background:#e8a33d"></i> закрыто</span>
            </div>
          </div>
        </div>
      </div>

      <div class="analytics-grid" style="margin-top:16px">
        <div class="card">
          <div class="card-head"><h2>Повторяющиеся проблемы</h2><span class="card-sub">категории с 2+ проблемами</span></div>
          <div class="card-body">
            ${a.repeatProblems.length ? a.repeatProblems.map((r) => `
              <div class="repeat-card">
                <div class="repeat-head">
                  <div>
                    <div class="repeat-title">${esc(r.name)}</div>
                    <div class="card-sub">${esc(r.department)} · ${r.problems} ${plural(r.problems, 'проблема', 'проблемы', 'проблем')}</div>
                  </div>
                  <span class="chip chip-overdue">сигнал для процессов</span>
                </div>
                <div class="repeat-items">
                  ${r.appeals.map((ap) => `<span class="repeat-item" data-action="open-appeal" data-id="${esc(ap.id)}"><b>${esc(ap.number)}</b> · ${esc(ap.subject)}</span>`).join('')}
                </div>
              </div>`).join('') : '<div class="field-hint">Повторяющихся проблем в категориях пока нет.</div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Требуют внимания: просрочено</h2><span class="card-sub">SLA первого ответа и рассмотрения</span></div>
          <div class="table-scroll">
            <table class="table compact">
              <thead><tr><th>Обращение</th><th>Ответственный</th><th>Просрочка</th></tr></thead>
              <tbody>
                ${a.overdue.length ? a.overdue.slice(0, 8).map((o) => `
                  <tr data-action="open-appeal" data-id="${esc(o.id)}">
                    <td><div class="cell-subject" style="font-size:12.5px"><span class="row-num">${esc(o.number)}</span>${esc(o.subject)}</div><div class="cell-sub">${esc(o.kind === 'first_response' ? 'нет первого ответа' : 'срок рассмотрения истёк')}</div></td>
                    <td class="cell-muted">${esc(o.assigneeName)}</td>
                    <td class="cell-muted">${o.daysOverdue < 1 ? `${Math.max(1, Math.round(o.daysOverdue * 24))} ч` : `${o.daysOverdue} дн`}</td>
                  </tr>`).join('') : '<tr><td colspan="3"><div class="empty" style="padding:26px"><h3>Просрочек нет</h3><p>Все обращения отвечены в срок.</p></div></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head"><h2>Категории обращений</h2><span class="card-sub">где возникает больше всего вопросов</span></div>
        <div class="table-scroll">
          <table class="table compact">
            <thead><tr><th>Категория</th><th>Подразделение</th><th>Всего</th><th>Проблемы</th><th>Открыто</th><th>Реализовано</th></tr></thead>
            <tbody>
              ${a.topCategories.map((c) => `
                <tr>
                  <td><b>${esc(c.name)}</b></td>
                  <td class="cell-muted">${esc(c.department)}</td>
                  <td>${c.count}</td>
                  <td>${c.problems}</td>
                  <td>${c.open}</td>
                  <td>${c.implemented}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="info-note" style="margin-top:16px">
        <span>ⓘ</span>
        <div>Показатели «доля с результатом» и «среднее время первого ответа» рассчитаны по датам событий в системе. В промышленной версии сюда добавляются цели по SLA и разбивка по подразделениям с учётом иерархии.</div>
      </div>`;

    renderApp(shell(content, { title: 'Аналитика', sub: a.scope.label, active: 'analytics' }));
  }

  /* ---------------- Администрирование ---------------- */

  async function viewAdmin() {
    const data = await api('/api/admin/overview');
    const managers = data.users.filter((u) => ['manager', 'admin'].includes(u.role));
    const byRole = { employee: [], manager: [], admin: [] };
    data.users.forEach((u) => byRole[u.role] && byRole[u.role].push(u));

    const content = `
      <div class="page-head">
        <div>
          <h1>Администрирование</h1>
          <div class="page-sub">Категории, правила маршрутизации и роли пользователей</div>
        </div>
        <button class="btn btn-danger-ghost btn-sm" data-action="reset-demo">Сбросить демо-данные</button>
      </div>

      <div class="kpi-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div class="kpi"><div class="kpi-label">Пользователи</div><div class="kpi-value">${data.stats.users}</div><div class="kpi-foot">${data.stats.managers} руководителей</div></div>
        <div class="kpi"><div class="kpi-label">Категории</div><div class="kpi-value">${data.stats.categories}</div><div class="kpi-foot">${data.stats.categoriesWithoutOwner} без ответственного</div></div>
        <div class="kpi ${data.stats.unassigned ? 'danger' : 'ok'}"><div class="kpi-label">Без ответственного</div><div class="kpi-value">${data.stats.unassigned}</div><div class="kpi-foot">${data.stats.unassigned ? 'риск потери обращения' : 'все маршрутизированы'}</div></div>
        <div class="kpi"><div class="kpi-label">Открытых обращений</div><div class="kpi-value">${data.stats.openAppeals}</div><div class="kpi-foot">в работе у подразделений</div></div>
      </div>

      <div class="admin-grid">
        <div class="card">
          <div class="card-head"><h2>Категории и маршрутизация</h2><span class="card-sub">ответственный по умолчанию</span></div>
          <div class="table-scroll">
            <table class="table compact">
              <thead><tr><th>Категория</th><th>Подразделение</th><th>Ответственный</th><th>Активна</th></tr></thead>
              <tbody>
                ${data.categories.map((c) => `
                  <tr>
                    <td><b>${esc(c.name)}</b><div class="cell-sub">${esc(c.description || '')}</div></td>
                    <td class="cell-muted">${esc(c.department)}</td>
                    <td>
                      <select class="select mini-select" data-cat-assignee="${esc(c.id)}">
                        <option value=""${!c.assigneeId ? ' selected' : ''}>не назначен</option>
                        ${managers.map((m) => `<option value="${esc(m.id)}"${c.assigneeId === m.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}
                      </select>
                    </td>
                    <td><input type="checkbox" data-cat-active="${esc(c.id)}"${c.isActive !== false ? ' checked' : ''} /></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <form data-form="add-category" class="add-category">
            <input class="input" name="name" placeholder="Новая категория" required minlength="3" />
            <input class="input" name="department" placeholder="Подразделение" required list="dept-list" />
            <datalist id="dept-list">${[...new Set(data.categories.map((c) => c.department))].map((d) => `<option value="${esc(d)}"></option>`).join('')}</datalist>
            <button class="btn btn-primary" type="submit">Добавить</button>
          </form>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-head"><h2>Пользователи и роли</h2><span class="card-sub">${data.users.length}</span></div>
            <div class="card-body stack" style="gap:14px">
              ${[['employee', 'Сотрудники'], ['manager', 'Руководители'], ['admin', 'Администратор']].map(([role, label]) => `
                <div>
                  <div class="side-label" style="margin-bottom:6px">${esc(label)} · ${byRole[role].length}</div>
                  ${byRole[role].map((u) => `
                    <div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-soft)">
                      ${avatar(u.name, 'sm')}
                      <div style="min-width:0"><div style="font-size:12.5px;font-weight:600">${esc(u.name)}</div><div class="cell-sub">${esc(u.position)} · ${esc(u.department)}</div></div>
                    </div>`).join('')}
                </div>`).join('')}
            </div>
          </div>

          ${data.unassigned.length ? `
          <div class="card">
            <div class="card-head"><h2>Обращения без ответственного</h2></div>
            <div class="card-body stack" style="gap:6px">
              ${data.unassigned.map((a) => `<button class="repeat-item" data-action="open-appeal" data-id="${esc(a.id)}" style="text-align:left;background:none;border:0;padding:4px 0;cursor:pointer"><b>${esc(a.number)}</b> · ${esc(a.subject)}</button>`).join('')}
            </div>
          </div>` : ''}

          <div class="info-note">
            <span>ⓘ</span>
            <div>В демонстрационном стенде роли фиксированы. В промышленной версии пользователи и руководители подразделений синхронизируются с Битрикс24 / Active Directory, а правила маршрутизации настраиваются по подразделению и категории.</div>
          </div>
        </div>
      </div>`;

    renderApp(shell(content, { title: 'Администрирование', sub: 'справочники и доступ', active: 'admin' }));
  }

  /* ---------------- Данные сессии ---------------- */

  async function loadBoot() {
    const boot = await api('/api/bootstrap');
    S.boot = boot;
    S.user = boot.user;
    try {
      const n = await api('/api/notifications');
      S.notifications = n.notifications;
    } catch (err) {
      S.notifications = [];
    }
  }

  async function route() {
    if (!S.user) {
      if (parseHash().name !== 'login' && location.hash && location.hash !== '#/') {
        location.hash = '#/';
      }
      renderLogin();
      return;
    }
    const r = parseHash();
    if (r.name === 'login') {
      location.hash = '#/';
      return;
    }
    try {
      if (r.name === 'new') await viewNew();
      else if (r.name === 'appeal') await viewDetail(r.id);
      else if (r.name === 'analytics') await viewAnalytics();
      else if (r.name === 'admin') await viewAdmin();
      else await viewList();
    } catch (err) {
      if (err.status === 401) return;
      const content = `<div class="card"><div class="card-body empty">
        <div class="empty-icon">!</div>
        <h3>Не удалось загрузить данные</h3>
        <p>${esc(err.message)}</p>
        <button class="btn" data-route="#/" style="margin-top:14px">К списку обращений</button>
      </div></div>`;
      renderApp(shell(content, { title: 'Ошибка', active: 'list' }));
    }
  }

  async function startWithUser(userId) {
    localStorage.setItem('modus.signal.user', userId);
    S.user = { id: userId };
    S.loginError = '';
    try {
      await loadBoot();
      if (location.hash && location.hash !== '#/') await route();
      else await route();
    } catch (err) {
      localStorage.removeItem('modus.signal.user');
      S.user = null;
      S.loginError = err.message;
      if (err.status === 401) S.loginError = 'Демонстрационный пользователь не найден. Выберите другого.';
      await renderLogin();
    }
  }

  /* ---------------- События ---------------- */

  window.addEventListener('hashchange', route);

  document.addEventListener('click', async (e) => {
    const routeEl = e.target.closest('[data-route]');
    if (routeEl) {
      e.preventDefault();
      go(routeEl.dataset.route);
      return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;

      if (action === 'logout') {
        signOut();
        return;
      }

      if (action === 'toggle-bell') {
        S.bellOpen = !S.bellOpen;
        if (S.bellOpen) {
          try {
            const n = await api('/api/notifications');
            S.notifications = n.notifications;
          } catch (err) { /* колокол не критичен */ }
        }
        route();
        return;
      }

      if (action === 'read-all') {
        try {
          await api('/api/notifications/read', { method: 'POST', body: {} });
          S.notifications = S.notifications.map((n) => Object.assign({}, n, { read: true }));
          S.boot.unread = 0;
          toast('Все уведомления прочитаны');
          route();
        } catch (err) {
          toast(err.message, 'error');
        }
        return;
      }

      if (action === 'open-notification') {
        const id = actionEl.dataset.id;
        const appealId = actionEl.dataset.appeal;
        S.bellOpen = false;
        try {
          await api('/api/notifications/read', { method: 'POST', body: { ids: [id] } });
          S.boot.unread = Math.max(0, (S.boot.unread || 0) - 1);
        } catch (err) { /* игнорируем */ }
        go(`#/appeal/${appealId}`);
        return;
      }

      if (action === 'login-role') {
        S.loginRole = actionEl.dataset.role;
        renderApp(loginHtml());
        return;
      }

      if (action === 'login-user') {
        await startWithUser(actionEl.dataset.id);
        return;
      }

      if (action === 'scope') {
        S.filters.list.scope = actionEl.dataset.scope;
        try {
          await viewList();
        } catch (err) { toast(err.message, 'error'); }
        return;
      }

      if (action === 'reset-filters') {
        S.filters.list = Object.assign(S.filters.list, { q: '', type: '', status: '', priority: '', categoryId: '', department: '', overdue: false, sort: 'updated_desc' });
        try {
          await viewList();
        } catch (err) { toast(err.message, 'error'); }
        return;
      }

      if (action === 'open-appeal') {
        go(`#/appeal/${actionEl.dataset.id}`);
        return;
      }

      if (action === 'remove-file') {
        S.newFiles.splice(Number(actionEl.dataset.index), 1);
        const list = $('#attach-list');
        if (list) list.innerHTML = filesHtml();
        return;
      }

      if (action === 'author-status') {
        try {
          await api(`/api/appeals/${actionEl.dataset.id}`, { method: 'PATCH', body: { status: actionEl.dataset.status } });
          await loadBoot();
          toast('Статус обновлён');
          await viewDetail(actionEl.dataset.id);
        } catch (err) { toast(err.message, 'error'); }
        return;
      }

      if (action === 'reset-demo') {
        if (window.__resetting) return;
        if (!window.confirm('Сбросить демонстрационные данные к исходному набору из 22 обращений?')) return;
        window.__resetting = true;
        actionEl.disabled = true;
        toast(IS_MOKKY ? 'Восстанавливаем демо-данные в Mokky.dev — это займёт до 30 секунд…' : 'Восстанавливаем демо-данные…');
        try {
          await api('/api/admin/reset', { method: 'POST', body: {} });
          await loadBoot();
          toast('Демо-данные восстановлены');
          go('#/');
        } catch (err) { toast(err.message, 'error'); }
        finally { window.__resetting = false; actionEl.disabled = false; }
        return;
      }
    }

    if (S.bellOpen && !e.target.closest('.bell-wrap')) {
      S.bellOpen = false;
      route();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.bellOpen) {
      S.bellOpen = false;
      route();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'login-search') {
      S.loginQuery = e.target.value;
      renderApp(loginHtml());
      return;
    }
    if (e.target.id === 'list-search') {
      S.filters.list.q = e.target.value;
      debouncedList();
      return;
    }
    if (e.target.id === 'new-subject') {
      const el = $('#subject-counter');
      if (el) el.textContent = `${e.target.value.length} / 160`;
      return;
    }
    if (e.target.id === 'new-description') {
      const el = $('#description-counter');
      if (el) el.textContent = `${e.target.value.length} / 6000`;
    }
  });

  const debouncedList = debounce(async () => {
    try {
      await viewList();
    } catch (err) { toast(err.message, 'error'); }
  }, 280);

  document.addEventListener('change', async (e) => {
    const el = e.target;

    if (el.matches('[data-filter]')) {
      const key = el.dataset.filter;
      S.filters.list[key] = el.type === 'checkbox' ? el.checked : el.value;
      try {
        await viewList();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (el.id === 'new-category' || el.id === 'new-priority') {
      const box = $('#route-preview');
      if (box) box.innerHTML = routePreview();
      return;
    }

    if (el.id === 'file-input') {
      const files = Array.from(el.files || []);
      for (const file of files) {
        if (S.newFiles.length >= 3) {
          toast('Можно прикрепить не более 3 файлов', 'error');
          break;
        }
        if (file.size > 3 * 1024 * 1024) {
          toast(`Файл «${file.name}» больше 3 МБ`, 'error');
          continue;
        }
        const dataBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
          reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
          reader.readAsDataURL(file);
        });
        S.newFiles.push({ name: file.name, size: file.size, mime: file.type || 'application/octet-stream', dataBase64 });
      }
      el.value = '';
      const list = $('#attach-list');
      if (list) list.innerHTML = filesHtml();
      return;
    }

    if (el.matches('[data-cat-assignee]')) {
      try {
        await api(`/api/categories/${el.dataset.catAssignee}`, { method: 'PATCH', body: { assigneeId: el.value || null } });
        await loadBoot();
        toast('Правило маршрутизации обновлено');
        await viewAdmin();
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (el.matches('[data-cat-active]')) {
      try {
        await api(`/api/categories/${el.dataset.catActive}`, { method: 'PATCH', body: { isActive: el.checked } });
        await loadBoot();
        toast(el.checked ? 'Категория включена' : 'Категория отключена');
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const kind = form.dataset.form;
    const id = form.dataset.id;
    const fd = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      if (kind === 'create') {
        const payload = {
          type: fd.get('type'),
          categoryId: fd.get('categoryId'),
          priority: fd.get('priority'),
          subject: fd.get('subject'),
          description: fd.get('description'),
          solution: fd.get('solution') || null,
          attachments: S.newFiles,
        };
        const res = await api('/api/appeals', { method: 'POST', body: payload });
        S.newFiles = [];
        await loadBoot();
        S.bellOpen = false;
        toast(`Обращение ${res.appeal.number} зарегистрировано и направлено ответственному`);
        go(`#/appeal/${res.appeal.id}`);
        return;
      }

      if (kind === 'comment') {
        const text = String(fd.get('text') || '').trim();
        const internal = fd.get('internal') === 'on';
        await api(`/api/appeals/${id}/comments`, { method: 'POST', body: { text, internal } });
        await loadBoot();
        toast(internal ? 'Внутренняя заметка добавлена' : 'Комментарий добавлен');
        await viewDetail(id);
        return;
      }

      if (kind === 'params') {
        const current = await api(`/api/appeals/${id}`);
        const appeal = current.appeal;
        const body = {};
        const status = fd.get('status');
        if (status && status !== appeal.status) {
          body.status = status;
          const comment = String(fd.get('statusComment') || '').trim();
          if (comment) body.comment = comment;
        }
        const assigneeId = fd.get('assigneeId');
        if (assigneeId && assigneeId !== appeal.assigneeId) body.assigneeId = assigneeId;
        const priority = fd.get('priority');
        if (priority && priority !== appeal.priority) body.priority = priority;
        const dueAt = fd.get('dueAt');
        const currentDue = appeal.dueAt ? appeal.dueAt.slice(0, 10) : '';
        if (dueAt !== currentDue) body.dueAt = dueAt || null;

        if (!Object.keys(body).length) {
          toast('Изменений нет');
          return;
        }
        await api(`/api/appeals/${id}`, { method: 'PATCH', body });
        await loadBoot();
        toast('Обращение обновлено');
        await viewDetail(id);
        return;
      }

      if (kind === 'decision') {
        await api(`/api/appeals/${id}/decision`, {
          method: 'POST',
          body: { status: fd.get('status'), text: fd.get('text'), actions: fd.get('actions') },
        });
        await loadBoot();
        toast('Решение зафиксировано, автор получил уведомление');
        await viewDetail(id);
        return;
      }

      if (kind === 'add-category') {
        await api('/api/categories', {
          method: 'POST',
          body: { name: fd.get('name'), department: fd.get('department') },
        });
        await loadBoot();
        toast('Категория добавлена');
        await viewAdmin();
      }
    } catch (err) {
      toast(err.message, 'error');
      if (err.field) {
        const input = form.querySelector(`[name="${err.field}"]`);
        if (input) input.focus();
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  /* ---------------- Старт ---------------- */

  async function init() {
    const savedId = localStorage.getItem('modus.signal.user');
    if (!savedId) {
      renderLogin();
      return;
    }
    S.user = { id: savedId };
    try {
      await loadBoot();
      await route();
    } catch (err) {
      localStorage.removeItem('modus.signal.user');
      S.user = null;
      await renderLogin();
    }
  }

  init();
})();
