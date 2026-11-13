import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { Icon, bytes, fmtDate, fmtDateTime } from '../lib/ui.jsx';

export default function NewView({ boot, api, onCreated, onCancel, notify }) {
  const [type, setType] = useState('problem');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const categories = boot.categories.filter((c) => c.isActive !== false);
  const grouped = useMemo(() => {
    const map = new Map();
    for (const category of categories) {
      if (!map.has(category.department)) map.set(category.department, []);
      map.get(category.department).push(category);
    }
    return [...map.entries()];
  }, [categories]);

  const category = categories.find((c) => c.id === categoryId);
  const owner = category ? boot.users.find((u) => u.id === category.assigneeId) : null;
  const admin = boot.users.find((u) => u.role === 'admin');
  const sla = boot.dictionaries.sla[priority] || boot.dictionaries.sla.medium;
  const first = new Date(Date.now() + sla.firstResponse * 3600000).toISOString();
  const resolve = new Date(Date.now() + sla.resolution * 3600000).toISOString();

  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      reader.readAsDataURL(file);
    });
  }

  async function pickFiles(event) {
    const selected = Array.from(event.currentTarget.files || []);
    const next = [...files];
    for (const file of selected) {
      if (next.length >= 3) {
        notify('Можно прикрепить не более 3 файлов', 'error');
        break;
      }
      if (file.size > 3 * 1024 * 1024) {
        notify(`Файл «${file.name}» больше 3 МБ`, 'error');
        continue;
      }
      try {
        const dataBase64 = await readFile(file);
        next.push({ name: file.name, size: file.size, mime: file.type || 'application/octet-stream', dataBase64 });
      } catch (err) {
        notify(err.message, 'error');
      }
    }
    event.currentTarget.value = '';
    setFiles(next);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api('/api/appeals', {
        method: 'POST',
        body: {
          type,
          categoryId,
          priority,
          subject,
          description,
          solution: solution || null,
          attachments: files,
        },
      });
      setFiles([]);
      notify(`Обращение ${res.appeal.number} зарегистрировано и направлено ответственному`);
      onCreated(res.appeal.id);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div class="page-head">
        <div>
          <h1>Новое обращение</h1>
          <div class="page-sub">Опишите проблему или предложение — система направит обращение ответственному и зафиксирует сроки</div>
        </div>
        <button class="btn" onClick={onCancel}>Отмена</button>
      </div>

      <form class="form-grid" onSubmit={submit}>
        <div class="stack">
          <div class="card"><div class="card-body">
            <div class="field">
              <label>Тип обращения <span class="req">*</span></label>
              <div class="segmented">
                {[
                  ['problem', 'Проблема', 'Мешает работе'],
                  ['suggestion', 'Предложение', 'Как улучшить'],
                  ['praise', 'Отзыв', 'Отметить полезное'],
                ].map(([value, label, hint]) => (
                  <label class="seg-option">
                    <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} />
                    <span>{label}<small>{hint}</small></span>
                  </label>
                ))}
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Категория <span class="req">*</span></label>
                <select class="select" value={categoryId} required onChange={(e) => setCategoryId(e.currentTarget.value)}>
                  <option value="">Выберите категорию</option>
                  {grouped.map(([department, list]) => (
                    <optgroup label={department}>
                      {list.map((c) => <option value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <span class="field-hint">От категории зависит ответственный и подразделение.</span>
              </div>
              <div class="field">
                <label>Приоритет <span class="req">*</span></label>
                <select class="select" value={priority} onChange={(e) => setPriority(e.currentTarget.value)}>
                  <option value="low">Низкий — предложение, можно планово</option>
                  <option value="medium">Средний — влияет на работу</option>
                  <option value="high">Высокий — блокирует процесс</option>
                </select>
                <span class="field-hint">Приоритет определяет срок первого ответа и рассмотрения.</span>
              </div>
            </div>

            <div class="field">
              <label>Тема <span class="req">*</span></label>
              <input
                class="input"
                value={subject}
                maxlength="160"
                required
                minlength="5"
                placeholder="Коротко: что происходит и где"
                onInput={(e) => setSubject(e.currentTarget.value)}
              />
              <div class="counter">{subject.length} / 160</div>
            </div>

            <div class="field">
              <label>Описание ситуации <span class="req">*</span></label>
              <textarea
                class="textarea"
                value={description}
                maxlength="6000"
                required
                minlength="20"
                placeholder="Что происходит, в каких процессах, к чему это приводит. Без реальных имён клиентов и коммерческих условий."
                style="min-height:130px"
                onInput={(e) => setDescription(e.currentTarget.value)}
              />
              <div style="display:flex;justify-content:space-between">
                <span class="field-hint">Минимум 20 символов. Не указывайте конфиденциальные сведения.</span>
                <span class="counter">{description.length} / 6000</span>
              </div>
            </div>

            <div class="field">
              <label>Предлагаемое решение</label>
              <textarea
                class="textarea"
                value={solution}
                maxlength="4000"
                placeholder="Что, по вашему мнению, стоит изменить (необязательно)"
                style="min-height:84px"
                onInput={(e) => setSolution(e.currentTarget.value)}
              />
            </div>

            <div class="field">
              <label>Материалы</label>
              <label class="attach-drop">
                Прикрепить до 3 файлов (до 3 МБ). Для демонстрации используйте файлы-заглушки.
                <input type="file" multiple style="display:none" onChange={pickFiles} />
              </label>
              {files.length ? (
                <div class="attach-list">
                  {files.map((file, index) => (
                    <div class="attach-item">
                      <Icon name="file" />
                      <span>{file.name}</span>
                      <span style="color:#98a2b3">{bytes(file.size)}</span>
                      <button type="button" aria-label="Удалить" onClick={() => setFiles(files.filter((_, i) => i !== index))}>×</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div></div>
        </div>

        <div class="stack">
          <div class="card">
            <div class="card-head"><h2>Маршрутизация и сроки</h2></div>
            <div class="card-body">
              <div class="route-preview">
                <div class="route-row"><span>Ответственный</span><span>{owner ? owner.name : admin ? `${admin.name} (администратор)` : 'будет назначен'}</span></div>
                <div class="route-row"><span>Подразделение</span><span>{category ? category.department : '—'}</span></div>
                <div class="route-row"><span>Первый ответ</span><span>{fmtDateTime(first)}</span></div>
                <div class="route-row"><span>Срок рассмотрения</span><span>{fmtDate(resolve)}</span></div>
                <div class="route-row"><span>Правило</span><span>{owner ? 'по категории' : 'резервное: администратор'}</span></div>
              </div>
              <p class="field-hint" style="margin-top:8px">
                Маршрутизация выполняется по правилу категории при регистрации. Если ответственный не задан,
                обращение уходит администратору и не теряется.
              </p>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <button class="btn btn-primary" style="width:100%" type="submit" disabled={submitting}>
                {submitting ? 'Отправляем…' : 'Отправить обращение'}
              </button>
              <p class="field-hint" style="margin-top:10px">
                Обращение регистрируется автоматически, автор увидит его в разделе «Мои обращения»
                и получит уведомления об изменении статуса.
              </p>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
