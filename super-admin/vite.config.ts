import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backend = env.VITE_BACKEND_URL || 'http://localhost:8000';
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
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
      port: 5174,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
        },
      },
    },
  };
});
