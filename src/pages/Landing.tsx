import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
  AnimatePresence,
} from 'motion/react';
import {
  GraduationCap, Users, BookOpen, CreditCard, Calendar, BarChart3,
  MessageSquare, Trophy, ShieldCheck, Sparkles, ArrowRight, Check,
  Shield, Headphones, Globe, Zap, Star, Quote, Phone, Mail, MapPin,
  Smartphone, Brain, Target, Clock, TrendingUp, Award, PlayCircle,
  Mic, PenTool, BookOpenCheck, Headset, Menu, X,
} from 'lucide-react';
import { startDemo, DemoRole, isDemoModeAvailable } from '../lib/demoData';

const BRAND = '#ec5b13';
const PHONE_DISPLAY = '+998 93 191-33-08';
const PHONE_HREF = 'tel:+998931913308';
const EMAIL = 'dturgunboyev635@gmail.com';
const EMAIL_HREF = 'mailto:dturgunboyev635@gmail.com';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const features = [
  { icon: Users, title: "Talabalar boshqaruvi", desc: "Ro'yxatdan o'tish, profillar, davomat va to'lovlarni bir joyda kuzating. CRM, segmentlash, eksport.", color: '#ec5b13' },
  { icon: GraduationCap, title: "O'qituvchilar paneli", desc: "Dars jadvali, davomat, uy vazifalari va ish haqi uchun maxsus interfeys.", color: '#2563eb' },
  { icon: BookOpen, title: "Kurslar va guruhlar", desc: "Cheksiz kurslar, guruhlar, daraja, xona tayinlash va talaba migratsiyasi.", color: '#16a34a' },
  { icon: CreditCard, title: "To'lovlar integratsiyasi", desc: "Click, Payme, Cash va kartalar — barcha kanallar bitta hisobotda. Avto-eslatma SMS.", color: '#9333ea' },
  { icon: Calendar, title: "Aqlli jadval", desc: "Avtomatik jadval, xona to'qnashuvlarini tekshirish, push va SMS eslatmalar.", color: '#0891b2' },
  { icon: BarChart3, title: "Real-time hisobotlar", desc: "Daromad, davomat, ish haqi va konversiya. PDF/Excel eksport.", color: '#dc2626' },
  { icon: MessageSquare, title: "SMS va Chat", desc: "Ota-onalarga SMS, ichki chat, tayyor shablonlar va ommaviy yuborish.", color: '#ea580c' },
  { icon: Trophy, title: "Gamification", desc: "Talabalar uchun ball tizimi, daraja va mukofotlar do'koni.", color: '#ca8a04' },
];

const ieltsFeatures = [
  { icon: Headset, title: 'Listening', desc: '40 ta savol, real Cambridge formati, avtomatik audio plotlar.' },
  { icon: BookOpenCheck, title: 'Reading', desc: '3 ta passage, vaqt taymeri, avtomatik baholash va tushuntirish.' },
  { icon: PenTool, title: 'Writing', desc: 'Task 1 va Task 2. AI baholash band 0.5 aniqlikda + feedback.' },
  { icon: Mic, title: 'Speaking', desc: 'AI suhbatdosh, ovoz tahlili, talaffuz va fluency bahosi.' },
];

const stats = [
  { value: 250, suffix: '+', label: "Faol ta'lim markazlari" },
  { value: 18000, suffix: '+', label: 'Boshqarilgan talabalar' },
  { value: 99.9, suffix: '%', label: 'Uptime kafolati', decimals: 1 },
  { value: 24, suffix: '/7', label: "Texnik yordam" },
];

const pricing = [
  { name: 'Boshlang\'ich', desc: "Kichik markazlar uchun", price: 'Bepul boshlang', features: ["100 gacha talaba", "5 ta o'qituvchi", "Asosiy hisobotlar", "Email qo'llab-quvvatlash", "2 oy bepul sinov"] },
  { name: 'Pro', desc: "Eng mashhur tanlov", price: 'Maxsus narx', features: ["500 gacha talaba", "Cheksiz o'qituvchilar", "To'lov integratsiyasi", "SMS xizmati", "AI yordamchi", "IELTS Mock Test", "2 oy bepul sinov"], featured: true },
  { name: 'Korxona', desc: "Yirik tarmoqlar uchun", price: 'Shartnoma', features: ["Cheksiz talabalar", "Bir nechta filial", "Maxsus integratsiya", "Shaxsiy menedjer", "SLA kafolati", "On-premise variant"] },
];

