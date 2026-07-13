import { defineConfig } from 'vite';

export default defineConfig({
  base: '/PixelPerfect/',
  build: {
    outDir: 'dist/site',
    emptyOutDir: false,
    sourcemap: true,
  },
  server: {
    open: false,
  },
});
