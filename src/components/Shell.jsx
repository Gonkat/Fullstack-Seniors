import { h } from 'preact';
import { Avatar, Icon, relTime } from '../lib/ui.jsx';

const TITLES = {
  list: ['Обращения', 'Проблемы, предложения и отзывы'],
  new: ['Новое обращение', 'Регистрация и маршрутизация'],
  appeal: ['Обращение', 'Карточка и история рассмотрения'],
  analytics: ['Аналитика', 'Показатели и повторяющиеся проблемы'],
  admin: ['Администрирование', 'Справочники и доступ'],
};

export default function Shell({
  user,
  boot,
  route,
  notifications,
  bellOpen,
  onBell,
  onReadAll,
  onNotification,
  onLogout,
  onNavigate,
  children,
}) {
  const stats = boot.stats || {};
  const unread = boot.unread || 0;
  const isManager = user.role === 'manager' || user.role === 'admin';
  const active = route.name === 'appeal' ? 'list' : route.name;
  const [title, sub] = TITLES[route.name] || TITLES.list;

  const navItem = (hash, icon, label, count, alert) => (
    <button class={`nav-item${active === hash ? ' active' : ''}`} onClick={() => onNavigate(hash)}>
      <Icon name={icon} />
      {label}
      {count ? <span class={`nav-count${alert ? ' alert' : ''}`}>{count}</span> : null}
    </button>
  );

  return (
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
          {navItem('list', 'inbox', 'Обращения', isManager ? stats.inbox : stats.mine, stats.overdue > 0 && isManager)}
          {navItem('new', 'plus', 'Новое обращение')}
          {isManager ? navItem('analytics', 'chart', 'Аналитика', stats.overdue, stats.overdue > 0) : null}
          {user.role === 'admin' ? navItem('admin', 'gear', 'Администрирование') : null}
        </nav>

        <div class="sidebar-foot">
          <div class="demo-note">
            <b>Демо-стенд.</b> Синтетические данные, вход без пароля.
            {boot.meta && boot.meta.demo === false ? '' : ' Хранилище: Mokky.dev (временное).'}
          </div>
          <div class="user-card">
            <Avatar name={user.name} />
            <div class="user-meta">
              <div class="user-name">{user.name}</div>
              <div class="user-role">{user.roleLabel} · {user.department}</div>
            </div>
            <button class="btn-signout" title="Выйти" onClick={onLogout}>
              <span dangerouslySetInnerHTML={{ __html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>' }} />
            </button>
          </div>
        </div>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="topbar-title">
            {title}
            {sub ? <span>{sub}</span> : null}
          </div>
          <div class="topbar-actions">
            <button class="btn btn-primary btn-sm" onClick={() => onNavigate('new')}>
              <Icon name="plus" /> Обращение
            </button>
            <div class="bell-wrap">
              <button class="bell" aria-label="Уведомления" onClick={onBell}>
                <Icon name="bell" />
                {unread ? <span class="bell-dot">{unread}</span> : null}
              </button>
              {bellOpen ? (
                <div class="popover">
                  <div class="popover-head">
                    <strong style="font-size:13px">Уведомления</strong>
                    <button class="btn btn-ghost btn-sm" disabled={!unread} onClick={onReadAll}>
                      Прочитать все
                    </button>
                  </div>
                  <div class="popover-list">
                    {notifications.length ? (
                      notifications.map((n) => (
                        <button class={`notif${n.read ? '' : ' unread'}`} onClick={() => onNotification(n)}>
                          <div class="notif-text">{n.text}</div>
                          <div class="notif-meta">{n.appealNumber || ''} · {relTime(n.createdAt)}</div>
                        </button>
                      ))
                    ) : (
                      <div class="popover-empty">Новых уведомлений нет</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main class="main">{children}</main>
      </div>
    </div>
  );
}
