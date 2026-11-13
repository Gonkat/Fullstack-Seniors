import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Avatar, ErrorBox, Loading } from '../lib/ui.jsx';

export default function Login({ users, loading, error, loginError, loggingIn, mode, onLogin, onRetry }) {
  const [role, setRole] = useState('employee');
  const [query, setQuery] = useState('');

  if (loading) return <Loading text="Загружаем демонстрационных пользователей…" />;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;

  const roles = [
    ['employee', 'Сотрудники'],
    ['manager', 'Руководители'],
    ['admin', 'Администратор'],
  ];
  const needle = query.trim().toLowerCase();
  const filtered = (users || []).filter(
    (u) => u.role === role && (!needle || `${u.name} ${u.position} ${u.department}`.toLowerCase().includes(needle)),
  );

  return (
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
          <p>
            Единый канал для сообщений о проблемах и улучшениях. Обращение регистрируется, автоматически направляется
            ответственному по категории и остаётся в истории вместе с решением.
          </p>
          <div class="login-points">
            <div class="login-point"><span class="dot">1</span><div><b>Подача за минуту.</b> Тип, категория, описание и материалы в одной форме.</div></div>
            <div class="login-point"><span class="dot">2</span><div><b>Маршрутизация по правилам.</b> Ответственный по категории и SLA первого ответа.</div></div>
            <div class="login-point"><span class="dot">3</span><div><b>Прозрачный результат.</b> Автор видит статус, уточнения и обоснованное решение.</div></div>
            <div class="login-point"><span class="dot">4</span><div><b>Аналитика.</b> Просрочки, повторяющиеся проблемы и доля закрытых обращений.</div></div>
          </div>
        </div>
        <div class="login-foot">
          Демонстрационный стенд хакатона · синтетические данные · вход без пароля
          {mode === 'mokky' ? ' · данные Mokky.dev' : ''}
        </div>
      </div>

      <div class="login-panel">
        <div class="login-card">
          <h2>Демонстрационный вход</h2>
          <p>Выберите пользователя, чтобы увидеть систему с его ролью и правами.</p>
          {loginError ? (
            <div class="info-note" style="border-color:#fecdca;background:#fff7f6;color:#b42318;margin-bottom:14px">
              {loginError}
            </div>
          ) : null}
          <div class="role-tabs">
            {roles.map(([key, label]) => (
              <button class={`role-tab${role === key ? ' active' : ''}`} onClick={() => setRole(key)}>
                {label}
              </button>
            ))}
          </div>
          <div class="login-search">
            <input
              class="input"
              placeholder="Поиск по имени или подразделению"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
              autocomplete="off"
            />
          </div>
          <div class="user-list">
            {filtered.length ? (
              filtered.map((u) => (
                <button class="user-option" disabled={loggingIn} onClick={() => onLogin(u.id)}>
                  <Avatar name={u.name} />
                  <span>
                    <span class="uo-name">{u.name}</span>
                    <span class="uo-sub" style="display:block">{u.position} · {u.department}</span>
                  </span>
                  <span class="uo-arrow">→</span>
                </button>
              ))
            ) : (
              <div class="popover-empty">Пользователи не найдены</div>
            )}
          </div>
          <div class="login-note">
            В демонстрационном стенде пароль не запрашивается: в промышленной версии вход выполняется через
            корпоративную учётную запись (SSO / Битрикс24).{' '}
            {mode === 'mokky'
              ? 'Сейчас данные хранятся в Mokky.dev, а роли проверяются в браузере — это временная схема до собственного backend.'
              : 'Права доступа в MVP проверяются на сервере.'}
          </div>
        </div>
      </div>
    </div>
  );
}
