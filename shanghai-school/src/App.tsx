import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  MapPin,
  Phone,
  Clock,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Send,
  CheckCircle,
  AlertCircle,
  Star,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Course {
  id: number;
  name: string;
  description: string | null;
  duration: string | null;
  price: string | null;
  icon: string | null;
  color: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  working_hours: string | null;
  lat: number | null;
  lng: number | null;
}

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

// ── Placeholder data (shown when API returns empty) ───────────────────────────

const PLACEHOLDER_COURSES: Course[] = [
  { id: 1, name: 'Ingliz tili', description: "Boshlang'ich darajadan C1 gacha barcha bosqichlar. IELTS tayyorlovi.", duration: '6 oy', price: '800,000 UZS/oy', icon: '🇬🇧', color: '#3b82f6' },
  { id: 2, name: 'Kompyuter savodxonligi', description: 'Microsoft Office, Python dasturlash, veb-dizayn asoslari.', duration: '4 oy', price: '600,000 UZS/oy', icon: '💻', color: '#8b5cf6' },
  { id: 3, name: 'Matematika', description: "Maktab va universitet matematikasi. Olimpiada masalalar tayyorlovi.", duration: '3 oy', price: '500,000 UZS/oy', icon: '📐', color: '#ec5b13' },
];

const PLACEHOLDER_BRANCHES: Branch[] = [
  { id: 1, name: 'Markaziy filial', address: "Toshkent sh., Chilonzor tumani, Bunyodkor ko'chasi 12", phone: '+998 71 123 45 67', working_hours: 'Du-Sha 9:00-19:00', lat: 41.2995, lng: 69.2401 },
  { id: 2, name: 'Yunusobod filiali', address: "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko'chasi 108", phone: '+998 71 234 56 78', working_hours: 'Du-Sha 9:00-19:00', lat: 41.3456, lng: 69.2878 },
];

