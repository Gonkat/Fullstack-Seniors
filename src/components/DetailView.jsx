import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  Avatar,
  ErrorBox,
  Icon,
  Loading,
  PriorityChip,
  StatusChip,
  TypeChip,
  bytes,
  fmtDate,
  fmtDateTime,
  hoursHuman,
  plural,
  relTime,
} from '../lib/ui.jsx';

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

function authorActionLabel(status) {
  return {
    in_review: 'Вернуть в работу',
    closed: 'Подтвердить закрытие',
    needs_clarification: 'Ответить на уточнение',
  }[status] || `Перевести в «${status}»`;
}

function TimelineItem({ event }) {
  const isComment = ['comment', 'internal_note'].includes(event.type);
  const isDecision = event.type === 'decision';
  const isClarification = event.type === 'clarification_requested';

  if (isComment) {
    return (
      <div class="tl-item">
        <Avatar name={event.actorName} small />
        <div class="tl-body">
          <div class="tl-head">
            <span class="tl-author">{event.actorName}</span>
            <span class="tl-time">{fmtDateTime(event.createdAt)} · {relTime(event.createdAt)}</span>
            {event.type === 'internal_note' ? (
              <span class="chip" style="background:#fdf3e1;color:#b54708">видно только ответственным</span>
            ) : null}
          </div>
          {event.type === 'internal_note' ? (
            <div class="tl-note">
              <div class="tl-note-label">Внутренняя заметка</div>
              {event.text}
            </div>
          ) : (
            <div class="tl-text">{event.text}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div class="tl-item">
      <span
        class="avatar sm"
        style={`background:${isDecision ? '#067647' : isClarification ? '#a3126c' : '#98a2b3'}`}
      >
        {isDecision ? '✓' : isClarification ? '?' : '•'}
      </span>
      <div class="tl-body">
        <div class="tl-head">
          <span class="tl-author">{EVENT_TITLES[event.type] || event.text}</span>
          <span class="tl-time">{fmtDateTime(event.createdAt)}</span>
        </div>
        <div class="tl-system">
          {event.actorName}
          {event.type === 'status_changed' && event.meta && event.meta.status ? (
            <> · новый статус: <StatusChip status={event.meta.status} label={event.meta.status} /></>
          ) : null}
        </div>
        {isDecision ? (
          <div class="tl-decision">
            {event.text.replace(/^Решение \([^)]*\):\s*/, '')}
            {event.meta && event.meta.actions ? (
              <div style="margin-top:6px;color:#475467"><b>Действия:</b> {event.meta.actions}</div>
            ) : null}
          </div>
        ) : isClarification ? (
          <div class="tl-note">{event.text.replace(/^Запрошено уточнение:\s*/, '')}</div>
        ) : (
          <div class="tl-text">{event.text}</div>
        )}
      </div>
    </div>
  );
}

export default function DetailView({ id, boot, api, reloadKey, onBack, onNew, onRefresh, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [params, setParams] = useState({ status: '', assigneeId: '', priority: 'medium', dueAt: '', statusComment: '' });
  const [comment, setComment] = useState({ text: '', internal: false });
  const [decision, setDecision] = useState({ status: 'implemented', text: '', actions: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api(`/api/appeals/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setParams({
          status: '',
          assigneeId: '',
          priority: res.appeal.priority,
          dueAt: res.appeal.dueAt ? res.appeal.dueAt.slice(0, 10) : '',
          statusComment: '',
        });
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
  }, [id, reloadKey, tick]);

  async function reload() {
    await onRefresh();
    setTick((value) => value + 1);
  }

  async function submitParams(event) {
    event.preventDefault();
    if (!data || busy) return;
    const appeal = data.appeal;
    const body = {};
    if (params.status && params.status !== appeal.status) {
      body.status = params.status;
      if (params.statusComment.trim()) body.comment = params.statusComment.trim();
    }
    if (params.assigneeId && params.assigneeId !== appeal.assigneeId) body.assigneeId = params.assigneeId;
    if (params.priority && params.priority !== appeal.priority) body.priority = params.priority;
    const currentDue = appeal.dueAt ? appeal.dueAt.slice(0, 10) : '';
    if (params.dueAt !== currentDue) body.dueAt = params.dueAt || null;
    if (!Object.keys(body).length) {
      notify('Изменений нет');
      return;
    }
    setBusy(true);
    try {
      await api(`/api/appeals/${appeal.id}`, { method: 'PATCH', body });
      notify('Обращение обновлено');
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(event) {
    event.preventDefault();
    if (!data || busy) return;
    setBusy(true);
    try {
      await api(`/api/appeals/${data.appeal.id}/decision`, {
        method: 'POST',
        body: { status: decision.status, text: decision.text, actions: decision.actions },
      });
      setDecision({ status: 'implemented', text: '', actions: '' });
      notify('Решение зафиксировано, автор получил уведомление');
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!data || busy || comment.text.trim().length < 2) return;
    setBusy(true);
    try {
      await api(`/api/appeals/${data.appeal.id}/comments`, {
        method: 'POST',
        body: { text: comment.text.trim(), internal: comment.internal },
      });
      setComment({ text: '', internal: false });
      notify(comment.internal ? 'Внутренняя заметка добавлена' : 'Комментарий добавлен');
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function authorStatus(status) {
    if (!data || busy) return;
    setBusy(true);
    try {
      await api(`/api/appeals/${data.appeal.id}`, { method: 'PATCH', body: { status } });
      notify('Статус обновлён');
      await reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="Загружаем обращение…" />;
  if (error) return <ErrorBox message={error} onRetry={() => setTick((value) => value + 1)} />;
  if (!data) return null;

  const appeal = data.appeal;
  const events = data.events || [];
  const permissions = data.permissions || {};
  const managers = boot.users.filter((u) => ['manager', 'admin'].includes(u.role));
  const statuses = permissions.availableStatuses || [];

  return (
    <>
      <div class="detail-head">
        <button class="backlink" onClick={onBack}>
          <Icon name="back" /> К списку обращений
        </button>
        <div class="detail-title">
          <div>
            <div class="detail-number">{appeal.number} · {appeal.categoryName} · создано {fmtDateTime(appeal.createdAt)}</div>
            <h1>{appeal.subject}</h1>
          </div>
        </div>
        <div class="chip-row">
          <StatusChip status={appeal.status} label={appeal.statusLabel} />
          <TypeChip type={appeal.type} label={appeal.typeLabel} />
          <PriorityChip priority={appeal.priority} label={appeal.priorityLabel} />
          {appeal.sla.isOverdue ? (
            <span class="chip chip-overdue">Просрочено{appeal.sla.firstResponseOverdue ? ' · нет первого ответа' : ''}</span>
          ) : null}
          {appeal.sla.firstResponseHours != null ? (
            <span class="chip chip-ok">Первый ответ за {hoursHuman(appeal.sla.firstResponseHours)}</span>
          ) : null}
        </div>
      </div>

      <div class="detail-grid">
        <div class="stack">
          <div class="card"><div class="card-body">
            <div class="meta-grid">
              <div class="meta-item"><div class="meta-label">Автор</div><div class="meta-value">{appeal.authorName}<small>{appeal.authorDepartment || ''}</small></div></div>
              <div class="meta-item"><div class="meta-label">Ответственный</div><div class="meta-value">{appeal.assigneeName}<small>{appeal.assigneeDepartment || ''}</small></div></div>
              <div class="meta-item"><div class="meta-label">Категория</div><div class="meta-value">{appeal.categoryName}<small>{appeal.department}</small></div></div>
              <div class="meta-item"><div class="meta-label">Создано</div><div class="meta-value">{fmtDateTime(appeal.createdAt)}<small>{relTime(appeal.createdAt)}</small></div></div>
              <div class="meta-item"><div class="meta-label">Приоритет и SLA</div><div class="meta-value">{appeal.priorityLabel}<small>первый ответ до {fmtDateTime(appeal.sla.firstResponseDueAt)}</small></div></div>
              <div class="meta-item"><div class="meta-label">Первый ответ</div><div class="meta-value">{appeal.firstResponseAt ? fmtDateTime(appeal.firstResponseAt) : 'Ожидается'}<small>{appeal.sla.firstResponseHours != null ? `через ${hoursHuman(appeal.sla.firstResponseHours)}` : 'SLA первого ответа'}</small></div></div>
              <div class="meta-item"><div class="meta-label">Срок рассмотрения</div><div class="meta-value">{fmtDate(appeal.sla.resolutionTarget)}{appeal.sla.resolutionOverdue ? ' · просрочено' : ''}<small>{appeal.dueAt ? 'установлен вручную' : 'по SLA'}</small></div></div>
              <div class="meta-item"><div class="meta-label">Результат</div><div class="meta-value">{appeal.resolvedAt ? fmtDate(appeal.resolvedAt) : '—'}<small>{appeal.decision ? (appeal.decision.status === 'rejected' ? 'отклонено с обоснованием' : 'решение зафиксировано') : 'ещё не зафиксирован'}</small></div></div>
            </div>
            <div class="prose-block" style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line-soft)">
              <div class="prose-title">Описание</div>
              <div class="prose">{appeal.description}</div>
            </div>
            {appeal.solution ? (
              <div class="prose-block">
                <div class="prose-title">Предлагаемое решение</div>
                <div class="prose">{appeal.solution}</div>
              </div>
            ) : null}
          </div></div>

          {appeal.decision ? (
            <div class="card"><div class="card-body">
              <div class={`decision-box${appeal.decision.status === 'rejected' ? ' rejected' : ''}`}>
                <div class="decision-head">
                  {appeal.decision.status === 'rejected' ? '✕ Отклонено' : '✓ Реализовано'}
                  <span class="chip" style="margin-left:auto">{fmtDate(appeal.decision.at)}</span>
                </div>
                <div class="prose">{appeal.decision.text}</div>
                {appeal.decision.actions ? (
                  <div class="decision-actions"><b>Предпринятые действия:</b><br />{appeal.decision.actions}</div>
                ) : null}
              </div>
            </div></div>
          ) : null}

          {appeal.attachments && appeal.attachments.length ? (
            <div class="card">
              <div class="card-head">
                <h2>Материалы</h2>
                <span class="card-sub">{appeal.attachments.length} {plural(appeal.attachments.length, 'файл', 'файла', 'файлов')}</span>
              </div>
              <div class="card-body"><div class="attachments">
                {appeal.attachments.map((file) => (
                  <div class="attachment">
                    <span class="file-ico"><Icon name="file" /></span>
                    <a href={file.url || `/api/attachments/${encodeURIComponent(file.id)}`} target="_blank" rel="noopener">{file.name}</a>
                    <span class="file-size">{bytes(file.size)}</span>
                  </div>
                ))}
              </div></div>
            </div>
          ) : null}

          <div class="card">
            <div class="card-head">
              <h2>История рассмотрения</h2>
              <span class="card-sub">{events.length} {plural(events.length, 'событие', 'события', 'событий')}</span>
            </div>
            <div class="card-body">
              <div class="timeline">
                {events.map((event) => <TimelineItem event={event} />)}
              </div>
              <form class="comment-form" onSubmit={submitComment}>
                <textarea
                  class="textarea"
                  value={comment.text}
                  required
                  minlength="2"
                  placeholder={permissions.canSeeInternal ? 'Комментарий, уточнение или внутренняя заметка' : 'Комментарий или ответ на уточнение'}
                  style="min-height:84px"
                  onInput={(e) => setComment({ ...comment, text: e.currentTarget.value })}
                />
                <div class="comment-actions">
                  {permissions.canSeeInternal ? (
                    <label class="checkline">
                      <input type="checkbox" checked={comment.internal} onChange={(e) => setComment({ ...comment, internal: e.currentTarget.checked })} /> Внутренняя заметка (не видна автору)
                    </label>
                  ) : (
                    <span class="field-hint">Автор видит все комментарии ответственного</span>
                  )}
                  <button class="btn btn-primary" type="submit" disabled={busy}>Отправить</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="stack">
          {permissions.canManage ? (
            <div class="card">
              <div class="card-head"><h2>Действия ответственного</h2><span class="card-sub">{boot.user.roleLabel}</span></div>
              <div class="card-body side-actions">
                <form class="side-actions" onSubmit={submitParams}>
                  <div class="side-block">
                    <label class="side-label">Статус обращения</label>
                    {statuses.length ? (
                      <>
                        <select class="select" value={params.status} onChange={(e) => setParams({ ...params, status: e.currentTarget.value })}>
                          <option value="">Не изменять ({appeal.statusLabel})</option>
                          {statuses.map((status) => (
                            <option value={status}>{boot.dictionaries.statuses[status] || status}</option>
                          ))}
                        </select>
                        <input class="input" placeholder="Комментарий к смене статуса (необязательно)" value={params.statusComment} onInput={(e) => setParams({ ...params, statusComment: e.currentTarget.value })} />
                      </>
                    ) : (
                      <div class={`chip status-${appeal.status}`}>{appeal.statusLabel} — переходы недоступны</div>
                    )}
                  </div>
                  <div class="side-block">
                    <label class="side-label">Ответственный</label>
                    <select class="select" value={params.assigneeId} onChange={(e) => setParams({ ...params, assigneeId: e.currentTarget.value })}>
                      <option value="">Оставить {appeal.assigneeName}</option>
                      {managers.map((manager) => <option value={manager.id}>{manager.name} — {manager.position}</option>)}
                    </select>
                  </div>
                  <div class="side-block">
                    <span class="side-label">Приоритет</span>
                    <select class="select" value={params.priority} onChange={(e) => setParams({ ...params, priority: e.currentTarget.value })}>
                      {Object.entries(boot.dictionaries.priorities).map(([key, label]) => <option value={key}>{label}</option>)}
                    </select>
                    <label class="side-label" style="margin-top:4px">Срок рассмотрения вручную</label>
                    <input class="input" type="date" value={params.dueAt} onInput={(e) => setParams({ ...params, dueAt: e.currentTarget.value })} />
                    <span class="field-hint">Пустое значение — применяется SLA по приоритету.</span>
                  </div>
                  <button class="btn btn-primary" type="submit" disabled={busy}>Сохранить изменения</button>
                </form>

                {permissions.canDecide ? (
                  <form class="side-block" onSubmit={submitDecision}>
                    <span class="side-label">Зафиксировать решение</span>
                    <select class="select" value={decision.status} onChange={(e) => setDecision({ ...decision, status: e.currentTarget.value })}>
                      <option value="implemented">Реализовано</option>
                      <option value="rejected">Отклонено с обоснованием</option>
                    </select>
                    <textarea class="textarea" value={decision.text} required minlength="10" placeholder="Что решено по обращению" style="min-height:78px" onInput={(e) => setDecision({ ...decision, text: e.currentTarget.value })} />
                    <textarea class="textarea" value={decision.actions} placeholder="Какие действия предприняты (необязательно)" style="min-height:56px" onInput={(e) => setDecision({ ...decision, actions: e.currentTarget.value })} />
                    <button class="btn btn-accent" type="submit" disabled={busy}>Сохранить решение</button>
                    <span class="field-hint">Автор увидит решение и сможет подтвердить закрытие.</span>
                  </form>
                ) : null}
              </div>
            </div>
          ) : (
            <div class="card">
              <div class="card-head"><h2>Действия автора</h2></div>
              <div class="card-body side-actions">
                {statuses.length ? (
                  <>
                    <p class="field-hint">Вы автор обращения и можете подтвердить результат или вернуть его в работу.</p>
                    <div class="side-buttons">
                      {statuses.map((status) => (
                        <button class={`btn ${status === 'closed' ? 'btn-primary' : ''}`} disabled={busy} onClick={() => authorStatus(status)}>
                          {authorActionLabel(status)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p class="field-hint">Ответственный рассматривает обращение. Вы получите уведомление при изменении статуса.</p>
                )}
                <div class="side-block">
                  <span class="side-label">Ответственный</span>
                  <div class="meta-value">{appeal.assigneeName}<small>{appeal.assigneeDepartment || ''}</small></div>
                </div>
              </div>
            </div>
          )}

          <div class="card">
            <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
              <div class="side-label">Прозрачность и доступ</div>
              <p class="field-hint">
                Автор видит собственное обращение, комментарии и решение. Ответственный и руководитель подразделения —
                обращения своего направления. Внутренние заметки автору недоступны. Администратор видит все обращения.
              </p>
              <div class="route-row" style="font-size:12px;display:flex;justify-content:space-between"><span>Маршрутизация</span><span>по категории</span></div>
              <button class="btn btn-ghost btn-sm" onClick={onNew}><Icon name="plus" /> Новое обращение</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
