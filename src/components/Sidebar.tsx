import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSidebar } from '@/src/contexts/SidebarContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  CalendarCheck,
  Wallet,
  BarChart3,
  Settings,
  School,
  CreditCard,
  Calendar,
  Gift,
  LifeBuoy,
  MessageSquare,
  MessageCircle,
  Trophy,
  LogOut,
  FileText,
  User,
  X,
  Building2,
  UserPlus,
  Kanban as KanbanIcon,
  ShieldCheck,
  Globe,
  BarChart2,
  Brain,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { useSettings } from '@/src/contexts/SettingsContext';

// Admin sidebar items
const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "O‘quvchilar", path: "/students" },
  { icon: GraduationCap, label: "O’qituvchilar", path: "/teachers" },
  { icon: Trophy, label: "O’qituvchi reytingi", path: "/teacher-leaderboard" },
  { icon: LifeBuoy, label: "Support O’qituvchilar", path: "/support-teachers" },
  { icon: Layers, label: "Guruhlar", path: "/groups" },
  { icon: BookOpen, label: "Kurslar", path: "/courses" },
  { icon: CalendarCheck, label: "Davomat", path: "/attendance" },
  { icon: Wallet, label: "To‘lovlar", path: "/payments" },
  { icon: Calendar, label: "Jadval", path: "/schedule" },
  { icon: CreditCard, label: "Ish haqi", path: "/salaries" },
  { icon: MessageCircle, label: "Guruh Chatlari", path: "/chat" },
  { icon: MessageSquare, label: "SMS Xabarnoma", path: "/sms" },
  { icon: Gift, label: "Gamifikatsiya", path: "/gamification" },
  { icon: FileText, label: "Kutubxona", path: "/library" },
  { icon: BarChart3, label: "Hisobotlar", path: "/reports" },
  { icon: UserPlus, label: "CRM", path: "/crm" },
  { icon: ShieldCheck, label: "Menejerlar", path: "/branch-managers" },
  { icon: KanbanIcon, label: "Kanban", path: "/kanban" },
  { icon: Building2, label: "Filiallar", path: "/branches" },
  { icon: Globe, label: "Veb-sayt", path: "/website" },
  { icon: BarChart2, label: "So'rovnomalar", path: "/polls" },
  { icon: Brain, label: "Kurs Modullari", path: "/course-modules" },
];

// Teacher sidebar items
const teacherNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/teacher-dashboard" },
  { icon: Calendar, label: "Jadval", path: "/schedule" },
  { icon: CalendarCheck, label: "Davomat", path: "/attendance" },
  { icon: FileText, label: "Uy vazifalari", path: "/homework" },
  { icon: Layers, label: "Guruhlar", path: "/groups" },
  { icon: Users, label: "O‘quvchilar", path: "/students" },
  { icon: MessageCircle, label: "Guruh Chatlari", path: "/chat" },
  { icon: User, label: "Mening profilim", path: "/my-profile" },
];

// Student sidebar items
const studentNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/student-dashboard" },
  { icon: Calendar, label: "Jadval", path: "/schedule" },
  { icon: Layers, label: "Guruhlar", path: "/groups" },
  { icon: BookOpen, label: "Kurslar", path: "/courses" },
  { icon: Wallet, label: "To‘lovlar", path: "/payments" },
  { icon: MessageCircle, label: "Guruh Chatlari", path: "/chat" },
  { icon: Gift, label: "Gamifikatsiya", path: "/gamification" },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { center } = useSettings();
  const { mobileOpen, close } = useSidebar();
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [mobileOpen]);

  const filteredNavItems =
    user?.role === 'TEACHER'
      ? teacherNavItems
      : user?.role === 'STUDENT'
      ? studentNavItems
      : adminNavItems;

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-[#ec5b13] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 overflow-hidden">
          {center?.logo ? (
            <img src={center.logo} alt="logo" className="w-full h-full object-cover" />
          ) : (
            <School size={24} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 leading-none truncate max-w-[150px]">
            {center?.name || 'Eduly'}
          </h1>
          <p className="text-xs text-slate-500">Management</p>
        </div>
        <button
          type="button"
          onClick={close}
          className="ml-auto lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Yopish"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              isActive
                ? "bg-orange-50 text-[#ec5b13] font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={cn(isActive ? "text-[#ec5b13]" : "text-slate-400")} />
                <span className="text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
            isActive
              ? "bg-orange-50 text-[#ec5b13] font-bold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Settings size={20} className="text-slate-400" />
          <span className="text-sm font-medium">Sozlamalar</span>
        </NavLink>

        <div className="mt-4 p-2 bg-slate-50 rounded-xl flex items-center gap-3 relative group">
          <div className="size-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-500 font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{user?.name || user?.email || 'Foydalanuvchi'}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role || 'Mehmon'}</p>
          </div>
          <button
            onClick={logout}
            className="absolute right-2 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg lg:opacity-0 lg:group-hover:opacity-100 transition-all"
            title="Chiqish"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-slate-200 z-50 flex flex-col transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white hidden lg:flex flex-col">
        {sidebarContent}
      </aside>
    </>
  );
};
