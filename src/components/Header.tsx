import React, { useEffect, useRef, useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSidebar } from '@/src/contexts/SidebarContext';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  TEACHER: "O'qituvchi",
  STUDENT: "O'quvchi",
};

export const Header = ({ title }: { title?: string }) => {
  const { user, logout } = useAuth();
  const { open: openSidebar } = useSidebar();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();
  const profilePath = user?.role === 'TEACHER' ? '/my-profile' : '/settings';

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center gap-2 sm:gap-3 justify-between sticky top-0 z-30">
      <button
        type="button"
        onClick={openSidebar}
        className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:bg-slate-100"
        aria-label="Menyu"
      >
        <Menu size={22} />
      </button>
      <div className="flex-1 max-w-md min-w-0">
        {title ? (
          <h1 className="text-lg font-black text-slate-900">{title}</h1>
        ) : (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Qidirish..."
              className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-orange-500/20 text-sm transition-all outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl relative transition-colors"
          aria-label="Bildirishnomalar"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white rounded-full"></span>
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="size-8 rounded-lg bg-orange-100 text-[#ec5b13] flex items-center justify-center font-black text-sm">
              {initial}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-bold text-slate-900 truncate max-w-[140px]">
                {user?.name || user?.email || 'Foydalanuvchi'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {user?.role ? ROLE_LABELS[user.role] || user.role : ''}
              </span>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user?.name || 'Foydalanuvchi'}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(profilePath);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <UserIcon size={16} className="text-slate-400" />
                {user?.role === 'TEACHER' ? 'Mening profilim' : 'Sozlamalar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50"
              >
                <LogOut size={16} />
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
