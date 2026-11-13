import { h } from 'preact';

export const ICONS = {
  inbox: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  bell: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  back: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  out: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  file: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
};

export function Icon({ name }) {
  return <span class="nav-icon" dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }} />;
}

const dtfDate = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dtfShort = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });
const dtfDateTime = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function fmtDate(iso) {
  return iso ? dtfDate.format(new Date(iso)) : '—';
}
export function fmtShort(iso) {
  return iso ? dtfShort.format(new Date(iso)) : '—';
}
export function fmtDateTime(iso) {
  return iso ? dtfDateTime.format(new Date(iso)) : '—';
}
export function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return fmtDate(iso);
}
export function hoursHuman(hours) {
  if (hours == null) return '—';
  if (hours < 24) return `${Math.round(hours * 10) / 10} ч`;
  return `${Math.round((hours / 24) * 10) / 10} дн`;
}
export function daysHuman(hours) {
  return hours == null ? '—' : `${Math.round((hours / 24) * 10) / 10} дн`;
}
export function bytes(size) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / 1024 / 1024).toFixed(1)} МБ`;
}
export function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
export function initials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
export function avatarColor(name) {
  const palette = ['#2b4a75', '#37526b', '#4a3f6b', '#6b4a3a', '#2f5d55', '#544a2f', '#3f4b6b', '#5a3550'];
  let hash = 0;
  for (const ch of String(name || '')) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}
export function Avatar({ name, small }) {
  return (
    <span class={`avatar ${small ? 'sm' : ''}`} style={{ background: avatarColor(name) }}>
      {initials(name)}
    </span>
  );
}
export function StatusChip({ status, label }) {
  return (
    <span class={`chip status-${status}`}>
      <span class="chip-dot"></span>
      {label}
    </span>
  );
}
export function PriorityChip({ priority, label }) {
  return <span class={`chip prio-${priority}`}>{label}</span>;
}
export function TypeChip({ type, label }) {
  return <span class={`chip type-${type}`}>{label}</span>;
}
export function Empty({ title, text, action }) {
  return (
    <div class="empty">
      <div class="empty-icon">⌕</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Loading({ text = 'Загружаем данные…' }) {
  return (
    <div class="loading">
      <div class="spinner"></div>
      {text}
    </div>
  );
}
export function ErrorBox({ message, onRetry }) {
  return (
    <div class="card">
      <div class="card-body empty">
        <div class="empty-icon">!</div>
        <h3>Не удалось загрузить данные</h3>
        <p>{message}</p>
        {onRetry ? (
          <button class="btn" style="margin-top:14px" onClick={onRetry}>
            Повторить
          </button>
        ) : null}
      </div>
    </div>
  );
}
