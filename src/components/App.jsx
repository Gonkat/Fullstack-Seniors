import { h, Fragment } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import backend from '../lib/backend.js';
import Login from './Login.jsx';
import Shell from './Shell.jsx';
import ListView from './ListView.jsx';
import DetailView from './DetailView.jsx';
import NewView from './NewView.jsx';
import AnalyticsView from './AnalyticsView.jsx';
import AdminView from './AdminView.jsx';

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return { name: 'list' };
  if (parts[0] === 'appeal') return { name: 'appeal', id: parts[1] };
  if (['new', 'analytics', 'admin', 'login'].includes(parts[0])) return { name: parts[0] };
  return { name: 'list' };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [boot, setBoot] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [route, setRoute] = useState(parseHash());
  const [loading, setLoading] = useState(true);
  const [loginUsers, setLoginUsers] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, kind) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, kind, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  async function loadNotifications(currentUser) {
    try {
      const res = await backend.request('/api/notifications', { user: currentUser });
      setNotifications(res.notifications || []);
      return res;
    } catch (err) {
      setNotifications([]);
      return null;
    }
  }

  async function loadLoginUsers() {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await backend.request('/api/users');
      setLoginUsers(res.users || []);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadSession(id) {
    setLoading(true);
    setLoginError('');
    try {
      const current = { id };
      const nextBoot = await backend.request('/api/bootstrap', { user: current });
      setBoot(nextBoot);
      setUser(nextBoot.user);
      await loadNotifications(current);
    } catch (err) {
      localStorage.removeItem('modus.signal.user');
      setUser(null);
      setBoot(null);
      setLoginError(err.status === 401 ? 'Демонстрационный пользователь не найден. Выберите другого.' : err.message);
      await loadLoginUsers();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    const savedId = localStorage.getItem('modus.signal.user');
    if (savedId) loadSession(savedId);
    else {
      loadLoginUsers();
      setLoading(false);
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const api = useCallback(
    async (path, options = {}) => {
      try {
        return await backend.request(path, { ...options, user });
      } catch (err) {
        if (err.status === 401) {
          localStorage.removeItem('modus.signal.user');
          setUser(null);
          setBoot(null);
          setLoginError(err.message);
          loadLoginUsers();
        }
        throw err;
      }
    },
    [user],
  );

  async function refresh() {
    if (!user) return;
    const nextBoot = await backend.request('/api/bootstrap', { user });
    setBoot(nextBoot);
    setUser(nextBoot.user);
    await loadNotifications(user);
    setReloadKey((value) => value + 1);
  }

  async function login(id) {
    if (loggingIn) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      localStorage.setItem('modus.signal.user', id);
      await loadSession(id);
      if (location.hash && location.hash !== '#/') location.hash = '#/';
      setRoute({ name: 'list' });
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    localStorage.removeItem('modus.signal.user');
    setUser(null);
    setBoot(null);
    setNotifications([]);
    setBellOpen(false);
    setRoute({ name: 'list' });
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    loadLoginUsers();
    notify('Вы вышли из демонстрационного профиля');
  }

  function navigate(hash) {
    const target = hash === 'list' ? '#/' : `#/${hash}`;
    if (location.hash === target) setRoute(parseHash());
    else location.hash = target;
  }

  async function toggleBell() {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && user) await loadNotifications(user);
  }

  async function readAll() {
    try {
      await api('/api/notifications/read', { method: 'POST', body: {} });
      setNotifications((list) => list.map((item) => ({ ...item, read: true })));
      setBoot((current) => (current ? { ...current, unread: 0 } : current));
      notify('Все уведомления прочитаны');
      setBellOpen(false);
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  async function openNotification(item) {
    setBellOpen(false);
    try {
      await api('/api/notifications/read', { method: 'POST', body: { ids: [item.id] } });
      setBoot((current) => (current ? { ...current, unread: Math.max(0, (current.unread || 0) - 1) } : current));
    } catch (err) {
      /* уведомление не критично */
    }
    navigate(`appeal/${item.appealId}`);
  }

  useEffect(() => {
    if (!user) return;
    if (route.name === 'login') {
      navigate('list');
      return;
    }
    if (route.name === 'analytics' && user.role === 'employee') navigate('list');
    if (route.name === 'admin' && user.role !== 'admin') navigate('list');
  }, [route, user]);

  if (loading) {
    return (
      <div class="loading">
        <div class="spinner"></div>
        Загружаем «Модус Сигнал»…
      </div>
    );
  }

  if (!user || !boot) {
    return (
      <>
        <Login
          users={loginUsers}
          loading={loginLoading}
          error={loginError && !loginUsers ? loginError : ''}
          loginError={loginError}
          loggingIn={loggingIn}
          mode={backend.mode}
          onLogin={login}
          onRetry={loadLoginUsers}
        />
        {toast ? (
          <div class="toast-root">
            <div key={toast.id} class={`toast ${toast.kind || ''}`}>{toast.message}</div>
          </div>
        ) : null}
      </>
    );
  }

  let content = null;
  if (route.name === 'new') {
    content = (
      <NewView
        boot={boot}
        api={api}
        notify={notify}
        onCreated={(id) => navigate(`appeal/${id}`)}
        onCancel={() => navigate('list')}
      />
    );
  } else if (route.name === 'appeal') {
    content = (
      <DetailView
        key={`appeal-${route.id}`}
        id={route.id}
        boot={boot}
        api={api}
        reloadKey={reloadKey}
        onBack={() => navigate('list')}
        onNew={() => navigate('new')}
        onRefresh={refresh}
        notify={notify}
      />
    );
  } else if (route.name === 'analytics') {
    content = <AnalyticsView api={api} reloadKey={reloadKey} onOpen={navigate} />;
  } else if (route.name === 'admin') {
    content = (
      <AdminView
        api={api}
        reloadKey={reloadKey}
        onRefresh={refresh}
        onOpen={navigate}
        notify={notify}
      />
    );
  } else {
    content = (
      <ListView
        user={boot.user}
        boot={boot}
        api={api}
        reloadKey={reloadKey}
        onOpen={navigate}
        notify={notify}
      />
    );
  }

  return (
    <>
      <Shell
        user={boot.user}
        boot={boot}
        route={route}
        notifications={notifications}
        bellOpen={bellOpen}
        onBell={toggleBell}
        onReadAll={readAll}
        onNotification={openNotification}
        onLogout={logout}
        onNavigate={navigate}
      >
        {content}
      </Shell>
      {toast ? (
        <div class="toast-root">
          <div key={toast.id} class={`toast ${toast.kind || ''}`}>{toast.message}</div>
        </div>
      ) : null}
    </>
  );
}