const faqs = [
  { q: "Sinov muddati qanday?", a: "Yangi mijozlar uchun 2 oy to'liq bepul foydalanish imkoniyati. Karta yoki oldindan to'lov talab qilinmaydi." },
  { q: "Demo bepulmi?", a: "Ha, demo to'liq bepul va ro'yxatdan o'tishsiz ishlaydi. Faqat 'Demo' tugmasini bosing." },
  { q: "IELTS Mock Test platformasi qanday ishlaydi?", a: "Talabalar real Cambridge formatidagi to'liq testni ishlaydi. AI Listening, Reading, Writing va Speaking bo'limlarini avtomatik baholaydi va band ball + batafsil feedback beradi." },
  { q: "Ma'lumotlarim qayerda saqlanadi?", a: "Sizning ma'lumotlaringiz O'zbekistondagi xavfsiz serverlarda shifrlangan holda saqlanadi. Kunlik backup va GDPR-darajasidagi himoya." },
  { q: "Telefon ilovasi bormi?", a: "Ha, talabalar va o'qituvchilar uchun Android ilovasi mavjud. iOS versiyasi yaqin orada." },
  { q: "Hisob ochilgandan keyin yordam beriladimi?", a: "Albatta — har bir mijozga 2 oy bepul onboarding, video qo'llanmalar va doimiy texnik yordam." },
  { q: "Click va Payme integratsiyasi qanday qilinadi?", a: "Sizning hisobingizga merchant kalitlarini biz ulaymiz, 24 soat ichida ishga tushiriladi." },
];

const testimonials = [
  { name: "Sardor Karimov", role: "Direktor, Smart English Center", text: "Eduly bilan oy oxiri hisobotlari 3 kun emas, 5 daqiqada tayyor bo'ladi. To'lovlar Click orqali avtomatik tushadi.", rating: 5 },
  { name: "Dilnoza Rahimova", role: "O'quv menejer, IELTS Hub", text: "Mock test platformasi inqilob qildi — talabalarimiz haftada 3 marta to'liq IELTS oladi va AI-feedback olishadi.", rating: 5 },
  { name: "Bekzod Tursunov", role: "Asoschisi, EduLab", text: "3 ta filialni bitta panelda boshqaramiz. SMS yuborish va davomat avtomatlashtirildi. Vaqtimiz tejaldi.", rating: 5 },
];

const timeline = [
  { step: '01', title: "Ro'yxatdan o'ting", desc: "1 daqiqada akkaunt yarating, kerakli ma'lumotlarni kiriting." },
  { step: '02', title: 'Ma\'lumotlarni import qiling', desc: "Excel orqali talabalar va guruhlar bir bosishda yuklanadi." },
  { step: '03', title: "Komandangizni qo'shing", desc: "O'qituvchilar va administratorlarga rol bering." },
  { step: '04', title: "Ishni boshlang", desc: "2 oy bepul to'liq foydalaning, biz har qadamda yordamchimiz." },
];

// ─────────────────────────────────────────────────────────────────
// Animated counter
function AnimatedCounter({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// Magnetic button — follows cursor slightly
function MagneticButton({ children, className, style, onClick, href }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
  onClick?: () => void; href?: string;
}) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.25);
    y.set((e.clientY - r.top - r.height / 2) * 0.25);
  };
  const reset = () => { x.set(0); y.set(0); };

  const Tag: any = href ? motion.a : motion.button;
  return (
    <Tag
      ref={ref as React.Ref<HTMLAnchorElement & HTMLButtonElement>}
      href={href}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileTap={{ scale: 0.96 }}
      style={{ ...style, x, y }}
      className={className}
    >
      {children}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────────────
// 3D tilt card
function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 14);
    rx.set(-py * 14);
  };
  const reset = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
