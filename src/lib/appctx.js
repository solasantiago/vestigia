import { createContext, useContext } from 'react';

// Contexto de la vista: quién usa la app, qué día es hoy y el período elegido.
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
