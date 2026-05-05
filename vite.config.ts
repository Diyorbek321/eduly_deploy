import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // GEMINI_API_KEY only inlined in dev. In production it is empty so the key
    // is never shipped to browsers — Gemini should be proxied via backend.
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(
        mode === 'production' ? '' : env.GEMINI_API_KEY,
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          autoRewrite: true,
        },
      },
    },
  };
});
