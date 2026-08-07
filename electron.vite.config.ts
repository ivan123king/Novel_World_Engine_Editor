import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve('electron/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve('electron/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: '.',
    resolve: {
      alias: {
        '@': resolve('src'),
      },
    },
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: resolve('index.html'),
      },
    },
  },
});
