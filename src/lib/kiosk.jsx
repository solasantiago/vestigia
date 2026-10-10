import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DAY_START_HOUR, STORE } from '../config.js';
import { dayMinToTs, todayISO } from './dates.js';
import { IS_PHONE } from './device.js';

// El iPad de la casa tiene dos momentos:
//   · resumen: pantalla completa que rota sola (nadie lo está usando)
//   · kiosco: la app para anotar, con "quién" elegido
// Al tocar el resumen se pregunta "¿Quién está usando el iPad?". Sin toques, vuelve solo al resumen
// (5 min, o 1 min después de guardar algo) y se olvida quién era.
//
// En un teléfono no hay resumen ni vuelta sola: abre en Hoy y recuerda quién es (se elige una vez).

const KioskCtx = createContext({ enabled: false, base: 'kiosk', asking: false, who: null, visitas: false });
export const useKiosk = () => useContext(KioskCtx);

const VISITAS_KEY = `${STORE}.visitas`;
const PHONE_WHO_KEY = `${STORE}.phoneWho`;

function phoneWhoChosen() {
  try {
    return window.localStorage.getItem(PHONE_WHO_KEY) != null;
  } catch {
    return false;
  }
}

function readPhoneWho() {
  try {
    const v = JSON.parse(window.localStorage.getItem(PHONE_WHO_KEY));
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}
const WHO_MS = 60 * 1000;

function readVisitas() {
  try {
    const v = JSON.parse(window.localStorage.getItem(VISITAS_KEY));
    return typeof v === 'number' && v > Date.now() ? v : null;
  } catch {
    return null;
  }
}

/** Las visitas se apagan solas al terminar el día de la casa (a las 5). */
function endOfHouseDay(now = Date.now()) {
  return dayMinToTs(todayISO(new Date(now)), 1440 + DAY_START_HOUR * 60);
}

export function KioskProvider({ enabled, rules, children }) {
  const phone = Boolean(enabled && IS_PHONE);
  const [base, setBase] = useState(enabled && !phone ? 'summary' : 'kiosk');
  const [who, setWho] = useState(() => (phone ? readPhoneWho() : null));
  // En el teléfono, la primera vez pregunta quién es.
  const [asking, setAsking] = useState(() => phone && !phoneWhoChosen());
  const [visitasUntil, setVisitasUntil] = useState(readVisitas);
  const lastTouch = useRef(Date.now());
  const lastSave = useRef(0);
  const idleMs = (rules?.ipad?.idle_sec ?? 300) * 1000;
  const afterSaveMs = (rules?.ipad?.after_save_sec ?? 60) * 1000;

  useEffect(() => {
    try {
      window.localStorage.setItem(VISITAS_KEY, JSON.stringify(visitasUntil));
    } catch {
      /* navegación privada */
    }
  }, [visitasUntil]);

  useEffect(() => {
    if (!enabled) return undefined;
    const touch = () => {
      lastTouch.current = Date.now();
    };
    const saved = () => {
      lastSave.current = Date.now();
    };
    window.addEventListener('pointerdown', touch, true);
    window.addEventListener('keydown', touch, true);
    window.addEventListener('vestigia:saved', saved);
    return () => {
      window.removeEventListener('pointerdown', touch, true);
      window.removeEventListener('keydown', touch, true);
      window.removeEventListener('vestigia:saved', saved);
    };
  }, [enabled]);

  const toSummary = useCallback(() => {
    if (phone) return;
    setBase('summary');
    setAsking(false);
    setWho(null);
    if (window.location.hash && window.location.hash !== '#hoy') window.history.replaceState(null, '', '#hoy');
    window.scrollTo(0, 0);
  }, [phone]);

  // Vuelta sola al resumen.
  useEffect(() => {
    if (!enabled || phone || (base === 'summary' && !asking)) return undefined;
    const t = setInterval(() => {
      const now = Date.now();
      const deadline = asking
        ? lastTouch.current + WHO_MS
        : lastSave.current > lastTouch.current
          ? lastSave.current + afterSaveMs
          : lastTouch.current + idleMs;
      if (now >= deadline) toSummary();
    }, 1000);
    return () => clearInterval(t);
  }, [enabled, phone, base, asking, idleMs, afterSaveMs, toSummary]);

  // Modo visitas vencido.
  useEffect(() => {
    if (!visitasUntil) return undefined;
    const t = setInterval(() => {
      if (Date.now() >= visitasUntil) setVisitasUntil(null);
    }, 30000);
    return () => clearInterval(t);
  }, [visitasUntil]);

  const ask = useCallback(() => {
    lastTouch.current = Date.now();
    setAsking(true);
  }, []);

  const choose = useCallback((id) => {
    lastTouch.current = Date.now();
    lastSave.current = 0;
    setWho(id);
    setAsking(false);
    setBase('kiosk');
    if (phone) {
      try {
        window.localStorage.setItem(PHONE_WHO_KEY, JSON.stringify(id));
      } catch {
        /* navegación privada */
      }
    }
  }, [phone]);

  const cancelAsk = useCallback(() => {
    lastTouch.current = Date.now();
    setAsking(false);
  }, []);

  const toggleVisitas = useCallback(() => {
    setVisitasUntil((v) => (v && Date.now() < v ? null : endOfHouseDay()));
  }, []);

  const visitas = Boolean(visitasUntil && Date.now() < visitasUntil);

  const value = useMemo(
    () => ({ enabled, phone, base, asking, who, visitas, ask, choose, cancelAsk, toSummary, toggleVisitas }),
    [enabled, phone, base, asking, who, visitas, ask, choose, cancelAsk, toSummary, toggleVisitas],
  );
  return <KioskCtx.Provider value={value}>{children}</KioskCtx.Provider>;
}
