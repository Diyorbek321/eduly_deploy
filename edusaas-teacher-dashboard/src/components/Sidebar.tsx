import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, BookOpen, Calendar, Users, User, BarChart2, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { user } = useAuth();

  const teacherLinks = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/schedule', icon: Calendar, label: 'Jadval' },
    { to: '/homework', icon: BookOpen, label: 'Uy vazifalari' },
    { to: '/analytics', icon: BarChart2, label: 'Analitika' },
    { to: '/leaderboard', icon: Trophy, label: 'Reyting' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/profile', icon: User, label: 'Profil' },
  ];

  const supportLinks = [
    { to: '/support', icon: Users, label: 'Support Dashboard' },
    { to: '/analytics', icon: BarChart2, label: 'Analitika' },
    { to: '/leaderboard', icon: Trophy, label: 'Reyting' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/profile', icon: User, label: 'Profil' },
  ];

  const links = user?.role === 'SUPPORT_TEACHER' ? supportLinks : teacherLinks;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem)] sticky top-16 flex flex-col p-4">
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors",
                isActive 
                  ? "bg-[#ec5b13] text-white" 
                  : "text-gray-600 hover:bg-orange-50 hover:text-[#ec5b13]"
              )
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
