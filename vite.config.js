import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Rutas relativas: la web funciona en https://solasantiago.github.io/<nombre-del-repo>/
// sin importar cómo se llame el repositorio (la navegación usa #, no rutas).
export default defineConfig({
  base: './',
  plugins: [react()],
});
