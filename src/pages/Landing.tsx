import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  GraduationCap, Users, BookOpen, CreditCard, Calendar, BarChart3,
  MessageSquare, Trophy, ShieldCheck, Sparkles, ArrowRight, Check,
  Shield,
} from 'lucide-react';
import { startDemo, DemoRole, isDemoModeAvailable } from '../lib/demoData';

const BRAND = '#ec5b13';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const features = [
  { icon: Users, title: "Talabalar boshqaruvi", desc: "Ro'yxatdan o'tish, profillar, davomat va to'lovlarni bir joyda kuzating." },
  { icon: GraduationCap, title: "O'qituvchilar paneli", desc: "Dars jadvali, davomat va uy vazifalari uchun maxsus interfeys." },
  { icon: BookOpen, title: "Kurslar va guruhlar", desc: "Cheksiz kurslar, guruhlar, daraja va xona tayinlash." },
  { icon: CreditCard, title: "To'lovlar", desc: "Click, Payme, Cash va kartalar — barcha kanallar bir hisobotda." },
  { icon: Calendar, title: "Jadval", desc: "Avtomatik jadval, xona to'qnashuvlarini tekshirish, eslatmalar." },
  { icon: BarChart3, title: "Hisobotlar", desc: "Daromad, davomat, ish haqi va konversiya tahlili." },
  { icon: MessageSquare, title: "SMS va Chat", desc: "Ota-onalarga SMS, ichki chat, shablonlar va massa-yuborish." },
  { icon: Trophy, title: "Gamification", desc: "Talabalar uchun ball tizimi va mukofotlar do'koni." },
];

const pricing = [
  { name: 'Boshlangich', desc: "Kichik markazlar uchun", features: ["100 gacha talaba", "5 ta o'qituvchi", "Asosiy hisobotlar", "Email qo'llab-quvvatlash"] },
  { name: 'Pro', desc: "Eng mashhur tanlov", features: ["500 gacha talaba", "Cheksiz o'qituvchilar", "To'lov integratsiyasi", "SMS xizmati", "AI yordamchi"], featured: true },
  { name: 'Korxona', desc: "Yirik tarmoqlar uchun", features: ["Cheksiz talabalar", "Bir nechta filial", "Maxsus integratsiya", "Shaxsiy menedjer", "SLA kafolati"] },
];

const faqs = [
  { q: "Demo bepulmi?", a: "Ha, demo to'liq bepul va ro'yxatdan o'tishsiz ishlaydi. Faqat 'Demo' tugmasini bosing." },
  { q: "Ma'lumotlarim qayerda saqlanadi?", a: "Sizning ma'lumotlaringiz O'zbekistondagi xavfsiz serverlarda shifrlangan holda saqlanadi." },
  { q: "Telefon ilovasi bormi?", a: "Ha, talabalar va o'qituvchilar uchun Android ilovasi mavjud. iOS versiyasi yaqin orada." },
  { q: "Hisob ochilgandan keyin yordam beriladimi?", a: "Albatta — har bir mijozga 30 kunlik bepul onboarding va doimiy texnik yordam." },
];

