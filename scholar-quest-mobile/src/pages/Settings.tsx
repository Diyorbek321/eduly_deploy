import { Palette, Bell, Shield, Database, Info, LogOut, ChevronRight, Download, Trash2, ArrowLeft, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { useGame } from '../context/GameContext';
import { useLocale, type Locale } from '../context/LocaleContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function Settings() {
  const { theme, setTheme } = useGame();
  const { locale, setLocale, t } = useLocale();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-10 pb-20"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/profile" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('settings.title')}</h1>
          <p className="text-on-surface-variant text-sm">{t('settings.subtitle')}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-8">
        {/* Appearance */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Palette size={20} />
            <h2 className="text-lg font-bold">{t('settings.appearance')}</h2>
          </div>
          <div className="bg-surface-container-low rounded-3xl p-1.5 flex gap-1">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const isActive = theme === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all capitalize',
                    isActive ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                  )}
                >
                  {t(`theme.${mode}`)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Language */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Globe size={20} />
            <h2 className="text-lg font-bold">{t('settings.language')}</h2>
          </div>
          <div className="bg-surface-container-low rounded-3xl p-1.5 flex gap-1">
            {(['uz', 'ru', 'en'] as const).map((l: Locale) => {
              const isActive = locale === l;
              return (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all',
                    isActive ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                  )}
                >
                  {t(`lang.${l}`)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Bell size={20} />
            <h2 className="text-lg font-bold">{t('settings.notifications')}</h2>
          </div>
          <div className="space-y-3">
            <ToggleItem title="Homework Reminders" description="Get alerted before your assignments are due" active />
            <ToggleItem title="Daily Streak Alerts" description="Nudges to keep your momentum alive" active />
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Database size={20} />
            <h2 className="text-lg font-bold">{t('settings.dataMgmt')}</h2>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden border border-surface-container-low">
            <ListItem icon={<Shield size={20} />} title="Backup Data" right={<ChevronRight size={16} />} />
            <div className="h-[1px] bg-surface-container-low mx-5" />
            <ListItem icon={<Trash2 size={20} />} title="Clear Cache" right={<span className="text-xs font-bold text-on-surface-variant">124 MB</span>} />
            <div className="h-[1px] bg-surface-container-low mx-5" />
            <ListItem icon={<Download size={20} />} title="Export JSON" right={<ChevronRight size={16} />} />
          </div>
        </section>

        {/* Information */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Info size={20} />
            <h2 className="text-lg font-bold">{t('settings.information')}</h2>
          </div>
          <div className="bg-white rounded-3xl overflow-hidden border border-surface-container-low">
            <ListItem title="Version" right={<span className="text-xs font-bold text-on-surface-variant">v2.4.0</span>} />
            <div className="h-[1px] bg-surface-container-low mx-5" />
            <ListItem title="Privacy Policy" right={<ChevronRight size={16} />} />
          </div>
        </section>
      </motion.div>

      <motion.button variants={itemVariants} className="w-full py-4 rounded-3xl font-bold text-error bg-error/10 hover:bg-error/20 transition-all active:scale-95 flex items-center justify-center gap-2">
        <LogOut size={20} /> {t('settings.logout')}
      </motion.button>
    </motion.div>
  );
}

function ToggleItem({ title, description, active }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl flex items-center justify-between border border-surface-container-low shadow-sm">
      <div className="space-y-1">
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-on-surface-variant">{description}</p>
      </div>
      <div className={cn('w-12 h-6 rounded-full relative transition-colors cursor-pointer', active ? 'bg-primary' : 'bg-surface-container-highest')}>
        <div className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform', active && 'translate-x-6')} />
      </div>
    </div>
  );
}

function ListItem({ icon, title, right }: any) {
  return (
    <button className="w-full flex items-center justify-between p-5 hover:bg-surface-container-low transition-colors text-left group">
      <div className="flex items-center gap-4">
        {icon && <span className="text-on-surface-variant group-hover:text-primary transition-colors">{icon}</span>}
        <span className="font-bold">{title}</span>
      </div>
      <span className="text-on-surface-variant">{right}</span>
    </button>
  );
}
