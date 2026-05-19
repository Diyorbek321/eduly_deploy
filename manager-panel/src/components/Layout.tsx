import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, Trophy,
  LifeBuoy, Layers, BookOpen, CalendarCheck,
  Wallet, CreditCard, Calendar, MessageSquare,
  FileText, BarChart3, UserPlus,
  Building2, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',            path: '/' },
  { icon: Users,           label: "O'quvchilar",          path: '/students' },
  { icon: GraduationCap,  label: "O'qituvchilar",         path: '/teachers' },
  { icon: Trophy,          label: 'O\'qituvchi reytingi', path: '/teachers/leaderboard' },
  { icon: LifeBuoy,        label: 'Yordamchi o\'qit.',    path: '/support-teachers' },
  { icon: Layers,          label: 'Guruhlar',             path: '/groups' },
  { icon: BookOpen,        label: 'Kurslar',              path: '/courses' },
  { icon: CalendarCheck,   label: 'Davomat',              path: '/attendance' },
  { icon: Wallet,          label: "To'lovlar",            path: '/payments' },
  { icon: CreditCard,      label: 'Maoshlar',             path: '/salaries' },
  { icon: Calendar,        label: 'Jadval',               path: '/schedule' },
  { icon: MessageSquare,   label: 'SMS',                  path: '/sms' },
  { icon: FileText,        label: 'Kutubxona',            path: '/library' },
  { icon: BarChart3,       label: 'Hisobotlar',           path: '/reports' },
  { icon: UserPlus,        label: 'CRM Pipeline',         path: '/crm' },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.name || user?.email || 'M').charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="size-9 rounded-xl bg-[#ec5b13] flex items-center justify-center flex-shrink-0">
          <Building2 size={18} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-black text-sm truncate">Eduly Manager</p>
          <p className="text-slate-500 text-xs truncate">{user?.email}</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="ml-auto p-1 text-slate-500 hover:text-white flex-shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-[#ec5b13] text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={16} className="flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5">
          <div className="size-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-[#ec5b13] font-black text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">{user?.name || 'Manager'}</p>
            <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} className="p-1 text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex-shrink-0">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button type="button" onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-slate-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[#ec5b13] flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-black text-slate-900 text-sm">Eduly Manager</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
