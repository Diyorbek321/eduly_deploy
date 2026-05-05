import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Clock, Star, CheckCircle2, Play, FileText, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const lessonData: any = {
  '1': {
    title: 'Number Systems',
    subject: 'Advanced Algebra',
    duration: '45 mins',
    level: 'Beginner',
    description: 'Explore the fundamental builds of mathematical reality. From integers to complex numbers, understand how we categorize the universe.',
    objectives: [
      'Define rational and irrational numbers',
      'Understand the complex plane',
      'Master prime factorization techniques'
    ],
    resources: [
      { name: 'Number Theory PDF', type: 'DOC' },
      { name: 'Visualizing Infinity', type: 'VIDEO' }
    ]
  },
  '3': {
    title: 'Algebra Basics',
    subject: 'Advanced Algebra',
    duration: '60 mins',
    level: 'Intermediate',
    description: 'Deep dive into variables, expressions, and the syntax of mathematics. Learn to translate word problems into solvable equations.',
    objectives: [
      'Simplify complex expressions',
      'Solve linear equations with two variables',
      'Introduction to functional notation'
    ],
    resources: [
      { name: 'Algebra Fundamentals', type: 'DOC' },
      { name: 'Problem Set #4', type: 'DOC' }
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

export default function LessonDetail() {
  const { id } = useParams();
  const lesson = lessonData[id as string] || lessonData['1'];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-10 pb-32"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link to="/learn/path" className="p-2 hover:bg-surface-container-low rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{lesson.subject}</span>
          <h1 className="text-3xl font-extrabold tracking-tight">{lesson.title}</h1>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <motion.div variants={itemVariants} className="lg:col-span-8 space-y-10">
          {/* Hero Image / Video Placeholder */}
          <div className="aspect-video bg-surface-container-high rounded-4xl overflow-hidden relative group cursor-pointer border border-surface-container">
            <img 
              src={`https://picsum.photos/seed/${lesson.title}/1200/800`} 
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" 
              alt={lesson.title}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center text-white border border-white/30 shadow-2xl group-hover:scale-110 transition-transform">
                <Play fill="currentColor" size={32} className="ml-1" />
              </div>
            </div>
            <div className="absolute bottom-6 left-6 flex gap-2">
              <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-widest shadow-lg">
                <Clock size={12} /> {lesson.duration}
              </div>
            </div>
          </div>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold">About this Lesson</h2>
            <p className="text-on-surface-variant leading-relaxed">
              {lesson.description}
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold">What you'll learn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.objectives.map((obj: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-surface-container-low rounded-2xl border border-surface-container-high/50">
                  <CheckCircle2 size={18} className="text-secondary shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-on-surface-variant prose-sm">{obj}</span>
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-4xl p-8 shadow-sm border border-surface-container space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Lesson Resources</h3>
              <div className="space-y-3">
                {lesson.resources.map((res: any, i: number) => (
                  <button key={i} className="w-full flex items-center justify-between p-4 bg-surface-container-low hover:bg-surface-container-high rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      {res.type === 'VIDEO' ? <Play size={16} className="text-primary" /> : <FileText size={16} className="text-primary" />}
                      <span className="text-sm font-bold">{res.name}</span>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant group-hover:text-primary transition-colors">{res.type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-surface-container-high" />

            <div className="space-y-4">
              <h3 className="text-lg font-bold">Quest Progress</h3>
              <div className="flex items-center justify-between font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                <span>XP Reward</span>
                <span className="text-primary">+250 XP</span>
              </div>
              <div className="flex items-center justify-between font-bold text-xs uppercase tracking-widest text-on-surface-variant">
                <span>Coins</span>
                <span className="text-tertiary">50 coins</span>
              </div>
              <button className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all mt-4">
                Start Lesson
              </button>
            </div>
          </div>

          <div className="bg-tertiary-container/10 border border-tertiary/10 p-6 rounded-4xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-tertiary shadow-sm">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="font-bold text-sm">Need Help?</p>
              <p className="text-xs text-on-surface-variant">Ask the AI Companion about Quadratic Formulas.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
