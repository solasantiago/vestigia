import { useEffect, useState } from 'react';
import { STORE } from '../config.js';

// Mantener la pantalla encendida (modo kiosco del iPad).
// Usa la API Screen Wake Lock (Safari 16.4 o superior). Si el navegador no la tiene, no hace nada.

const KEY = `${STORE}.awake`;

export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

export function useWakeLock() {
  const [on, setOn] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* se ignora */
    }
    if (!on || !wakeLockSupported) {
      setActive(false);
      return undefined;
    }
    let lock = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    // El sistema suelta el bloqueo al cambiar de app o apagar la pantalla: se vuelve a pedir al volver.
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (lock) lock.release().catch(() => {});
    };
  }, [on]);

  return { on, setOn, active, supported: wakeLockSupported };
}
