import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, X, Shield, GraduationCap, BookOpen } from 'lucide-react';
import { isDemoMode, getDemoRole, startDemo, exitDemo, DemoRole } from '../lib/demoData';

const roleButtons: { role: DemoRole; label: string; icon: React.ReactNode }[] = [
  { role: 'ADMIN', label: 'Admin', icon: <Shield size={14} /> },
  { role: 'TEACHER', label: 'Teacher', icon: <GraduationCap size={14} /> },
  { role: 'STUDENT', label: 'Student', icon: <BookOpen size={14} /> },
];

export const DemoBanner: React.FC = () => {
  const navigate = useNavigate();

  if (!isDemoMode()) return null;
  const current = getDemoRole();

  const switchRole = (role: DemoRole) => {
    if (role === current) return;
    if (role === 'STUDENT') {
      // Students use the ScholarQuest mobile app — leave the web demo
      // and show it inside a phone frame.
      exitDemo();
      window.location.href = '/student-demo';
      return;
    }
    startDemo(role);
    window.location.href = '/';
  };

  const handleExit = () => {
    exitDemo();
    navigate('/landing');
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-40 bg-[#ec5b13] text-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 text-sm">
        <div className="flex items-center gap-2 font-medium min-w-0">
          <Eye size={16} className="flex-shrink-0" />
          <span className="truncate">Demo rejimi</span>
          <span className="hidden md:inline opacity-80 truncate">— ma'lumotlar soxta, o'zgarishlar saqlanmaydi</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex rounded-md bg-white/15 p-0.5">
            {roleButtons.map((b) => (
              <button
                key={b.role}
                onClick={() => switchRole(b.role)}
                className={`flex items-center gap-1 sm:gap-1.5 rounded px-2 sm:px-3 py-1 text-xs font-medium transition ${
                  current === b.role ? 'bg-white text-[#ec5b13]' : 'text-white hover:bg-white/10'
                }`}
              >
                {b.icon}
                <span className="hidden xs:inline sm:inline">{b.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleExit}
            className="flex items-center gap-1 rounded-md bg-white/15 px-2 sm:px-3 py-1 text-xs font-medium hover:bg-white/25"
          >
            <X size={14} />
            <span className="hidden sm:inline">Chiqish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
