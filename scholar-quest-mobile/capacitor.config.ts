import type { CapacitorConfig } from '@capacitor/cli';

// Live-reload toggle. Run with `LIVE_RELOAD=1 npm run cap:run:android` (or
// `LIVE_RELOAD=1 npx cap sync android`) to point the installed APK at the
// Vite dev server on your LAN. Leave unset for normal/release builds.
const liveReload = process.env.LIVE_RELOAD === '1';
const devHost = process.env.DEV_HOST || '10.205.131.35';
const devPort = process.env.DEV_PORT || '3001';

const config: CapacitorConfig = {
  appId: 'com.eduly.scholarquest',
  appName: 'Scholar Quest',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(liveReload
      ? {
          url: `http://${devHost}:${devPort}`,
          cleartext: true,
        }
      : {}),
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
