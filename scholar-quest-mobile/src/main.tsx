import {Component, StrictMode, type ErrorInfo, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {isNativePlatform} from './lib/platform';

if (isNativePlatform()) {
  import('@capacitor/splash-screen')
    .then(({SplashScreen}) => SplashScreen.hide())
    .catch(() => {});
  import('@capacitor/status-bar')
    .then(({StatusBar, Style}) => StatusBar.setStyle({style: Style.Dark}).catch(() => {}))
    .catch(() => {});
}

// Last-resort error boundary. Without this, any error during the React tree
// init paints a white screen with no clue why — particularly painful inside
// the Capacitor APK where there's no devtools by default.
interface BoundaryState {
  error: Error | null;
}

class RootErrorBoundary extends Component<{children: ReactNode}, BoundaryState> {
  state: BoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Print to the WebView console so `adb logcat | grep chromium` picks it up.

    console.error('[ScholarQuest] root error:', error, info);
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || String(this.state.error);
      return (
        <div style={{
          padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#fff', background: '#1f1f1f', minHeight: '100vh',
        }}>
          <h2 style={{margin: '0 0 12px', fontSize: 18}}>Ilova ishga tushmadi</h2>
          <p style={{margin: '0 0 16px', fontSize: 14, opacity: 0.85}}>
            Texnik xatolik yuz berdi. Iltimos, ilovani yopib qayta oching.
          </p>
          <pre style={{
            background: '#000', color: '#fdba74', padding: 12, borderRadius: 8,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, margin: 0,
          }}>{msg}</pre>
          <button
            onClick={() => {
              try { localStorage.clear(); } catch { /* ignore */ }
              window.location.reload();
            }}
            style={{
              marginTop: 16, padding: '10px 16px', borderRadius: 8,
              background: '#ec5b13', color: '#fff', border: 0, fontWeight: 700,
            }}
          >
            Ma'lumotlarni tozalash va qayta ishga tushirish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Catch synchronous errors during the very first render too. ``createRoot``
// itself can throw if a top-level import init fails — wrap defensively so
// the user sees the message instead of a blank screen.
try {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error("'#root' element topilmadi");
  }
  createRoot(container).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
} catch (err) {
  // Render a minimal HTML error message directly into the DOM so the user
  // sees something even when React itself failed to mount.
  const root = document.getElementById('root') ?? document.body;
  root.innerHTML = `
    <div style="padding:24px;font-family:system-ui;color:#fff;background:#1f1f1f;min-height:100vh">
      <h2 style="margin:0 0 12px;font-size:18px">Ilova yuklanmadi</h2>
      <pre style="background:#000;color:#fdba74;padding:12px;border-radius:8px;
                  white-space:pre-wrap;word-break:break-word;font-size:12px;margin:0">
${(err instanceof Error ? err.stack || err.message : String(err))}
      </pre>
    </div>
  `;

  console.error('[ScholarQuest] mount failed:', err);
}
