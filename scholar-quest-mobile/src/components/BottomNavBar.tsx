import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, GraduationCap, Store, User, Trophy } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dash', path: '/' },
  { icon: Trophy, label: 'Rank', path: '/leaderboard' },
  { icon: Calendar, label: 'Schedule', path: '/schedule' },
  { icon: GraduationCap, label: 'Learn', path: '/learn' },
  { icon: Store, label: 'Shop', path: '/shop' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function BottomNavBar() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-6 pt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_-12px_32px_rgba(70,71,211,0.08)] rounded-t-3xl border-t border-surface-container-high/50">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center px-3 py-2 transition-all active:scale-95",
              isActive 
                ? "bg-primary/10 text-primary rounded-2xl scale-105" 
                : "text-on-surface-variant hover:text-primary"
            )
          }
        >
          <item.icon size={24} />
          <span className="font-headline text-[10px] uppercase tracking-wider font-bold mt-1">
            {item.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
