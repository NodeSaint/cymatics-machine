import { defineConfig } from 'vite';

// GitHub Pages serves the project from /cymatics-machine/.
// Locally (dev / preview) we use root so the URL stays clean.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cymatics-machine/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
