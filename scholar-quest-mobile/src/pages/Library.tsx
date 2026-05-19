import { useEffect, useState } from 'react';
import { BookOpen, FileText, Film, Image, File, ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useStudent } from '../context/StudentContext';
import { studentService } from '../services/studentService';
import type { MaterialItem } from '../lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const TYPE_META = {
  pdf:   { label: 'PDF',    color: 'bg-red-100 text-red-600',       Icon: FileText },
  video: { label: 'Video',  color: 'bg-purple-100 text-purple-600', Icon: Film },
  image: { label: 'Rasm',   color: 'bg-blue-100 text-blue-600',     Icon: Image },
  doc:   { label: 'Hujjat', color: 'bg-amber-100 text-amber-600',   Icon: File },
  other: { label: 'Fayl',   color: 'bg-slate-100 text-slate-600',   Icon: File },
} as const;

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

export default function Library() {
  const { profile } = useStudent();
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Unique groups from enrolled profile
  const groups = profile?.group_names ?? [];

  useEffect(() => {
    setLoading(true);
    studentService.materials(activeGroup ?? undefined)
      .then(d => setMaterials(d))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, [activeGroup]);

  // Build group id map from materials (we get group_id + group_name from API)
  const groupTabs = Array.from(
    new Map(materials.map(m => [m.group_id, m.group_name])).entries()
  );

  const displayed = activeGroup !== null
    ? materials.filter(m => m.group_id === activeGroup)
    : materials;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-28"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/learn" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold font-headline">Kutubxona</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Guruh materiallari</p>
        </div>
      </motion.div>

      {/* Group tabs */}
      {!loading && groupTabs.length > 1 && (
        <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveGroup(null)}
            className={cn(
              'shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all',
              activeGroup === null
                ? 'bg-primary text-white shadow'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            Barchasi
          </button>
          {groupTabs.map(([gid, gname]) => (
            <button
              key={gid}
              onClick={() => setActiveGroup(gid)}
              className={cn(
                'shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all',
                activeGroup === gid
                  ? 'bg-primary text-white shadow'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              )}
            >
              {gname}
            </button>
          ))}
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-3xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-20 space-y-3">
          <BookOpen size={48} className="mx-auto text-on-surface-variant/20" />
          <p className="text-on-surface-variant font-medium text-sm">
            {groups.length === 0
              ? 'Guruhga yozilmagansiz'
              : 'Bu guruh uchun material yo\'q'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {displayed.map(m => {
            const meta = TYPE_META[m.file_type] ?? TYPE_META.other;
            const { Icon } = meta;
            return (
              <motion.div key={m.id} variants={itemVariants}>
                <a
                  href={m.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 bg-white rounded-3xl p-4 shadow-sm border border-surface-container hover:shadow-md active:scale-[0.98] transition-all block"
                >
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', meta.color)}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-on-surface truncate">{m.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">{m.group_name}</p>
                    {m.description && (
                      <p className="text-[10px] text-on-surface-variant/60 mt-0.5 line-clamp-1">{m.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', meta.color)}>{meta.label}</span>
                      {m.file_size && <span className="text-[10px] text-on-surface-variant">{formatBytes(m.file_size)}</span>}
                      {m.created_at && <span className="text-[10px] text-on-surface-variant">{formatDate(m.created_at)}</span>}
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-on-surface-variant shrink-0" />
                </a>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
