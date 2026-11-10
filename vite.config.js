import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Rutas relativas: la web funciona en https://solasantiago.github.io/<nombre-del-repo>/
// sin importar cómo se llame el repositorio (la navegación usa #, no rutas).
// Dos páginas: la app (index.html) y ChanchitOS (chanchitos/index.html), que no se enlaza desde la app.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        chanchitos: fileURLToPath(new URL('./chanchitos/index.html', import.meta.url)),
      },
    },
  },
});
