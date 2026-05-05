import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:8000';
  return {
    // Relative paths so Capacitor (https://localhost/) and a regular web
    // host both resolve `./assets/foo.js`. Absolute `/` paths break inside
    // the APK if Capacitor's webview ever changes how it serves the index.
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Manual chunks split the bundle so each cache entry can be reused
      // independently. AITutor + Gemini SDK live in their own chunk and are
      // only fetched when a student actually opens the tutor.
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@google/genai')) return 'gemini';
            if (id.includes('motion')) return 'motion';
            if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
            // Keep react, react-dom, scheduler, and use-sync-external-store
            // together in one chunk. Splitting them across chunks creates a
            // cycle (vendor needs react, react-dom imports scheduler, etc.)
            // which lets a chunk run before its exports are ready — surfacing
            // as a white screen with "X is undefined" in the console.
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/') ||
              id.includes('use-sync-external-store')
            ) {
              return 'react';
            }
            return 'vendor';
          },
        },
      },
      // Bumped because a few chunks legitimately exceed 500 KB on first
      // build; we now own the warning by enforcing manualChunks above.
      chunkSizeWarningLimit: 600,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
