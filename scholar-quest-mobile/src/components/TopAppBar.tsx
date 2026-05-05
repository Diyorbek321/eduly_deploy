import { Bell } from 'lucide-react';

export default function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 bg-background dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center overflow-hidden border-2 border-primary-container">
          <img 
            alt="User Profile" 
            className="w-full h-full object-cover" 
            src="https://picsum.photos/seed/student/200" 
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-xl font-bold text-primary font-headline tracking-tight">
          The Scholarly Kinetic
        </h1>
      </div>
      <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low text-primary hover:bg-surface-container-high transition-all active:scale-95">
        <Bell size={20} />
      </button>
    </header>
  );
}