const PLACEHOLDER_FAQS: FAQ[] = [
  { id: 1, question: "Ro'yxatdan o'tish qanday amalga oshiriladi?", answer: "Bizning veb-saytimiz orqali ariza yuboring yoki bevosita filialga tashrif buyuring. Menejerimiz siz bilan 24 soat ichida bog'lanadi." },
  { id: 2, question: 'Dars jadvali qanday tuzilgan?', answer: "Har bir talabaning qulayligiga qarab, ertalabki (9:00-13:00), kunduzgi (13:00-17:00) va kechki (17:00-21:00) guruhlar mavjud." },
  { id: 3, question: 'Qaysi yosh toifalari uchun kurslar mavjud?', answer: "7 yoshdan kattalar uchun maxsus kurslar mavjud. Bolalar, o'smirlar va kattalar uchun alohida dasturlar ishlab chiqilgan." },
  { id: 4, question: "To'lov qanday usullarda amalga oshiriladi?", answer: "Naqd pul, Click, Payme, bank kartasi orqali to'lov qabul qilinadi. Oylik va choraklik to'lov imkoniyati mavjud." },
  { id: 5, question: "Kurs tugagandan so'ng sertifikat beriladimi?", answer: "Ha, barcha kurslarni muvaffaqiyatli tugatgan talabalar xalqaro standartlarga mos sertifikat olishadi." },
];

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar({ coursesRef, branchesRef, faqRef, registerRef }: {
  coursesRef: React.RefObject<HTMLElement | null>;
  branchesRef: React.RefObject<HTMLElement | null>;
  faqRef: React.RefObject<HTMLElement | null>;
  registerRef: React.RefObject<HTMLElement | null>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  }

  const links = [
    { label: 'Kurslar', ref: coursesRef },
    { label: 'Filiallar', ref: branchesRef },
    { label: 'FAQ', ref: faqRef },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="size-9 bg-[#ec5b13] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Shanghai School</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.ref)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo(registerRef)}
              className="ml-2 px-5 py-2 bg-[#ec5b13] text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200"
            >
              Ro'yxatdan o'tish
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-1">
            {links.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.ref)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => scrollTo(registerRef)}
              className="w-full mt-1 px-4 py-2.5 bg-[#ec5b13] text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Ro'yxatdan o'tish
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ onRegister, onLearnMore }: { onRegister: () => void; onLearnMore: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 size-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 py-32 max-w-4xl mx-auto" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
          <Star size={14} className="fill-current" />
          Toshkentning eng yaxshi ta'lim markazi
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
          Kelajagingizni{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            biz bilan
          </span>{' '}
          quring
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Shanghai School — zamonaviy ta'lim usullari va tajribali o'qituvchilar bilan bilimingizni yangi bosqichga ko'taring.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onRegister}
            className="px-8 py-4 bg-[#ec5b13] text-white font-bold text-base rounded-2xl hover:bg-orange-500 transition-all duration-200 shadow-xl shadow-orange-900/40 hover:shadow-orange-900/60 hover:-translate-y-0.5"
          >
            Ro'yxatdan o'tish
          </button>
          <button
            onClick={onLearnMore}
            className="px-8 py-4 border border-white/30 text-white font-bold text-base rounded-2xl hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
          >
            Batafsil
          </button>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { icon: <Users size={24} className="text-[#ec5b13]" />, value: '1500+', label: "O'quvchilar" },
    { icon: <GraduationCap size={24} className="text-[#ec5b13]" />, value: '50+', label: "O'qituvchilar" },
    { icon: <BookOpen size={24} className="text-[#ec5b13]" />, value: '20+', label: 'Kurslar' },
    { icon: <Award size={24} className="text-[#ec5b13]" />, value: '5', label: 'Yil tajriba' },
  ];

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-4 -mt-8 mb-16">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-2 py-6 px-4 text-center">
            {s.icon}
            <span className="text-2xl font-black text-slate-900">{s.value}</span>
            <span className="text-sm text-slate-500 font-medium">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Courses Section ───────────────────────────────────────────────────────────

function CourseSkeleton() {
  return (
    <div className="border border-slate-100 rounded-2xl p-6 animate-pulse bg-white">
      <div className="size-12 rounded-xl bg-slate-200 mb-4" />
      <div className="h-5 bg-slate-200 rounded-lg mb-2 w-3/4" />
      <div className="h-4 bg-slate-100 rounded mb-1 w-full" />
      <div className="h-4 bg-slate-100 rounded mb-4 w-5/6" />
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-slate-100 rounded-lg" />
        <div className="h-6 w-24 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}

function CoursesSection({ sectionRef, courses, loading }: { sectionRef: React.RefObject<HTMLElement | null>; courses: Course[]; loading: boolean }) {
  const display = courses.length > 0 ? courses : PLACEHOLDER_COURSES;

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-[#ec5b13] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <BookOpen size={14} /> Kurslarimiz
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Siz uchun kurslar</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Har bir talabaning ehtiyojiga mos, zamonaviy o'quv dasturlari bilan qurollangan kurslar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CourseSkeleton key={i} />)
          : display.map((c) => (
              <div
                key={c.id}
                className="group bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className="size-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ backgroundColor: c.color + '20' }}
                >
                  {c.icon || '📚'}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{c.name}</h3>
                {c.description && (
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-3">{c.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-auto">
                  {c.duration && (
                    <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                      <Clock size={11} /> {c.duration}
                    </span>
                  )}
                  {c.price && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-lg font-bold"
                      style={{ backgroundColor: c.color + '15', color: c.color }}
                    >
                      {c.price}
                    </span>
                  )}
                </div>
              </div>
            ))}
      </div>
    </section>
  );
}

// ── Why Us ────────────────────────────────────────────────────────────────────

function WhyUs() {
  const reasons = [
    { icon: <Zap size={24} className="text-yellow-500" />, title: 'Tez natija', desc: "Intensiv dasturlar tufayli 3 oy ichida sezilararli natijaga erishish mumkin." },
    { icon: <Target size={24} className="text-blue-500" />, title: 'Shaxsiy yondashuv', desc: "Har bir talabaning darajasi va maqsadiga qarab individual o'quv rejasi tuziladi." },
    { icon: <TrendingUp size={24} className="text-green-500" />, title: 'Kafolatlangan sifat', desc: "Natijaga erishmagan talabaga pulini qaytarish kafolati beriladi." },
    { icon: <Award size={24} className="text-purple-500" />, title: "Tajribali o'qituvchilar", desc: "5+ yil tajribaga ega, o'z sohasining mutaxassislari dars beradi." },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Nima uchun Shanghai School?</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Biz shunchaki kurs o'tmaymiz — natijaga erishtiramiz.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center hover:shadow-md transition-shadow">
              <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-4">{r.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2">{r.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Branches Section ──────────────────────────────────────────────────────────

function BranchesSection({ sectionRef, branches, loading }: { sectionRef: React.RefObject<HTMLElement | null>; branches: Branch[]; loading: boolean }) {
  const display = branches.length > 0 ? branches : PLACEHOLDER_BRANCHES;

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-[#ec5b13] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
          <MapPin size={14} /> Filiallarimiz
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Sizga qulay filial</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Toshkentning turli hududlarida joylashgan filiallarimizdan biriga tashrif buyuring.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden animate-pulse bg-white">
              <div className="h-48 bg-slate-200" />
              <div className="p-5 space-y-2">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {display.map((b) => (
            <div key={b.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {b.lat != null && b.lng != null ? (
                <iframe
                  title={b.name}
                  src={`https://maps.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed`}
                  width="100%"
                  height="200"
                  className="border-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-48 bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center">
                  <MapPin size={40} className="text-slate-300" />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-bold text-slate-900 text-lg mb-3">{b.name}</h3>
                <div className="space-y-2">
                  <p className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin size={15} className="mt-0.5 flex-shrink-0 text-[#ec5b13]" />
                    {b.address}
                  </p>
                  {b.phone && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} className="flex-shrink-0 text-[#ec5b13]" />
                      <a href={`tel:${b.phone}`} className="hover:text-[#ec5b13] transition-colors">{b.phone}</a>
                    </p>
                  )}
                  {b.working_hours && (
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={15} className="flex-shrink-0 text-[#ec5b13]" />
                      {b.working_hours}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────

function FAQSection({ sectionRef, faqs, loading }: { sectionRef: React.RefObject<HTMLElement | null>; faqs: FAQ[]; loading: boolean }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const display = faqs.length > 0 ? faqs : PLACEHOLDER_FAQS;

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-[#ec5b13] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            Tez-tez so'raladigan savollar
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">FAQ</h2>
          <p className="text-slate-500">Sizda savol bormi? Javoblarni bu yerda toping.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white border border-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {display.map((f) => (
              <div key={f.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === f.id ? null : f.id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm leading-relaxed">{f.question}</span>
                  <span className="flex-shrink-0 text-slate-400">
                    {openId === f.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openId === f.id ? 'max-h-64' : 'max-h-0'}`}
                >
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {f.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Registration Section ──────────────────────────────────────────────────────

function RegistrationSection({ sectionRef, courses }: { sectionRef: React.RefObject<HTMLElement | null>; courses: Course[] }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [courseInterest, setCourseInterest] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          course_interest: courseInterest || null,
          notes: note || null,
        }),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.data?.success)) {
        setStatus('success');
      } else {
        setError("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
        setStatus('error');
      }
    } catch {
      setError("Serverga ulanib bo'lmadi. Internet aloqasini tekshiring.");
      setStatus('error');
    }
  }

  const inputCls = "w-full border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 transition-all";

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} className="py-24 bg-gradient-to-br from-[#ec5b13] via-orange-500 to-red-600 relative overflow-hidden">
      {/* Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 size-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 size-64 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Bugun ro'yxatdan o'ting</h2>
          <p className="text-orange-100 text-lg">Ariza qoldiring — menejerimiz 24 soat ichida siz bilan bog'lanadi</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8">
          {status === 'success' ? (
            <div className="text-center py-6">
              <CheckCircle size={56} className="text-white mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Arizangiz qabul qilindi!</h3>
              <p className="text-orange-100">Tez orada siz bilan bog'lanamiz.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1.5">Ismingiz *</label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Abdullayev Jahongir"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1.5">Telefon raqam *</label>
                <input
                  className={inputCls}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1.5">Qaysi kurs qiziqtiradi?</label>
                <select
                  className={inputCls + ' cursor-pointer'}
                  value={courseInterest}
                  onChange={(e) => setCourseInterest(e.target.value)}
                >
                  <option value="" className="text-slate-800 bg-white">Kurs tanlang</option>
                  {(courses.length > 0 ? courses : PLACEHOLDER_COURSES).map((c) => (
                    <option key={c.id} value={c.name} className="text-slate-800 bg-white">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-100 mb-1.5">Izoh (ixtiyoriy)</label>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Savollaringiz yoki mulohazalaringiz..."
                />
              </div>

              {status === 'error' && (
                <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/30 text-red-100 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !name.trim() || !phone.trim()}
                className="w-full flex items-center justify-center gap-2 bg-white text-[#ec5b13] font-bold py-3.5 rounded-xl hover:bg-orange-50 transition-colors disabled:opacity-60 mt-2 shadow-lg shadow-black/20"
              >
                {status === 'loading' ? (
                  <span className="animate-spin size-5 border-2 border-[#ec5b13] border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Send size={16} />
                    Ariza yuborish
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-9 bg-[#ec5b13] rounded-xl flex items-center justify-center">
                <GraduationCap size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white">Shanghai School</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Zamonaviy ta'lim va professional o'qituvchilar bilan kelajagingizni quring.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
            <p className="text-slate-300 font-semibold mb-1 col-span-2">Aloqa</p>
            <p className="flex items-center gap-2"><Phone size={13} className="text-[#ec5b13]" /> +998 71 123 45 67</p>
            <p className="flex items-center gap-2"><MapPin size={13} className="text-[#ec5b13]" /> Toshkent, O'zbekiston</p>
            <p className="flex items-center gap-2"><Clock size={13} className="text-[#ec5b13]" /> Du-Sha 9:00-19:00</p>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Shanghai School. Barcha huquqlar himoyalangan.
        </div>
      </div>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingFaqs, setLoadingFaqs] = useState(true);

  const coursesRef = useRef<HTMLElement | null>(null);
  const branchesRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);
  const registerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetch('/api/public/courses')
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingCourses(false));

    fetch('/api/public/branches')
      .then((r) => r.json())
      .then((d) => setBranches(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingBranches(false));

    fetch('/api/public/faqs')
      .then((r) => r.json())
      .then((d) => setFaqs(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {})
      .finally(() => setLoadingFaqs(false));
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar
        coursesRef={coursesRef}
        branchesRef={branchesRef}
        faqRef={faqRef}
        registerRef={registerRef}
      />
      <main>
        <Hero
          onRegister={() => registerRef.current?.scrollIntoView({ behavior: 'smooth' })}
          onLearnMore={() => coursesRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
        <StatsBar />
        <CoursesSection sectionRef={coursesRef} courses={courses} loading={loadingCourses} />
        <WhyUs />
        <BranchesSection sectionRef={branchesRef} branches={branches} loading={loadingBranches} />
        <FAQSection sectionRef={faqRef} faqs={faqs} loading={loadingFaqs} />
        <RegistrationSection sectionRef={registerRef} courses={courses} />
      </main>
      <Footer />
    </div>
  );
}
