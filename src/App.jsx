import { useEffect, useMemo, useState } from 'react';
import { AppCtx } from './lib/appctx.js';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { DataProvider, ToastProvider, useData } from './lib/data.jsx';
import { KioskProvider, useKiosk } from './lib/kiosk.jsx';
import { addDays, fmtDayLong, fmtDayShort, fmtTime, isLateNight, range, todayISO } from './lib/dates.js';
import { computeDay, rulesOf } from './lib/status.js';
import { Avatar, Dialog, Segmented, ThemeSwitch } from './components/ui.jsx';
import { Denied, Loading, Login } from './components/Login.jsx';
import { HouseTrail, Mark } from './components/prints.jsx';
import { RedStrip } from './components/Semaforo.jsx';
import Summary, { lateNightNote, WhoOverlay } from './components/Summary.jsx';
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
  { id: 'casa', label: 'Agenda y casa', short: 'Agenda', icon: '🏠', View: HomeAgenda },
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

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
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
        <House />
      </ToastProvider>
    </DataProvider>
  );
}

/** La cuenta Casa (el iPad) tiene resumen + kiosco; las demás cuentas ven la app directamente. */
function House() {
  const { model } = useData();
  const { role } = useAuth();
  const rules = useMemo(() => (model ? rulesOf(model) : null), [model]);
  return (
    <KioskProvider enabled={role === 'casa'} rules={rules}>
      <Shell />
    </KioskProvider>
  );
}

function Shell() {
  const { status, error, model, live, retry } = useData();
  const { role, signOut } = useAuth();
  const kiosk = useKiosk();
  const person = role; // v0.1: la única cuenta es "casa" (el iPad)
  const isKiosk = kiosk.enabled;
  const [period, setPeriod] = usePersisted(`${STORE}.period`, 30);
  const [tabId, go] = useHashTab();
  const [theme, setTheme] = useTheme();
  const [menu, setMenu] = useState(false);
  const awake = useWakeLock();
  const now = useNow(isKiosk ? 15000 : 30000);
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

  // ── iPad: resumen a pantalla completa cuando nadie lo usa ──
  if (isKiosk && kiosk.base === 'summary') {
    if (status !== 'ready') {
      return status === 'error' ? <ErrorState error={error} retry={retry} /> : <Loading text="Buscando los rastros de la casa…" />;
    }
    return (
      <>
        <Summary />
        {kiosk.asking ? <WhoOverlay /> : null}
      </>
    );
  }

  const st = isKiosk && status === 'ready' ? computeDay(model, { day: today, now, visitas: kiosk.visitas }) : null;
  const reds = st && !model.acks.has(today) ? st.alerts : [];

  return (
    <AppCtx.Provider value={ctx}>
      <div className={`app ${isKiosk ? 'kiosk' : ''} ${isKiosk && tab.id === 'hoy' ? 'kiosk-home' : ''}`} data-person={person}>
        {isKiosk ? (
          <KioskBar tabs={tabs} tab={tab} go={go} now={now} theme={theme} setTheme={setTheme} onMenu={() => setMenu(true)} live={live} />
        ) : (
          <>
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
          </>
        )}

        {isKiosk ? <RedStrip items={reds} /> : null}
        {isKiosk && isLateNight(new Date(now)) ? <p className="late-note">{lateNightNote(today)}</p> : null}

        <main className="main">
          {status === 'loading' ? (
            <Loading text="Buscando los rastros de la casa…" />
          ) : status === 'error' ? (
            <ErrorState error={error} retry={retry} />
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

        {!(isKiosk && tab.id === 'hoy') ? (
          <footer className="foot">
            <p>
              <strong>
                {APP_NAME} v{APP_VERSION}
              </strong>{' '}
              · registrando desde el {fmtDayLong(startDate)}
            </p>
            {!isKiosk ? (
              <button type="button" className="btn ghost xs" onClick={signOut}>
                Cerrar sesión
              </button>
            ) : null}
          </footer>
        ) : null}

        {menu ? (
          <Dialog open onClose={() => setMenu(false)} title="Opciones del iPad">
            <div className="menu-list">
              <div className="menu-theme">
                <span className="form-label">Tema</span>
                <ThemeSwitch value={theme} onChange={setTheme} />
              </div>
              {awake.supported ? (
                <label className="check">
                  <input type="checkbox" checked={awake.on} onChange={(e) => awake.setOn(e.target.checked)} />
                  <span>Mantener la pantalla siempre encendida</span>
                </label>
              ) : (
                <p className="muted small">Para que la pantalla no se apague: Ajustes → Pantalla y brillo → Bloqueo automático → Nunca.</p>
              )}
              <p className="muted small">
                <span className={`live ${live ? 'on' : ''}`}>
                  <span className="live-dot" aria-hidden="true" />
                  {live ? 'Sincronizado en tiempo real' : 'Sin tiempo real: se actualiza cada 5 minutos'}
                </span>
              </p>
              <p className="muted small">
                {APP_NAME} v{APP_VERSION} · registrando desde el {fmtDayLong(startDate)}
              </p>
              <button type="button" className="btn ghost" onClick={signOut}>
                Cerrar sesión
              </button>
            </div>
          </Dialog>
        ) : null}
      </div>
      {kiosk.asking ? <WhoOverlay /> : null}
    </AppCtx.Provider>
  );
}

function KioskBar({ tabs, tab, go, now, theme, setTheme, onMenu, live }) {
  const { model } = useData();
  const kiosk = useKiosk();
  const who = kiosk.who ? model?.peopleById.get(kiosk.who) : null;
  return (
    <header className="kbar">
      <Mark size={34} />
      <span className="kbar-clock">
        {fmtTime(now)}
        <span className={`live-dot ${live ? 'on' : ''}`} title={live ? 'En vivo' : 'Sin tiempo real'} aria-hidden="true" />
      </span>
      <nav className="kbar-tabs" aria-label="Secciones">
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
            {t.short ?? t.label}
          </a>
        ))}
      </nav>
      <div className="kbar-right">
        <button type="button" className="who-chip" data-person={who?.id ?? 'none'} onClick={kiosk.ask} aria-label="Cambiar quién está usando el iPad">
          {who ? <Avatar person={who} size="sm" /> : <span aria-hidden="true">👀</span>}
          {who ? who.short_name : 'Solo miro'}
          <span aria-hidden="true" className="who-caret">
            ▾
          </span>
        </button>
        <button
          type="button"
          className={`btn xs visitas ${kiosk.visitas ? 'on' : ''}`}
          aria-pressed={kiosk.visitas}
          title="Oculta las pastillas del resumen hasta que termine el día"
          onClick={kiosk.toggleVisitas}
        >
          👥 Visitas
        </button>
        <ThemeSwitch value={theme} onChange={setTheme} compact />
        <button type="button" className="btn ghost icon" aria-label="Opciones" onClick={onMenu}>
          ⋯
        </button>
        <button type="button" className="btn xs primary" onClick={kiosk.toSummary}>
          Resumen
        </button>
      </div>
    </header>
  );
}

function ErrorState({ error, retry }) {
  return (
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
  );
}
