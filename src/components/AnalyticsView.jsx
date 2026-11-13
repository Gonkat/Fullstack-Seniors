import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ErrorBox, Loading, daysHuman, fmtDate, hoursHuman, plural } from '../lib/ui.jsx';

function BarChart({ items, valueKey = 'count', total, cls }) {
  const max = Math.max(1, ...items.map((item) => item[valueKey]));
  return (
    <div class="chart">
      {items.map((item) => (
        <div class="bar-row">
          <span class="bar-label" title={item.label || item.name}>{item.label || item.name}</span>
          <span class="bar-track">
            <span class={`bar-fill ${cls || ''}`} style={`width:${Math.round((item[valueKey] / max) * 100)}%`} />
          </span>
          <span class="bar-value">{item[valueKey]}</span>
        </div>
      ))}
      {total === 0 ? <div class="field-hint" style="text-align:center">Нет данных за выбранный период</div> : null}
    </div>
  );
}

export default function AnalyticsView({ api, reloadKey, onOpen }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api('/api/analytics')
      .then((res) => {
        if (alive) {
          setData(res);
          setError('');
        }
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
  }, [reloadKey]);

  if (loading) return <Loading text="Считаем аналитику…" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const kpi = data.kpi;
  const maxMonth = Math.max(1, ...data.months.map((m) => Math.max(m.created, m.closed)));

  return (
    <>
      <div class="page-head">
        <div>
          <h1>Аналитика обращений</h1>
          <div class="page-sub">{data.scope.label} · показатели пересчитываются по каждому запросу</div>
        </div>
        <div class="chip">{fmtDate(new Date().toISOString())}</div>
      </div>

      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Всего обращений</div><div class="kpi-value">{kpi.total}</div><div class="kpi-foot">{kpi.open} в работе · {kpi.closedShare}% с результатом</div></div>
        <div class="kpi"><div class="kpi-label">Средний первый ответ</div><div class="kpi-value">{kpi.avgFirstResponseHours == null ? '—' : hoursHuman(kpi.avgFirstResponseHours)}</div><div class="kpi-foot">{kpi.slaFirstResponsePct == null ? 'нет данных' : `${kpi.slaFirstResponsePct}% в рамках SLA`}</div></div>
        <div class="kpi"><div class="kpi-label">Среднее рассмотрение</div><div class="kpi-value">{kpi.avgResolutionHours == null ? '—' : daysHuman(kpi.avgResolutionHours)}</div><div class="kpi-foot">по обращениям с решением</div></div>
        <div class={`kpi ${kpi.overdue ? 'danger' : 'ok'}`}><div class="kpi-label">Просрочено</div><div class="kpi-value">{kpi.overdue}</div><div class="kpi-foot">{kpi.overdue ? 'требуют внимания руководителя' : 'сроки соблюдаются'}</div></div>
        <div class="kpi ok"><div class="kpi-label">Реализовано</div><div class="kpi-value">{kpi.implemented}</div><div class="kpi-foot">включая подтверждённые автором</div></div>
        <div class="kpi"><div class="kpi-label">Отклонено</div><div class="kpi-value">{kpi.rejected}</div><div class="kpi-foot">с обоснованием для автора</div></div>
        <div class="kpi"><div class="kpi-label">Новых за 7 дней</div><div class="kpi-value">{kpi.newLast7Days}</div><div class="kpi-foot">{kpi.decidedLast30Days} решений за 30 дней</div></div>
        <div class="kpi"><div class="kpi-label">Открытых</div><div class="kpi-value">{kpi.open}</div><div class="kpi-foot">включая ожидающие уточнения</div></div>
      </div>

      <div class="analytics-grid">
        <div class="card">
          <div class="card-head"><h2>По типам обращений</h2><span class="card-sub">{kpi.total} всего</span></div>
          <div class="card-body"><BarChart items={data.byType} total={kpi.total} /></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>По статусам</h2><span class="card-sub">воронка рассмотрения</span></div>
          <div class="card-body"><BarChart items={data.byStatus} total={kpi.total} cls="accent" /></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>По подразделениям</h2><span class="card-sub">в зоне вашей ответственности</span></div>
          <div class="card-body"><BarChart items={data.byDepartment.map((d) => ({ label: d.name, count: d.count }))} total={kpi.total} cls="ok" /></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Динамика за 6 месяцев</h2><span class="card-sub">создано / закрыто</span></div>
          <div class="card-body">
            <div class="month-chart">
              {data.months.map((month) => (
                <div class="month-col">
                  <div class="month-bars">
                    <div class="month-bar" title={`Создано: ${month.created}`} style={`height:${Math.max(2, Math.round((month.created / maxMonth) * 100))}%`} />
                    <div class="month-bar closed" title={`Закрыто: ${month.closed}`} style={`height:${Math.max(2, Math.round((month.closed / maxMonth) * 100))}%`} />
                  </div>
                  <div class="month-label">{month.label}</div>
                </div>
              ))}
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
            {data.repeatProblems.length ? data.repeatProblems.map((repeat) => (
              <div class="repeat-card">
                <div class="repeat-head">
                  <div>
                    <div class="repeat-title">{repeat.name}</div>
                    <div class="card-sub">{repeat.department} · {repeat.problems} {plural(repeat.problems, 'проблема', 'проблемы', 'проблем')}</div>
                  </div>
                  <span class="chip chip-overdue">сигнал для процессов</span>
                </div>
                <div class="repeat-items">
                  {repeat.appeals.map((appeal) => (
                    <span class="repeat-item" onClick={() => onOpen(`appeal/${appeal.id}`)}><b>{appeal.number}</b> · {appeal.subject}</span>
                  ))}
                </div>
              </div>
            )) : <div class="field-hint">Повторяющихся проблем в категориях пока нет.</div>}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Требуют внимания: просрочено</h2><span class="card-sub">SLA первого ответа и рассмотрения</span></div>
          <div class="table-scroll">
            <table class="table compact">
              <thead><tr><th>Обращение</th><th>Ответственный</th><th>Просрочка</th></tr></thead>
              <tbody>
                {data.overdue.length ? data.overdue.slice(0, 8).map((item) => (
                  <tr onClick={() => onOpen(`appeal/${item.id}`)}>
                    <td><div class="cell-subject" style="font-size:12.5px"><span class="row-num">{item.number}</span>{item.subject}</div><div class="cell-sub">{item.kind === 'first_response' ? 'нет первого ответа' : 'срок рассмотрения истёк'}</div></td>
                    <td class="cell-muted">{item.assigneeName}</td>
                    <td class="cell-muted">{item.daysOverdue < 1 ? `${Math.max(1, Math.round(item.daysOverdue * 24))} ч` : `${item.daysOverdue} дн`}</td>
                  </tr>
                )) : <tr><td colspan="3"><div class="empty" style="padding:26px"><h3>Просрочек нет</h3><p>Все обращения отвечены в срок.</p></div></td></tr>}
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
              {data.topCategories.map((category) => (
                <tr>
                  <td><b>{category.name}</b></td>
                  <td class="cell-muted">{category.department}</td>
                  <td>{category.count}</td>
                  <td>{category.problems}</td>
                  <td>{category.open}</td>
                  <td>{category.implemented}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div class="info-note" style="margin-top:16px">
        <span>ⓘ</span>
        <div>
          Показатели «доля с результатом» и «среднее время первого ответа» рассчитаны по датам событий в системе.
          В промышленной версии сюда добавляются цели по SLA и разбивка по подразделениям с учётом иерархии.
        </div>
      </div>
    </>
  );
}
