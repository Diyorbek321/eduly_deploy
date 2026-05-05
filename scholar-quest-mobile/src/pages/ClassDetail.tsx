import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, MapPin, User, Info, Calendar, FileText, Download, Play, Trophy } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const classData: any = {
  '1': {
    title: 'Applied Physics II',
    instructor: 'Dr. Sarah Mitchell',
    room: 'Lab 402',
    time: '08:30 AM - 10:00 AM',
    type: 'LECTURE',
    color: 'primary',
    objective: 'Experimental verification of Maxwell equations. Hands-on laboratory session for electromagnetic wave propagation.',
    agenda: [
      { time: '08:30', activity: 'Introduction to Maxwell Equations' },
      { time: '09:00', activity: 'Lab Experiment Setup' },
      { time: '09:45', activity: 'Data Collection & Synthesis' }
    ],
    materials: [
      { name: 'Lecture Notes #7', size: '2.4 MB' },
      { name: 'Lab Manual Supplement', size: '1.2 MB' }
    ]
  }
};

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
  const classItem = classData[id as string] || classData['1'];

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
                {classItem.type}
              </span>
              <span className="text-on-surface-variant font-bold text-[10px] tracking-widest uppercase">Monday, Oct 23</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{classItem.title}</h1>
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
          {/* Quick Info Bar */}
          <div className="grid grid-cols-3 gap-4">
             <QuickInfo icon={<Clock size={20} />} label="Schedule" value={classItem.time} />
             <QuickInfo icon={<User size={20} />} label="Instructor" value={classItem.instructor} />
             <QuickInfo icon={<MapPin size={20} />} label="Location" value={classItem.room} />
          </div>

          <section className="bg-surface-container-low rounded-4xl p-8 space-y-6">
             <div className="flex items-center gap-3 text-primary">
                <Info size={20} />
                <h2 className="text-lg font-bold">Session Objective</h2>
             </div>
             <p className="text-on-surface-variant leading-relaxed font-medium">
                {classItem.objective}
             </p>
          </section>

          <section className="space-y-6">
             <h2 className="text-2xl font-bold">Today's Agenda</h2>
             <div className="space-y-4">
                {classItem.agenda.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-6 p-6 bg-white rounded-3xl shadow-sm border border-surface-container relative overflow-hidden group">
                     <div className="absolute left-0 top-0 bottom-0 w-1 premium-gradient" />
                     <span className="text-primary font-black font-headline text-lg whitespace-nowrap">{item.time}</span>
                     <p className="font-bold text-on-surface">{item.activity}</p>
                  </div>
                ))}
             </div>
          </section>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-4xl p-8 shadow-sm border border-surface-container space-y-6">
              <h3 className="text-lg font-bold">Recommended Materials</h3>
              <div className="space-y-3">
                 {classItem.materials.map((mat: any, i: number) => (
                   <div key={i} className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between group hover:bg-surface-container-high transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-primary" />
                        <div>
                           <p className="text-sm font-bold">{mat.name}</p>
                           <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{mat.size}</p>
                        </div>
                      </div>
                      <Download size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                   </div>
                 ))}
              </div>
              <button className="w-full premium-gradient text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                 <Play size={18} fill="currentColor" /> Preview Slides
              </button>
           </div>

           <div className="bg-secondary/5 border border-secondary/10 p-8 rounded-4xl space-y-4">
              <div className="flex items-center gap-3 text-secondary">
                 <Trophy size={18} />
                 <h4 className="font-bold">Academic Rewards</h4>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                 Attend this session to earn 150 Mastery Points and a 20% XP bonus for your next mock test.
              </p>
              <div className="pt-2">
                 <div className="h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary w-3/4 rounded-full" />
                 </div>
                 <p className="text-[8px] font-bold text-secondary uppercase tracking-widest mt-2">75% Attendance Streak</p>
              </div>
           </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function QuickInfo({ icon, label, value }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-surface-container">
      <div className="text-primary mb-2 opacity-80">{icon}</div>
      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xs font-bold text-on-surface break-words">{value}</p>
    </div>
  );
}
