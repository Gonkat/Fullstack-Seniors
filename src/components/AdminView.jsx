import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Avatar, ErrorBox, Loading } from '../lib/ui.jsx';

export default function AdminView({ api, reloadKey, onRefresh, onOpen, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', department: '' });

  async function load() {
    setLoading(true);
    try {
      setData(await api('/api/admin/overview'));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reloadKey]);

  async function patchCategory(id, patch, message) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/api/categories/${id}`, { method: 'PATCH', body: patch });
      await onRefresh();
      await load();
      notify(message);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api('/api/categories', { method: 'POST', body: newCategory });
      setNewCategory({ name: '', department: '' });
      await onRefresh();
      await load();
      notify('Категория добавлена');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function resetDemo() {
    if (busy) return;
    if (!window.confirm('Сбросить демонстрационные данные к исходному набору из 22 обращений?')) return;
    setBusy(true);
    notify('Восстанавливаем демо-данные — это займёт до 30 секунд…');
    try {
      await api('/api/admin/reset', { method: 'POST', body: {} });
      await onRefresh();
      notify('Демо-данные восстановлены');
      onOpen('list');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="Загружаем администрирование…" />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return null;

  const managers = data.users.filter((u) => ['manager', 'admin'].includes(u.role));
  const byRole = { employee: [], manager: [], admin: [] };
  data.users.forEach((user) => byRole[user.role] && byRole[user.role].push(user));
  const departments = [...new Set(data.categories.map((c) => c.department))];

  return (
    <>
      <div class="page-head">
        <div>
          <h1>Администрирование</h1>
          <div class="page-sub">Категории, правила маршрутизации и роли пользователей</div>
        </div>
        <button class="btn btn-danger-ghost btn-sm" disabled={busy} onClick={resetDemo}>Сбросить демо-данные</button>
      </div>

      <div class="kpi-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        <div class="kpi"><div class="kpi-label">Пользователи</div><div class="kpi-value">{data.stats.users}</div><div class="kpi-foot">{data.stats.managers} руководителей</div></div>
        <div class="kpi"><div class="kpi-label">Категории</div><div class="kpi-value">{data.stats.categories}</div><div class="kpi-foot">{data.stats.categoriesWithoutOwner} без ответственного</div></div>
        <div class={`kpi ${data.stats.unassigned ? 'danger' : 'ok'}`}><div class="kpi-label">Без ответственного</div><div class="kpi-value">{data.stats.unassigned}</div><div class="kpi-foot">{data.stats.unassigned ? 'риск потери обращения' : 'все маршрутизированы'}</div></div>
        <div class="kpi"><div class="kpi-label">Открытых обращений</div><div class="kpi-value">{data.stats.openAppeals}</div><div class="kpi-foot">в работе у подразделений</div></div>
      </div>

      <div class="admin-grid">
        <div class="card">
          <div class="card-head"><h2>Категории и маршрутизация</h2><span class="card-sub">ответственный по умолчанию</span></div>
          <div class="table-scroll">
            <table class="table compact">
              <thead><tr><th>Категория</th><th>Подразделение</th><th>Ответственный</th><th>Активна</th></tr></thead>
              <tbody>
                {data.categories.map((category) => (
                  <tr>
                    <td><b>{category.name}</b><div class="cell-sub">{category.description || ''}</div></td>
                    <td class="cell-muted">{category.department}</td>
                    <td>
                      <select
                        class="select mini-select"
                        value={category.assigneeId || ''}
                        disabled={busy}
                        onChange={(e) => patchCategory(category.id, { assigneeId: e.currentTarget.value || null }, 'Правило маршрутизации обновлено')}
                      >
                        <option value="">не назначен</option>
                        {managers.map((manager) => <option value={manager.id}>{manager.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={category.isActive !== false}
                        disabled={busy}
                        onChange={(e) => patchCategory(category.id, { isActive: e.currentTarget.checked }, e.currentTarget.checked ? 'Категория включена' : 'Категория отключена')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form class="add-category" onSubmit={addCategory}>
            <input class="input" placeholder="Новая категория" required minlength="3" value={newCategory.name} onInput={(e) => setNewCategory({ ...newCategory, name: e.currentTarget.value })} />
            <input class="input" placeholder="Подразделение" required list="dept-list" value={newCategory.department} onInput={(e) => setNewCategory({ ...newCategory, department: e.currentTarget.value })} />
            <datalist id="dept-list">{departments.map((department) => <option value={department}></option>)}</datalist>
            <button class="btn btn-primary" type="submit" disabled={busy}>Добавить</button>
          </form>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-head"><h2>Пользователи и роли</h2><span class="card-sub">{data.users.length}</span></div>
            <div class="card-body stack" style="gap:14px">
              {[['employee', 'Сотрудники'], ['manager', 'Руководители'], ['admin', 'Администратор']].map(([role, label]) => (
                <div>
                  <div class="side-label" style="margin-bottom:6px">{label} · {byRole[role].length}</div>
                  {byRole[role].map((user) => (
                    <div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-soft)">
                      <Avatar name={user.name} small />
                      <div style="min-width:0">
                        <div style="font-size:12.5px;font-weight:600">{user.name}</div>
                        <div class="cell-sub">{user.position} · {user.department}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {data.unassigned.length ? (
            <div class="card">
              <div class="card-head"><h2>Обращения без ответственного</h2></div>
              <div class="card-body stack" style="gap:6px">
                {data.unassigned.map((appeal) => (
                  <button class="repeat-item" style="text-align:left;background:none;border:0;padding:4px 0;cursor:pointer" onClick={() => onOpen(`appeal/${appeal.id}`)}>
                    <b>{appeal.number}</b> · {appeal.subject}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div class="info-note">
            <span>ⓘ</span>
            <div>
              В демонстрационном стенде роли фиксированы. В промышленной версии пользователи и руководители
              подразделений синхронизируются с Битрикс24 / Active Directory, а правила маршрутизации настраиваются
              по подразделению и категории.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
