import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, RotateCcw, Download, Smartphone, Sparkles,
  GraduationCap, Trophy, BookOpen, Zap,
} from 'lucide-react';

const BRAND = '#ec5b13';

const features = [
  { icon: GraduationCap, label: 'Onlayn darslar', desc: "Video va testlar bilan o'rganing" },
  { icon: Trophy, label: 'Reyting va ballar', desc: "Eng yaxshilar qatorida bo'ling" },
  { icon: BookOpen, label: "O'quv yo'lingiz", desc: "Shaxsiylashtirilgan dastur" },
  { icon: Zap, label: 'AI Tutor', desc: 'Sun\'iy intellekt yordamchi' },
];

export function StudentMobileDemo() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const reload = () => setIframeKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm text-white/80 hover:bg-white/10"
          >
            <ArrowLeft size={16} /> <span className="hidden xs:inline">Asosiyga</span>
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm font-medium">
            <Smartphone size={16} className="text-orange-400" />
            ScholarQuest — Talaba mobil ilovasi (demo)
          </div>
          <div className="md:hidden flex items-center gap-1.5 text-xs font-medium truncate">
            <Smartphone size={14} className="text-orange-400 flex-shrink-0" />
            <span className="truncate">ScholarQuest demo</span>
          </div>
          <button
            onClick={reload}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-white/10 px-2 sm:px-3 py-2 text-xs sm:text-sm hover:bg-white/15"
            title="Qayta yuklash"
          >
            <RotateCcw size={14} /> <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-300">
              <Sparkles size={14} /> Mobil ilova bilan talabalar uchun
            </div>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Talabalar uchun{' '}
              <span style={{ color: BRAND }}>ScholarQuest</span> mobil ilovasi
            </h1>
            <p className="mt-5 text-lg text-white/70">
              Talabalar darslar, jadval, ballar va AI Tutor xizmatidan o'z telefonida foydalanadi.
              Pastdagi telefon ekranida ilovaning to'liq demo versiyasini sinab ko'ring.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    whileHover={{ y: -3 }}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                  >
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${BRAND}25` }}
                    >
                      <Icon size={18} style={{ color: BRAND }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{f.label}</div>
                      <div className="mt-0.5 text-xs text-white/60">{f.desc}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/ScholarQuest-demo.apk"
                download
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                <Download size={16} /> Android APK yuklab olish
              </a>
              <button
                onClick={() => navigate('/landing')}
                className="rounded-lg border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/10"
              >
                Boshqa rollarni ko'rish
              </button>
            </div>

            <p className="mt-4 text-xs text-white/40">
              Demo rejimida — barcha ma'lumotlar soxta, hech qanday o'zgarish saqlanmaydi.
            </p>
          </motion.div>

          {/* Right: phone frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto"
          >
            {/* Glow */}
            <motion.div
              className="absolute inset-0 -z-10 rounded-[60px] bg-orange-500/30 blur-3xl"
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.95, 1.05, 0.95] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Phone bezel */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative mx-auto"
              style={{ width: 380, maxWidth: 'min(100%, calc(100vw - 2rem))' }}
            >
              <div className="relative rounded-[48px] bg-slate-950 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
                {/* Screen */}
                <div className="relative overflow-hidden rounded-[36px] bg-white" style={{ aspectRatio: '9/19.5' }}>
                  {/* Notch */}
                  <div className="pointer-events-none absolute top-0 left-1/2 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-950" />

                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src="/sq/index.html"
                    title="ScholarQuest Demo"
                    className="h-full w-full"
                    style={{ border: 0 }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>

                {/* Side buttons */}
                <div className="absolute -left-1 top-24 h-12 w-1 rounded-l bg-slate-700" />
                <div className="absolute -left-1 top-40 h-16 w-1 rounded-l bg-slate-700" />
                <div className="absolute -right-1 top-32 h-20 w-1 rounded-r bg-slate-700" />
              </div>
            </motion.div>

            {/* Caption */}
            <div className="mt-6 text-center text-sm text-white/50">
              Tap, swipe, navigate — telefondagi kabi
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