export function Landing() {
  const navigate = useNavigate();
  const { scrollY, scrollYProgress } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -50]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.6]);
  const progressBar = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });

  const demoEnabled = isDemoModeAvailable();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Imkoniyatlar' },
    { href: '#ielts', label: 'IELTS Mock' },
    { href: '#how', label: 'Qanday ishlaydi' },
    { href: '#pricing', label: 'Tariflar' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Aloqa' },
  ];

  const launchDemo = (role: DemoRole) => {
    if (!demoEnabled) {
      window.location.hash = '#contact';
      return;
    }
    if (role === 'STUDENT') {
      window.location.href = '/student-demo';
      return;
    }
    startDemo(role);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Skip-to-content link for screen readers / keyboard users (accessibility = SEO signal) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-orange-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Asosiy mazmunga o'tish
      </a>
      {/* Scroll progress bar */}
      <motion.div
        style={{ scaleX: progressBar, transformOrigin: '0%' }}
        className="fixed top-0 left-0 right-0 z-50 h-1 origin-left"
      >
        <div className="h-full" style={{ background: `linear-gradient(90deg, ${BRAND}, #ff8c42, ${BRAND})` }} />
      </motion.div>

      {/* Nav */}
      <header role="banner" aria-label="Asosiy navigatsiya" className="sticky top-1 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <motion.a
            href="#"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 shrink-0"
          >
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg shadow-md"
              style={{ backgroundColor: BRAND }}
            >
              <GraduationCap className="text-white" size={20} />
            </motion.div>
            <span className="text-lg sm:text-xl font-bold">Eduly</span>
          </motion.a>

          {/* Desktop nav (lg+) */}
          <nav aria-label="Asosiy menyu" className="hidden items-center gap-6 xl:gap-8 text-sm font-medium text-slate-600 lg:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="relative hover:text-slate-900 transition group whitespace-nowrap">
                {l.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-orange-500 transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Right side: actions + mobile toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/login')}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline-block"
            >
              Kirish
            </button>
            <MagneticButton
              onClick={() => launchDemo('ADMIN')}
              className="hidden rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:shadow-orange-500/40 whitespace-nowrap sm:inline-flex"
              style={{ backgroundColor: BRAND }}
            >
              {demoEnabled ? "Demo" : "Aloqa"}
            </MagneticButton>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Menyuni yopish" : "Menyuni ochish"}
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-200 bg-white lg:hidden"
            >
              <nav aria-label="Mobil menyu" className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-3 text-sm font-medium text-slate-700">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 hover:bg-slate-100"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Kirish
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); launchDemo('ADMIN'); }}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow"
                    style={{ backgroundColor: BRAND }}
                  >
                    {demoEnabled ? "Demoni ochish" : "Bog'lanish"}
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main">
      {/* Hero */}
      <section aria-label="Bosh banner" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-50 via-white to-white" />

        {/* Animated gradient mesh */}
        <motion.div
          className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-orange-200/40 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4], x: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 h-[420px] w-[420px] rounded-full bg-orange-300/30 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 h-72 w-72 rounded-full bg-pink-200/30 blur-3xl"
          animate={{ scale: [1, 1.3, 1], x: [0, -50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-orange-400/40"
            style={{
              left: `${(i * 13 + 10) % 90}%`,
              top: `${(i * 17 + 15) % 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        ))}

        <motion.div
          className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 lg:py-28"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-100/70 px-3 py-1 text-xs font-medium text-orange-700 shadow-sm"
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles size={14} />
                </motion.span>
                AI yordamchi · IELTS Mock Test · To'lov integratsiyasi
              </motion.div>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl"
              >
                Ta'lim markazingizni{' '}
                <span className="relative inline-block">
                  <span style={{ color: BRAND }}>bitta platformada</span>
                  <motion.svg
                    viewBox="0 0 200 12"
                    className="absolute -bottom-2 left-0 w-full"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, delay: 0.8 }}
                  >
                    <motion.path
                      d="M2,8 Q100,-2 198,6"
                      stroke={BRAND}
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </motion.svg>
                </span>{' '}
                boshqaring
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-5 sm:mt-6 text-base sm:text-lg text-slate-600"
              >
                <strong>Eduly — o'quv markazlar uchun tizim</strong> va ta'lim markazi boshqaruv platformasi: talabalar, o'qituvchilar, guruhlar, to'lovlar (Click, Payme), davomat va IELTS Mock Test bitta joyda. O'zbek tilida, ishonchli va arzon.
              </motion.p>
              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
                <MagneticButton
                  onClick={() => (demoEnabled ? launchDemo('ADMIN') : (window.location.hash = '#contact'))}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30"
                  style={{ backgroundColor: BRAND }}
                >
                  {demoEnabled ? "Demoni ochish" : "Bog'lanish"}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight size={18} />
                  </motion.span>
                </MagneticButton>
                <motion.a
                  whileHover={{ scale: 1.05, borderColor: BRAND }}
                  whileTap={{ scale: 0.97 }}
                  href="#ielts"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  <PlayCircle size={18} /> IELTS Mock Test
                </motion.a>
              </motion.div>
              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> <strong className="text-slate-700">2 oy bepul</strong></div>
                <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Karta talab qilinmaydi</div>
                <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> 1 daqiqada o'rnatish</div>
              </motion.div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
              >
                <div className="rounded-xl bg-slate-100 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    transition={{ delayChildren: 0.6 }}
                    className="grid grid-cols-3 gap-3"
                  >
                    {[
                      { label: 'Talabalar', value: '142', color: '#ec5b13' },
                      { label: 'Daromad', value: '28.5M', color: '#16a34a' },
                      { label: 'Davomat', value: '89%', color: '#2563eb' },
                    ].map((s) => (
                      <motion.div
                        key={s.label}
                        variants={fadeUp}
                        transition={{ duration: 0.4 }}
                        whileHover={{ y: -4, scale: 1.04 }}
                        className="rounded-lg bg-white p-3 shadow-sm"
                      >
                        <div className="text-xs text-slate-500">{s.label}</div>
                        <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                    <div className="mb-2 text-xs font-semibold text-slate-700">Haftalik davomat</div>
                    <div className="flex items-end gap-2 h-24">
                      {[88, 92, 85, 90, 87, 78, 65].map((v, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${v}%` }}
                          transition={{ duration: 0.8, delay: 0.8 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                          className="flex-1 rounded-t"
                          style={{ backgroundColor: BRAND, opacity: 0.3 + (v / 200) }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating cards */}
              <motion.div
                animate={{ y: [0, 10, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-6 -bottom-4 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:block"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-green-100 p-2">
                    <TrendingUp size={16} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Bu oy daromad</div>
                    <div className="text-sm font-bold">+34%</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [2, -2, 2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-4 top-8 hidden rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:block"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <Award size={16} style={{ color: BRAND }} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">IELTS Band</div>
                    <div className="text-sm font-bold">7.5 avg</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats counter strip */}
      <section className="border-y border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-12">
          <motion.div
            className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={stagger}
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center">
                <div className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl" style={{ color: BRAND }}>
                  <AnimatedCounter value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-sm text-slate-600">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Demo CTA — role pickers */}
      {demoEnabled && (
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold sm:text-4xl">Platformani har bir nuqtai nazardan ko'ring</h2>
            <p className="mt-3 text-slate-600">Birorta tugmani bosing — ma'lumotlarsiz to'liq demo ochiladi.</p>
          </motion.div>
          <motion.div
            className="mt-10 grid gap-4 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {([
              { role: 'ADMIN' as DemoRole, title: 'Admin paneli', desc: "To'liq boshqaruv: talabalar, to'lovlar, hisobotlar.", icon: Shield, accent: '#ec5b13' },
              { role: 'TEACHER' as DemoRole, title: "O'qituvchi paneli", desc: "Dars jadvali, davomat, uy vazifalari, ish haqi.", icon: GraduationCap, accent: '#2563eb' },
              { role: 'STUDENT' as DemoRole, title: 'Talaba paneli', desc: "Mening guruhim, jadval, to'lovlar, mukofotlar.", icon: BookOpen, accent: '#16a34a' },
            ]).map((c) => {
              const Icon = c.icon;
              return (
                <motion.button
                  key={c.role}
                  variants={fadeUp}
                  transition={{ duration: 0.5 }}
                  whileHover={{ y: -8, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => launchDemo(c.role)}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"
                >
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${c.accent}15` }}
                  >
                    <Icon size={24} style={{ color: c.accent }} />
                  </motion.div>
                  <div className="text-lg font-bold">{c.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{c.desc}</div>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium" style={{ color: c.accent }}>
                    Demoni ochish <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>
      )}

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            <Zap size={12} /> Imkoniyatlar
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">Hamma narsa bitta joyda</h2>
          <p className="mt-3 text-slate-600">Ta'lim markazi uchun zarur bo'lgan barcha modullar — hech narsani qoldirmaydi.</p>
        </motion.div>
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
              >
                <TiltCard className="h-full rounded-xl border border-slate-200 bg-white p-6 transition hover:border-orange-300 hover:shadow-lg">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${f.color}15` }}
                  >
                    <Icon size={22} style={{ color: f.color }} />
                  </motion.div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{f.desc}</div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* IELTS Mock Test Platform — flagship section */}
      <section id="ielts" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 sm:py-24 text-white">
        {/* Animated bg */}
        <motion.div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
              <Brain size={12} /> Yangi · AI Powered
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              IELTS Mock Test{' '}
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">platformasi</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-300">
              Real Cambridge formatidagi to'liq IELTS testi. AI Listening, Reading, Writing va Speaking
              bo'limlarini avtomatik baholaydi va batafsil feedback beradi.
            </p>
          </motion.div>

          {/* 4 skills */}
          <motion.div
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {ieltsFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  transition={{ duration: 0.5 }}
                >
                  <TiltCard className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <motion.div
                      className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-orange-500/20 blur-2xl transition-opacity group-hover:opacity-100"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 0.5 }}
                      transition={{ delay: i * 0.1 }}
                    />
                    <div className="relative">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.8 }}
                        className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-pink-500"
                      >
                        <Icon size={22} className="text-white" />
                      </motion.div>
                      <div className="text-lg font-bold">{f.title}</div>
                      <div className="mt-1 text-sm text-slate-300">{f.desc}</div>
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Mock test mockup card + bullets */}
          <div className="mt-16 grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7 }}
            >
              <h3 className="text-2xl sm:text-3xl font-bold">Talabalaringiz haftada 3 marta to'liq IELTS olishadi</h3>
              <ul className="mt-6 space-y-3">
                {[
                  'Avtomatik baholash — Listening va Reading 100% aniq, Writing/Speaking AI band 0.5 aniqlikda.',
                  "Cambridge formatidagi 50+ tayyor test, har hafta yangilanadi.",
                  "Batafsil feedback: xato joylar, grammatika, lug'at, fluency va talaffuz tahlili.",
                  "O'qituvchi paneli — talabalar progressi va zaif joylar real-time.",
                  'Mobile va desktop — har qanday qurilmadan.',
                ].map((t, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500">
                      <Check size={12} className="text-white" />
                    </div>
                    <span className="text-slate-300">{t}</span>
                  </motion.li>
                ))}
              </ul>
              <MagneticButton
                href="#contact"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-orange-500/30"
              >
                IELTS demoni ko'rish <ArrowRight size={18} />
              </MagneticButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30, rotateY: -15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8 }}
              style={{ transformPerspective: 1000 }}
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-semibold">Mock Test #12 · Academic</div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Clock size={12} /> 02:48:33
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Listening', score: 8.0, color: '#22d3ee' },
                    { label: 'Reading', score: 7.5, color: '#a78bfa' },
                    { label: 'Writing', score: 7.0, color: '#fb923c' },
                    { label: 'Speaking', score: 7.5, color: '#f472b6' },
                  ].map((s, i) => (
                    <div key={s.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-300">{s.label}</span>
                        <span className="font-bold" style={{ color: s.color }}>Band {s.score}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(s.score / 9) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500/20 to-pink-500/20 p-4">
                  <div>
                    <div className="text-xs text-slate-300">Overall Band</div>
                    <div className="text-3xl font-extrabold">7.5</div>
                  </div>
                  <Target size={36} className="text-orange-300" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works timeline */}
      <section id="how" className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            <Clock size={12} /> 4 qadamda
          </div>
          <h2 className="text-3xl font-bold sm:text-4xl">Qanday boshlash mumkin?</h2>
          <p className="mt-3 text-slate-600">5 daqiqada to'liq tayyor — texnik bilim talab qilinmaydi.</p>
        </motion.div>

        <motion.div
          className="relative grid gap-8 md:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {/* connecting line */}
          <div className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-orange-300 to-transparent md:block" />

          {timeline.map((t) => (
            <motion.div key={t.step} variants={fadeUp} transition={{ duration: 0.5 }} className="relative text-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-bold shadow-lg"
                style={{ border: `2px solid ${BRAND}`, color: BRAND }}
              >
                {t.step}
              </motion.div>
              <div className="mt-4 font-bold">{t.title}</div>
              <div className="mt-1 text-sm text-slate-600">{t.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
              <Star size={12} /> Mijozlarimiz
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">250+ ta'lim markazi tanlovi</h2>
          </motion.div>

          <motion.div
            className="grid gap-6 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp} transition={{ duration: 0.5 }}>
                <TiltCard className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <Quote size={28} className="mb-3 text-orange-300" />
                  <div className="flex gap-0.5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-slate-700">"{t.text}"</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-400 font-bold text-white">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Marquee strip */}
          <div className="relative mt-14 overflow-hidden">
            <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-slate-50 to-transparent" />
            <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-slate-50 to-transparent" />
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="flex gap-12 whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-slate-400"
            >
              {[...Array(2)].flatMap(() => [
                'Smart English Center', 'IELTS Hub', 'EduLab', 'Bright Academy', 'Future Stars',
                'Excel Learning', 'PrimeMind', 'TopScore Center', 'Global IQ', 'Cambridge Plus',
              ]).map((n, i) => (
                <span key={i} className="flex items-center gap-2">
                  <GraduationCap size={16} /> {n}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              <Sparkles size={12} /> 2 oy bepul
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">Sizga mos tarif</h2>
            <p className="mt-3 text-slate-600">Markazingizga mos tarifni tanlang. Barcha tariflar 2 oy bepul sinov bilan keladi.</p>
          </motion.div>
          <motion.div
            className="grid gap-6 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {pricing.map((p) => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                whileHover={{ y: -8, scale: p.featured ? 1.02 : 1.01 }}
                className={`relative rounded-2xl border p-6 sm:p-8 ${
                  p.featured
                    ? 'border-orange-300 bg-white shadow-2xl ring-2 ring-orange-200'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                {p.featured && (
                  <>
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white shadow-lg"
                      style={{ backgroundColor: BRAND }}
                    >
                      ★ Eng mashhur tanlov
                    </motion.div>
                  </>
                )}
                <div className="text-lg font-bold">{p.name}</div>
                <div className="mt-1 text-sm text-slate-500">{p.desc}</div>
                <div className="mt-4">
                  <span className="text-2xl font-extrabold" style={{ color: BRAND }}>{p.price}</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => launchDemo('ADMIN')}
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold transition ${
                    p.featured
                      ? 'text-white shadow-lg hover:shadow-orange-500/40'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                  style={p.featured ? { backgroundColor: BRAND } : undefined}
                >
                  Boshlash
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="relative grid items-center gap-8 overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-8 lg:p-10 text-white lg:grid-cols-3"
        >
          <motion.div
            className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <div className="relative lg:col-span-2">
            <h3 className="text-2xl font-bold sm:text-3xl">Xavfsiz, ishonchli, O'zbek tilida</h3>
            <p className="mt-2 text-slate-300">JWT autentifikatsiya, shifrlangan ma'lumotlar, kunlik backuplar. 99.9% uptime kafolati va 24/7 texnik yordam.</p>
            <div className="mt-6 flex flex-wrap gap-4">
              {[
                { icon: ShieldCheck, label: 'SSL + JWT' },
                { icon: Globe, label: "O'zbekistonda hosting" },
                { icon: Headphones, label: '24/7 yordam' },
                { icon: Smartphone, label: 'Mobile app' },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                    <Icon size={14} className="text-green-400" /> {b.label}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative flex items-center gap-3">
            <ShieldCheck size={36} className="text-green-400" />
            <div>
              <div className="text-sm font-semibold">Bank darajasidagi xavfsizlik</div>
              <div className="text-xs text-slate-400">AES-256 shifrlash</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <h2 className="text-3xl font-bold sm:text-4xl">Tez-tez beriladigan savollar</h2>
          <p className="mt-3 text-slate-600">Javob topa olmadingizmi? Biz bilan {PHONE_DISPLAY} raqami orqali bog'laning.</p>
        </motion.div>
        <motion.div
          className="space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {faqs.map((f) => (
            <motion.details
              key={f.q}
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              whileHover={{ borderColor: '#fdba74' }}
              className="group rounded-lg border border-slate-200 bg-white p-4 transition [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {f.q}
                <span className="text-slate-400 transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600">{f.a}</p>
            </motion.details>
          ))}
        </motion.div>
      </section>

      {/* Contact / CTA */}
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 py-14 sm:py-20 text-white">
        <motion.div
          className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 right-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="relative mx-auto max-w-5xl px-4 sm:px-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">Bugun boshlang — 2 oy bepul</h2>
            <p className="mt-3 text-orange-50">
              Demoni oching yoki biz bilan bog'laning. 24 soat ichida onboarding boshlaymiz.
            </p>
          </div>

          <div className="mt-10 grid gap-4 grid-cols-1 sm:grid-cols-3">
            <motion.a
              whileHover={{ y: -4, scale: 1.02 }}
              href={PHONE_HREF}
              className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 sm:p-5 backdrop-blur transition hover:bg-white/15 min-w-0"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Phone size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-orange-100">Telefon</div>
                <div className="text-sm font-bold">{PHONE_DISPLAY}</div>
              </div>
            </motion.a>
            <motion.a
              whileHover={{ y: -4, scale: 1.02 }}
              href={EMAIL_HREF}
              className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 sm:p-5 backdrop-blur transition hover:bg-white/15 min-w-0"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Mail size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-orange-100">Email</div>
                <div className="text-xs sm:text-sm font-bold break-all">{EMAIL}</div>
              </div>
            </motion.a>
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 sm:p-5 backdrop-blur min-w-0"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <MapPin size={22} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-orange-100">Manzil</div>
                <div className="text-sm font-bold">Toshkent, O'zbekiston</div>
              </div>
            </motion.div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <MagneticButton
              onClick={() => launchDemo('ADMIN')}
              className="rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-orange-600 shadow-2xl"
            >
              Demoni ochish
            </MagneticButton>
            <MagneticButton
              href={PHONE_HREF}
              className="rounded-lg border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
            >
              <span className="inline-flex items-center gap-2"><Phone size={16} /> {PHONE_DISPLAY}</span>
            </MagneticButton>
          </div>
        </motion.div>
      </section>

      </main>

      {/* Footer */}
      <footer role="contentinfo" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: BRAND }}>
                  <GraduationCap className="text-white" size={16} />
                </div>
                <span className="font-bold">Eduly</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">Ta'lim markazlari uchun zamonaviy boshqaruv platformasi.</p>
            </div>
            <div>
              <div className="text-sm font-semibold">Mahsulot</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-slate-900">Imkoniyatlar</a></li>
                <li><a href="#ielts" className="hover:text-slate-900">IELTS Mock</a></li>
                <li><a href="#pricing" className="hover:text-slate-900">Tariflar</a></li>
                <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold">Kompaniya</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#contact" className="hover:text-slate-900">Aloqa</a></li>
                <li><a href="#" className="hover:text-slate-900">Maxfiylik</a></li>
                <li><a href="#" className="hover:text-slate-900">Shartlar</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold">Aloqa</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2"><Phone size={14} /> <a href={PHONE_HREF} className="hover:text-slate-900">{PHONE_DISPLAY}</a></li>
                <li className="flex items-center gap-2 min-w-0"><Mail size={14} className="shrink-0" /> <a href={EMAIL_HREF} className="hover:text-slate-900 break-all">{EMAIL}</a></li>
                <li className="flex items-center gap-2"><MapPin size={14} /> Toshkent</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row">
            <span>© {new Date().getFullYear()} Eduly. Barcha huquqlar himoyalangan.</span>
            <span>Made with <span className="text-orange-500">♥</span> in O'zbekiston</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
