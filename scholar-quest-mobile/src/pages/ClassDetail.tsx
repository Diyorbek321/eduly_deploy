import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, MapPin, User, Info, Calendar, Trophy } from 'lucide-react';
import { useStudent } from '../context/StudentContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function ClassDetail() {
  const { id } = useParams();
  const { schedule, attendance } = useStudent();

  const groupId = Number(id);
  const item = schedule?.items.find(i => i.group_id === groupId) ?? schedule?.items[0];

  if (!item) {
    return (
      <div className="max-w-4xl mx-auto pb-32 space-y-6">
        <Link to="/schedule" className="inline-flex items-center gap-2 text-on-surface-variant">
          <ArrowLeft size={20} /> Orqaga
        </Link>
        <div className="bg-surface-container-low rounded-3xl p-10 text-center text-on-surface-variant">
          Hozircha sizga biriktirilgan dars topilmadi.
        </div>
      </div>
    );
  }

  const groupAttendance = attendance?.items.filter(a => a.group_id === item.group_id) ?? [];
  const attended = groupAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const totalSessions = groupAttendance.length;
  const attendancePct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-10 pb-32"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/schedule" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-black tracking-widest uppercase">
                {item.status || 'Faol'}
              </span>
              <span className="text-on-surface-variant font-bold text-[10px] tracking-widest uppercase">
                {item.schedule || 'Jadval belgilanmagan'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{item.course_name}</h1>
            <p className="text-sm text-on-surface-variant mt-1">{item.group_name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface-container-high px-6 py-3 rounded-2xl font-bold text-sm hover:bg-surface-container-highest transition-all flex items-center gap-2">
            <Calendar size={18} /> Reschedule
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <motion.div variants={itemVariants} className="lg:col-span-8 space-y-10">
          <div className="grid grid-cols-3 gap-4">
            <QuickInfo icon={<Clock size={20} />} label="Vaqt" value={item.time || item.schedule || '—'} />
            <QuickInfo icon={<User size={20} />} label="O'qituvchi" value={item.teacher_name || '—'} />
            <QuickInfo icon={<MapPin size={20} />} label="Xona" value={item.room || '—'} />
          </div>

          <section className="bg-surface-container-low rounded-4xl p-8 space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Info size={20} />
              <h2 className="text-lg font-bold">Fan haqida</h2>
            </div>
            <p className="text-on-surface-variant leading-relaxed font-medium">
              <strong>{item.course_name}</strong> — {item.group_name} guruhida{' '}
              {item.teacher_name ? <>{item.teacher_name} tomonidan</> : null} olib boriladi.
              {item.schedule ? ` Jadval: ${item.schedule}.` : ''}
              {item.room ? ` Xona: ${item.room}.` : ''}
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Stat label="Davomat" value={`${attendancePct}%`} />
              <Stat label="Qatnashgan" value={`${attended}`} />
              <Stat label="Jami darslar" value={`${totalSessions}`} />
            </div>
          </section>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
          <div className="bg-secondary/5 border border-secondary/10 p-8 rounded-4xl space-y-4">
            <div className="flex items-center gap-3 text-secondary">
              <Trophy size={18} />
              <h4 className="font-bold">Davomat darajasi</h4>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {totalSessions > 0
                ? `Hozirgacha ${totalSessions} ta darsdan ${attended} tasiga qatnashgansiz.`
                : 'Hozircha bu guruhda davomat ma\'lumoti yo\'q.'}
            </p>
            <div className="pt-2">
              <div className="h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${attendancePct}%` }} />
              </div>
              <p className="text-[8px] font-bold text-secondary uppercase tracking-widest mt-2">{attendancePct}% Attendance</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function QuickInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-surface-container">
      <div className="text-primary mb-2 opacity-80">{icon}</div>
      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-bold text-on-surface break-words">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center border border-surface-container">
      <div className="text-2xl font-black font-headline text-primary">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mt-1">{label}</div>
    </div>
  );
}
