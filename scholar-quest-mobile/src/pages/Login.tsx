import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { GraduationCap, Loader2, Mail, Phone, Lock, ArrowLeft, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/studentService';
import { startDemoMode } from '../lib/demoMode';
import { getApiBaseUrl, setApiBaseUrl } from '../lib/api';
import { cn } from '@/src/lib/utils';

type Mode =
  | 'email'              // email + password
  | 'phone'              // phone → OTP → token
  | 'forgot_request'     // phone → OTP for password reset
  | 'forgot_confirm';    // OTP + new password

export default function Login() {
  const { login, loginWithPhone } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>('email');

  // Shared state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const goAfterLogin = () => {
    const to = (location.state as { from?: string } | null)?.from ?? '/';
    navigate(to, { replace: true });
  };

  // Demo mode: lets the customer trial the app standalone without a
  // backend deployment. Sets the demo flag + a placeholder token so the
  // AuthContext rehydrates as the demo user on the next render.
  function handleStartDemo() {
    startDemoMode();
    // Hard reload so AuthContext re-runs its hydration path and reads
    // ``/auth/me`` from the demo short-circuit.
    window.location.assign('/');
  }

  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  function handleSaveApi() {
    setApiBaseUrl(apiUrl.trim());
    setInfo(`Server manzili saqlandi: ${apiUrl.trim() || '(default)'}`);
    setShowApiSettings(false);
  }

  function reset(next: Mode) {
    setFormError(null);
    setInfo(null);
    setSubmitting(false);
    setMode(next);
  }

  async function handleEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await login(email.trim(), password);
      goAfterLogin();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kirishda xatolik');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await authService.requestPhoneOtp(phone.trim());
      setInfo("SMS yuborildi. Kodni 5 daqiqa ichida kiriting.");
      // Stay on the same page — show the code-entry field below.
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'SMS yuborib bo\'lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithPhone(phone.trim(), code.trim());
      goAfterLogin();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kod noto\'g\'ri');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await authService.requestPasswordReset(phone.trim());
      setInfo("SMS yuborildi. Kodni 5 daqiqa ichida kiriting.");
      reset('forgot_confirm');
      setInfo("SMS yuborildi. Kodni 5 daqiqa ichida kiriting.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'SMS yuborib bo\'lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await authService.confirmPasswordReset(phone.trim(), code.trim(), newPassword);
      // Redirect to email login with a success notice.
      reset('email');
      setInfo("Parol o'zgartirildi. Yangi parol bilan kiring.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Tiklab bo\'lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:outline-none";
  const labelCls = "text-xs font-bold uppercase tracking-widest text-on-surface-variant";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-4xl shadow-xl p-8 space-y-6"
      >
        <div className="relative flex flex-col items-center text-center space-y-2">
          <button
            onClick={() => setShowApiSettings(v => !v)}
            className="absolute right-0 top-0 p-2 text-on-surface-variant hover:text-on-surface"
            title="Server manzilini sozlash"
            type="button"
          >
            <SettingsIcon size={18} />
          </button>
          <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
            <GraduationCap size={28} />
          </div>
          <h1 className="text-2xl font-extrabold">Scholar Quest</h1>
          <p className="text-sm text-on-surface-variant">Talaba hisobingiz bilan kiring</p>
        </div>

        {showApiSettings && (
          <div className="space-y-2 rounded-2xl bg-surface-container-low p-4 border border-outline-variant/30">
            <label className={labelCls}>Server (API) manzili</label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.eduly.uz"
              className={inputCls}
            />
            <p className="text-xs text-on-surface-variant">
              Bo'sh qoldiring — mobil uchun standart sozlama ishlatiladi.
            </p>
            <button
              type="button"
              onClick={handleSaveApi}
              className="w-full py-2 rounded-xl bg-primary text-on-primary font-bold text-sm"
            >
              Saqlash
            </button>
          </div>
        )}

        {/* Tabs — only shown on the two main login modes. */}
        {(mode === 'email' || mode === 'phone') && (
          <div className="flex p-1 bg-surface-container-low rounded-2xl">
            <button
              onClick={() => reset('email')}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
                mode === 'email' ? "bg-primary text-on-primary" : "text-on-surface-variant"
              )}
            >
              <Mail size={14} /> Email
            </button>
            <button
              onClick={() => reset('phone')}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
                mode === 'phone' ? "bg-primary text-on-primary" : "text-on-surface-variant"
              )}
            >
              <Phone size={14} /> Telefon
            </button>
          </div>
        )}

        {(mode === 'forgot_request' || mode === 'forgot_confirm') && (
          <button
            onClick={() => reset('email')}
            className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
          >
            <ArrowLeft size={16} /> Orqaga
          </button>
        )}

        {info && (
          <div className="text-sm text-primary bg-primary/10 rounded-2xl px-4 py-3">
            {info}
          </div>
        )}

        {formError && (
          <div className="text-sm text-error bg-error/10 rounded-2xl px-4 py-3">
            {formError}
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-1">
              <label className={labelCls}>Email</label>
              <input type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls} placeholder="student@edusaas.com" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Parol</label>
              <input type="password" autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls} placeholder="••••••••" />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-on-primary font-bold py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              Kirish
            </button>
            <button
              type="button"
              onClick={() => reset('forgot_request')}
              className="w-full text-sm text-on-surface-variant hover:text-on-surface"
            >
              Parolni unutdingizmi?
            </button>
          </form>
        )}

        {mode === 'phone' && (
          <div className="space-y-4">
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1">
                <label className={labelCls}>Telefon raqami</label>
                <input type="tel" autoComplete="tel" required value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls} placeholder="+998 90 123 45 67" />
              </div>
              <button
                type="submit"
                disabled={submitting || !phone.trim()}
                className="w-full bg-primary text-on-primary font-bold py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {info ? "Yangi kod yuborish" : "Kod yuborish"}
              </button>
            </form>
            {info && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 pt-4 border-t border-outline-variant/20">
                <div className="space-y-1">
                  <label className={labelCls}>SMS kodi</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={cn(inputCls, "text-center tracking-[0.4em] text-2xl font-bold")}
                    placeholder="••••••" maxLength={8} />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !code.trim()}
                  className="w-full bg-primary text-on-primary font-bold py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 size={18} className="animate-spin" />}
                  Tasdiqlash
                </button>
              </form>
            )}
          </div>
        )}

        {mode === 'forgot_request' && (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Telefoningizga SMS-kod yuboramiz. Kodni keyingi qadamda kiriting va yangi parol o'rnating.
            </p>
            <div className="space-y-1">
              <label className={labelCls}>Telefon raqami</label>
              <input type="tel" autoComplete="tel" required value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls} placeholder="+998 90 123 45 67" />
            </div>
            <button
              type="submit"
              disabled={submitting || !phone.trim()}
              className="w-full bg-primary text-on-primary font-bold py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              Kod yuborish
            </button>
          </form>
        )}

        {mode === 'forgot_confirm' && (
          <form onSubmit={handleForgotConfirm} className="space-y-4">
            <div className="space-y-1">
              <label className={labelCls}>SMS kodi</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" required value={code}
                onChange={(e) => setCode(e.target.value)}
                className={cn(inputCls, "text-center tracking-[0.4em] text-2xl font-bold")}
                placeholder="••••••" maxLength={8} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Yangi parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input type="password" autoComplete="new-password" required minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(inputCls, "pl-10")} placeholder="Kuchli parol" />
              </div>
              <p className="text-xs text-on-surface-variant">
                Kamida 8 ta belgi, katta va kichik harf, raqam.
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || !code.trim() || !newPassword.trim()}
              className="w-full bg-primary text-on-primary font-bold py-3 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              Parolni yangilash
            </button>
          </form>
        )}

        {/* Universal demo escape hatch — visible on every mode so a user
            who can't log in (no backend, wrong creds, no internet) still
            sees a working app. */}
        <div className="pt-4 border-t border-outline-variant/20 text-center">
          <p className="text-xs text-on-surface-variant mb-2">
            Hisobingiz yo'qmi yoki internetga ulanmaganmisiz?
          </p>
          <button
            type="button"
            onClick={handleStartDemo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-tertiary-container/30 text-on-surface text-sm font-bold hover:bg-tertiary-container/50 transition-all"
          >
            <Sparkles size={16} className="text-primary" />
            Demo sifatida ko'rish
          </button>
        </div>
      </motion.div>
    </div>
  );
}
