import { useEffect, useMemo, useState } from 'react';
import { AppCtx } from './lib/appctx.js';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { DataProvider, ToastProvider, useData } from './lib/data.jsx';
import { addDays, fmtDayLong, fmtDayShort, range, todayISO } from './lib/dates.js';
import { Segmented, ThemeSwitch } from './components/ui.jsx';
import { Denied, Loading, Login } from './components/Login.jsx';
import { HouseTrail, Mark } from './components/prints.jsx';
import { useTheme } from './lib/theme.js';
import { useWakeLock } from './lib/wakelock.js';
import { APP_NAME, APP_VERSION, FEATURES, STORE } from './config.js';
import Today from './views/Today.jsx';
import Habits from './views/Habits.jsx';
import Wellbeing from './views/Wellbeing.jsx';
import Dogs from './views/Dogs.jsx';
import HomeAgenda from './views/HomeAgenda.jsx';
import Analysis from './views/Analysis.jsx';

const TABS = [
  { id: 'hoy', label: 'Hoy', icon: '☀️', View: Today },
  { id: 'perros', label: 'Perros', icon: '🐾', period: true, View: Dogs },
  { id: 'habitos', label: 'Hábitos', icon: '✅', period: true, View: Habits },
  { id: 'bienestar', label: 'Bienestar', icon: '🌿', period: true, View: Wellbeing, feature: 'wellbeing', personal: true },
  { id: 'casa', label: 'Agenda y casa', icon: '🏠', View: HomeAgenda },
  { id: 'analisis', label: 'Análisis', icon: '🔍', period: true, View: Analysis, feature: 'analysis', personal: true },
];

const PERIODS = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
];

function readStore(key, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function usePersisted(key, initial) {
  const [v, setV] = useState(() => readStore(key, initial));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* navegación privada: se ignora */
    }
  }, [key, v]);
  return [v, setV];
}

function useHashTab() {
  const read = () => (typeof window === 'undefined' ? 'hoy' : window.location.hash.replace(/^#\/?/, '') || 'hoy');
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const on = () => setTab(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (id) => {
    if (window.location.hash !== `#${id}`) window.location.hash = id;
    setTab(id);
    window.scrollTo({ top: 0 });
  };
  return [tab, go];
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { status } = useAuth();
  if (status === 'loading') return <Loading />;
  if (status === 'signed-out') return <Login />;
  if (status === 'denied') return <Denied />;
  return (
    <DataProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </DataProvider>
  );
}

function Shell() {
  const { status, error, model, live, retry } = useData();
  const { role, signOut } = useAuth();
  const person = role; // v0.1: la única cuenta es "casa" (el iPad)
  const [period, setPeriod] = usePersisted(`${STORE}.period`, 30);
  const [tabId, go] = useHashTab();
  const [theme, setTheme] = useTheme();
  const awake = useWakeLock();
  const now = useNow();
  const today = todayISO(new Date(now));
  const startDate = model?.startDate ?? today;

  const tabs = TABS.filter((t) => (!t.feature || FEATURES[t.feature]) && !(t.personal && person === 'casa'));
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];

  const ctx = useMemo(() => {
    const wanted = addDays(today, -(period - 1));
    const start = wanted < startDate ? startDate : wanted;
    const prevStart = addDays(start, -period);
    const prevEnd = addDays(start, -1);
    return {
      person,
      today,
      now,
      period,
      startDate,
      days: start <= today ? range(start, today) : [],
      prevDays: prevEnd >= startDate ? range(prevStart < startDate ? startDate : prevStart, prevEnd) : [],
      start,
      clipped: wanted < startDate,
      go,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, today, now, period, startDate]);

  const notStarted = status === 'ready' && today < startDate;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app" data-person={person}>
        <div className="top-trail" aria-hidden="true">
          <HouseTrail height={150} width={1400} />
        </div>
        <header className="topbar">
          <div className="brand">
            <Mark size={46} />
            <div>
              <h1>{APP_NAME}</h1>
              <p className="brand-date">{fmtDayLong(today)}</p>
            </div>
          </div>
          <div className="topbar-right">
            <span className={`live ${live ? 'on' : ''}`} title={live ? 'Sincronizado en tiempo real' : 'Sin tiempo real'}>
              <span className="live-dot" aria-hidden="true" />
              {live ? 'En vivo' : 'Sin conexión en vivo'}
            </span>
            {awake.supported ? (
              <button
                type="button"
                className={`btn ghost xs awake ${awake.on ? 'on' : ''}`}
                aria-pressed={awake.on}
                title="Evita que la pantalla se apague mientras la app está abierta"
                onClick={() => awake.setOn(!awake.on)}
              >
                {awake.on ? '✓ Pantalla siempre encendida' : 'Mantener pantalla encendida'}
              </button>
            ) : null}
            <ThemeSwitch value={theme} onChange={setTheme} />
          </div>
        </header>

        <nav className="tabs" aria-label="Secciones">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className={t.id === tab.id ? 'on' : ''}
              aria-current={t.id === tab.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(t.id);
              }}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </a>
          ))}
        </nav>

        <main className="main">
          {status === 'loading' ? (
            <Loading text="Buscando los rastros de la casa…" />
          ) : status === 'error' ? (
            <div className="state error">
              <span className="state-icon" aria-hidden="true">
                🔌
              </span>
              <p>No pudimos conectarnos con la base de datos.</p>
              <p className="muted small">{error?.message}</p>
              <button type="button" className="btn" onClick={retry}>
                Reintentar
              </button>
            </div>
          ) : notStarted ? (
            <div className="state">
              <p className="big-note">
                Vestigia empieza a registrar el <strong>{fmtDayLong(startDate)}</strong>.
              </p>
            </div>
          ) : (
            <>
              {tab.period ? (
                <div className="filters">
                  <Segmented label="Período" options={PERIODS} value={period} onChange={setPeriod} size="sm" />
                  <span className="filters-range">
                    {ctx.clipped ? 'Desde el inicio: ' : ''}
                    {fmtDayShort(ctx.days[0])} – {fmtDayShort(today)}
                  </span>
                </div>
              ) : null}
              <tab.View key={`${tab.id}-${person}`} />
            </>
          )}
        </main>

        <footer className="foot">
          <p>
            <strong>
              {APP_NAME} v{APP_VERSION}
            </strong>{' '}
            · registrando desde el {fmtDayLong(startDate)}
          </p>
          <button type="button" className="btn ghost xs" onClick={signOut}>
            Cerrar sesión
          </button>
        </footer>
      </div>
    </AppCtx.Provider>
  );
}