export function Landing() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -50]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.6]);

  const demoEnabled = isDemoModeAvailable();

  const launchDemo = (role: DemoRole) => {
    if (!demoEnabled) {
      // Demo disabled in production builds — route prospects to the contact
      // form instead so we don't drop them on a dead button.
      window.location.hash = '#contact';
      return;
    }
    if (role === 'STUDENT') {
      // Students use the ScholarQuest mobile app — show it inside a phone frame.
      window.location.href = '/student-demo';
      return;
    }
    startDemo(role);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: BRAND }}>
              <GraduationCap className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold">Eduly</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Imkoniyatlar</a>
            <a href="#pricing" className="hover:text-slate-900">Tariflar</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
            <a href="#contact" className="hover:text-slate-900">Aloqa</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:inline"
            >
              Kirish
            </button>
            <button
              onClick={() => launchDemo('ADMIN')}
              className="rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: BRAND }}
            >
              {demoEnabled ? (
                <>
                  <span className="hidden sm:inline">Demoni sinab ko'rish</span>
                  <span className="sm:hidden">Demo</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Bog'lanish</span>
                  <span className="sm:hidden">Aloqa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-50 via-white to-white" />
        <motion.div
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-orange-300/30 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 lg:py-28"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700"
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles size={14} />
                </motion.span>
                AI yordamchi va to'lov integratsiyasi bilan
              </motion.div>
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
              >
                Ta'lim markazingizni{' '}
                <span style={{ color: BRAND }}>bitta platformada</span> boshqaring
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.6 }}
                className="mt-6 text-lg text-slate-600"
              >
                Eduly — talabalar, o'qituvchilar, guruhlar, to'lovlar va davomatni boshqarishning eng tezkor yo'li. O'zbek tilida, ishonchli va arzon.
              </motion.p>
              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-8 flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(236,91,19,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => (demoEnabled ? launchDemo('ADMIN') : (window.location.hash = '#contact'))}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-lg"
                  style={{ backgroundColor: BRAND }}
                >
                  {demoEnabled ? "Demoni ochish" : "Bog'lanish"}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight size={18} />
                  </motion.span>
                </motion.button>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Bog'lanish
                </motion.a>
              </motion.div>
              <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="mt-8 flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> 30 kunlik bepul</div>
                <div className="flex items-center gap-2"><Check size={16} className="text-green-600" /> Karta talab qilinmaydi</div>
              </motion.div>
            </motion.div>
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
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
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Demo CTA — role pickers. Hidden in production builds because the
          demo runtime is stripped (see lib/demoData.ts:DEMO_BUILD_ENABLED). */}
      {demoEnabled && (
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold">Platformani har bir nuqtai nazardan ko'ring</h2>
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
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold sm:text-4xl">Hamma narsa bitta joyda</h2>
          <p className="mt-3 text-slate-600">Ta'lim markazi uchun zarur bo'lgan barcha modullar.</p>
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
                whileHover={{ y: -6, borderColor: '#fdba74' }}
                className="rounded-xl border border-slate-200 p-6"
              >
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100"
                >
                  <Icon size={20} style={{ color: BRAND }} />
                </motion.div>
                <div className="font-semibold">{f.title}</div>
                <div className="mt-1 text-sm text-slate-600">{f.desc}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Sizga mos tarif</h2>
            <p className="mt-3 text-slate-600">Markazingizga mos tarifni tanlang. Narxlar uchun biz bilan bog'laning.</p>
          </div>
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
                className={`rounded-2xl border p-8 ${
                  p.featured
                    ? 'border-orange-300 bg-white shadow-xl ring-2 ring-orange-200'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {p.featured && (
                  <div className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
                    Tavsiya etiladi
                  </div>
                )}
                <div className="text-lg font-bold">{p.name}</div>
                <div className="mt-1 text-sm text-slate-500">{p.desc}</div>
                <div className="mt-4">
                  <span className="text-sm font-medium text-slate-600">Narx haqida ma'lumot uchun biz bilan bog'laning</span>
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
                  className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold ${
                    p.featured
                      ? 'text-white hover:opacity-90'
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
        <div className="grid items-center gap-8 rounded-2xl bg-slate-900 p-10 text-white lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold">Xavfsiz, ishonchli, O'zbek tilida</h3>
            <p className="mt-2 text-slate-300">JWT autentifikatsiya, shifrlangan ma'lumotlar, kunlik backuplar. 99.9% uptime kafolati.</p>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-green-400" />
            <div>
              <div className="text-sm font-semibold">SSL + JWT</div>
              <div className="text-xs text-slate-400">Bank darajasidagi xavfsizlik</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center text-3xl font-bold"
        >
          Tez-tez beriladigan savollar
        </motion.h2>
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
              className="group rounded-lg border border-slate-200 p-4 [&_summary::-webkit-details-marker]:hidden"
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
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 py-16 text-white">
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
          className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl font-bold sm:text-4xl">Bugun boshlang</h2>
          <p className="mt-3 text-orange-50">Demoni oching yoki biz bilan bog'laning — 24 soat ichida javob beramiz.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => launchDemo('ADMIN')}
              className="rounded-lg bg-white px-6 py-3 text-base font-semibold text-orange-600 shadow-lg"
            >
              Demoni ochish
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              href="tel:+998712000000"
              className="rounded-lg border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
            >
              +998 71 200-00-00
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded" style={{ backgroundColor: BRAND }}>
              <GraduationCap className="text-white" size={14} />
            </div>
            <span>© {new Date().getFullYear()} Eduly. Barcha huquqlar himoyalangan.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-900">Maxfiylik</a>
            <a href="#" className="hover:text-slate-900">Shartlar</a>
            <a href="#contact" className="hover:text-slate-900">Aloqa</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
