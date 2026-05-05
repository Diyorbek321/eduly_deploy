import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Users, BookOpen, Shield, Clock, MapPin } from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function CircleDetail() {
  const { id } = useParams();
  const { schedule } = useStudent();
  const { user } = useAuth();
  const { t } = useLocale();

  const items = schedule?.items ?? [];

  // Strict isolation: only show a circle if it belongs to the authenticated student.
  const item = items.find(i =>
    String(i.group_id) === String(id) ||
    String(i.group_name).toLowerCase().replace(/\s+/g, '-') === String(id) ||
    String(i.course_name).toLowerCase().replace(/\s+/g, '-') === String(id)
  );

  if (!user || user.role !== 'STUDENT' || !item) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto py-20 text-center space-y-6"
      >
        <div className="mx-auto w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
          <Shield size={28} />
        </div>
        <h2 className="text-2xl font-bold">{t('circles.empty')}</h2>
        <Link to="/profile" className="inline-flex items-center gap-2 text-primary font-bold">
          <ArrowLeft size={18} /> {t('common.viewAll')}
        </Link>
      </motion.div>
    );
  }

  const title = item.course_name || item.group_name;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-10 pb-32"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/profile" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2 text-on-surface-variant font-bold text-xs uppercase tracking-widest mt-1">
            <Users size={14} />
            <span>{item.group_name}</span>
            <span className="text-secondary mx-1">•</span>
            <span>{t('circles.teacher')}: {item.teacher_name}</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 bg-white rounded-4xl p-8 border border-surface-container shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <BookOpen size={20} />
            <h2 className="text-xl font-bold">{t('circles.subjects')}</h2>
          </div>
          <div className="space-y-3 text-sm">
            <Row label="Course" value={item.course_name || '—'} />
            <Row label="Group" value={item.group_name} />
            <Row label="Status" value={item.status} />
            <Row label="Enrolled" value={new Date(item.enrolled_at).toLocaleDateString()} />
          </div>
          <div className="flex flex-wrap gap-4 pt-4 text-sm text-on-surface-variant border-t border-surface-container">
            <div className="flex items-center gap-1.5"><Clock size={16} /> <span>{[item.schedule, item.time].filter(Boolean).join(' • ') || '—'}</span></div>
            <div className="flex items-center gap-1.5"><MapPin size={16} /> <span>{item.room ?? '—'}</span></div>
          </div>
        </section>

        <section className="lg:col-span-4 bg-surface-container-low rounded-4xl p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-primary">
            <Users size={20} />
            <h3 className="text-lg font-bold">{t('circles.members')}</h3>
          </div>
          <p className="text-sm text-on-surface-variant">
            {item.group_name}
          </p>
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pt-4 border-t border-surface-container">
            {t('circles.teacher')}
          </div>
          <p className="font-bold">{item.teacher_name}</p>
        </section>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-container last:border-0">
      <span className="text-on-surface-variant text-xs uppercase font-bold tracking-widest">{label}</span>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}
