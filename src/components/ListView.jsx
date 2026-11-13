import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  Empty,
  ErrorBox,
  Icon,
  Loading,
  PriorityChip,
  StatusChip,
  fmtDate,
  fmtShort,
  plural,
  relTime,
} from '../lib/ui.jsx';

function scopeFor(user, explicit) {
  if (explicit) return explicit;
  if (user.role === 'admin') return 'all';
  if (user.role === 'manager') return 'inbox';
  return 'mine';
}

function deadline(appeal) {
  const sla = appeal.sla;
  if (sla.isOverdue) {
    const target = sla.firstResponseOverdue ? sla.firstResponseDueAt : sla.resolutionTarget;
    const days = Math.max(0, Math.round(((Date.now() - new Date(target)) / 86400000) * 10) / 10);
    const text = days < 1 ? `${Math.max(1, Math.round((Date.now() - new Date(target)) / 3600000))} ч` : `${days} дн`;
    return <span class="chip chip-overdue">просрочено {text}</span>;
  }
  return <span class="cell-muted">до {fmtDate(sla.resolutionTarget)}</span>;
}

export default function ListView({ user, boot, api, reloadKey, onOpen, notify }) {
  const [scope, setScope] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    status: '',
    categoryId: '',
    department: '',
    overdue: false,
    sort: 'updated_desc',
  });
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const currentScope = scopeFor(user, scope);
  const stats = boot.stats || {};
  const isManager = user.role === 'manager' || user.role === 'admin';

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.q === search ? f : { ...f, q: search }));
    }, 260);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('scope', currentScope);
    for (const key of ['q', 'type', 'status', 'categoryId', 'department']) {
      if (filters[key]) params.set(key, filters[key]);
    }
    if (filters.overdue) params.set('overdue', '1');
    params.set('sort', filters.sort);
    api(`/api/appeals?${params.toString()}`)
      .then((res) => {
        if (alive) setAppeals(res.appeals || []);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentScope, filters, reloadKey]);

  const departments = [...new Set(boot.categories.map((c) => c.department))].sort((a, b) => a.localeCompare(b, 'ru'));
  const activeFilterCount =
    [filters.q, filters.type, filters.status, filters.categoryId, filters.department].filter(Boolean).length +
    (filters.overdue ? 1 : 0);

  const tabs = [];
  if (isManager) tabs.push(['inbox', 'Входящие', stats.inbox]);
  tabs.push(['mine', 'Мои обращения', stats.mine]);
  if (user.role === 'admin') tabs.push(['all', 'Все обращения', stats.visible]);

  const resetFilters = () =>
    setFilters({ q: '', type: '', status: '', categoryId: '', department: '', overdue: false, sort: 'updated_desc' });

  return (
    <>
      <div class="page-head">
        <div>
          <h1>Обращения</h1>
          <div class="page-sub">
            Проблемы, предложения и отзывы сотрудников · {appeals.length} {plural(appeals.length, 'запись', 'записи', 'записей')} в выборке
          </div>
        </div>
        <button class="btn btn-primary" onClick={() => onOpen('new')}>
          <Icon name="plus" /> Новое обращение
        </button>
      </div>

      <div class="tabs">
        {tabs.map(([key, label, count]) => (
          <button class={`tab${currentScope === key ? ' active' : ''}`} onClick={() => setScope(key)}>
            {label}
            <span class="tab-count">{count || 0}</span>
          </button>
        ))}
      </div>

      <div class="filters">
        <div class="search-field">
          <input
            class="input"
            placeholder="Поиск по номеру, теме или описанию"
            value={search}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autocomplete="off"
          />
        </div>
        <select class="select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.currentTarget.value })}>
          <option value="">Тип: все</option>
          {Object.entries(boot.dictionaries.types).map(([key, label]) => <option value={key}>{label}</option>)}
        </select>
        <select class="select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.currentTarget.value })}>
          <option value="">Статус: все</option>
          {Object.entries(boot.dictionaries.statuses).map(([key, label]) => <option value={key}>{label}</option>)}
        </select>
        <select class="select" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.currentTarget.value })}>
          <option value="">Категория: все</option>
          {boot.categories.map((c) => <option value={c.id}>{c.name}</option>)}
        </select>
        <select class="select" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.currentTarget.value })}>
          <option value="">Подразделение: все</option>
          {departments.map((d) => <option value={d}>{d}</option>)}
        </select>
        <label class="checkline">
          <input type="checkbox" checked={filters.overdue} onChange={(e) => setFilters({ ...filters, overdue: e.currentTarget.checked })} /> Только просроченные
        </label>
        <select class="select" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.currentTarget.value })}>
          <option value="updated_desc">Сначала обновлённые</option>
          <option value="created_desc">Сначала новые</option>
          <option value="due_asc">По сроку рассмотрения</option>
          <option value="priority">По приоритету</option>
        </select>
        {activeFilterCount ? (
          <button class="btn btn-ghost btn-sm" onClick={resetFilters}>
            Сбросить фильтры ({activeFilterCount})
          </button>
        ) : null}
      </div>

      {error ? <ErrorBox message={error} onRetry={() => setFilters({ ...filters })} /> : null}
      {loading ? <Loading /> : null}

      {!loading && !error ? (
        <div class="table-wrap">
          <div class="table-scroll">
            <table class="table">
              <thead>
                <tr>
                  <th>Обращение</th><th>Категория</th><th>Автор</th><th>Ответственный</th>
                  <th>Статус</th><th>Приоритет</th><th>Срок</th><th>Создано</th>
                </tr>
              </thead>
              <tbody>
                {appeals.length ? (
                  appeals.map((appeal) => (
                    <tr class={appeal.sla.isOverdue ? 'row-overdue' : ''} onClick={() => onOpen(`appeal/${appeal.id}`)}>
                      <td>
                        <div class="cell-subject"><span class="row-num">{appeal.number}</span>{appeal.subject}</div>
                        <div class="cell-sub">
                          {appeal.typeLabel} · обновлено {relTime(appeal.updatedAt)}
                          {appeal.attachments && appeal.attachments.length ? ' · файл' : ''}
                        </div>
                      </td>
                      <td><div>{appeal.categoryName}</div><div class="cell-sub">{appeal.department}</div></td>
                      <td class="cell-muted">{appeal.authorName}</td>
                      <td class="cell-muted">{appeal.assigneeName}</td>
                      <td><StatusChip status={appeal.status} label={appeal.statusLabel} /></td>
                      <td><PriorityChip priority={appeal.priority} label={appeal.priorityLabel} /></td>
                      <td class="cell-nowrap">{deadline(appeal)}</td>
                      <td class="cell-muted cell-nowrap">{fmtShort(appeal.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colspan="8">
                      <Empty
                        title="Ничего не найдено"
                        text={activeFilterCount ? 'Измените фильтры или сбросьте их.' : 'В этой выборке пока нет обращений — создайте первое.'}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div class="table-foot">
            <span>
              {currentScope === 'inbox'
                ? 'Обращения, которые вы рассматриваете как ответственный или руководитель подразделения'
                : currentScope === 'mine'
                  ? 'Обращения, автором которых вы являетесь'
                  : 'Все обращения компании (доступ администратора)'}
            </span>
            <span>{stats.overdue ? `Просрочено: ${stats.overdue}` : 'Просроченных нет'}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
