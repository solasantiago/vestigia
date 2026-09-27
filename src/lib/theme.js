import { useEffect, useState } from 'react';

// Tema: 'system' sigue la configuración del dispositivo; 'light' y 'dark' la fuerzan.
// El valor se guarda en este navegador y se aplica como data-theme en <html>.
// index.html lo aplica antes de pintar para que no haya parpadeo.

const KEY = 'vestigia.theme';
const BG = { light: '#F5EFE6', dark: '#1C1814' };
const THEMES = ['system', 'light', 'dark'];

function read() {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY));
    return THEMES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  // La barra del navegador / iOS toma el color del tema efectivo.
  const effective = theme === 'system' ? (systemDark() ? 'dark' : 'light') : theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (theme === 'system') {
      m.setAttribute('content', m.media.includes('dark') ? BG.dark : BG.light);
    } else {
      m.setAttribute('content', BG[effective]);
    }
  });
}

export function useTheme() {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    apply(theme);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(theme));
    } catch {
      /* navegación privada: se ignora */
    }
  }, [theme]);

  // En modo sistema, si el dispositivo cambia (p. ej. modo oscuro automático a la noche), se acompaña.
  useEffect(() => {
    if (theme !== 'system' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply('system');
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [theme]);

  return [theme, setTheme];
}
