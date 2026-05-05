/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut,
  Users,
  GraduationCap,
  BookOpen,
  Calendar
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const superAdminNav = [
    { name: "Bosh sahifa", href: "/super-admin", icon: LayoutDashboard },
    { name: "O'quv markazlari", href: "/super-admin/centers", icon: Building2 },
    { name: "Statistika", href: "/super-admin/stats", icon: BarChart3 },
    { name: "Sozlamalar", href: "/settings", icon: Settings },
  ];

  const adminNav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "O'quvchilar", href: "/students", icon: Users },
    { name: "O'qituvchilar", href: "/teachers", icon: GraduationCap },
    { name: "Guruhlar", href: "/groups", icon: BookOpen },
    { name: "Dars jadvali", href: "/schedule", icon: Calendar },
    { name: "Sozlamalar", href: "/settings", icon: Settings },
  ];

  const mainNav = user?.role === "SUPER_ADMIN" ? superAdminNav : adminNav;

  return (
    <div className="flex h-screen w-60 flex-col bg-white border-r border-slate-200 fixed left-0 top-0 z-30">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#ec5b13] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm shadow-[#ec5b13]/20">E</div>
        <span className="font-bold text-xl tracking-tight text-slate-800">Eduly</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2">
        {mainNav.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== "/super-admin" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-[#ec5b13] bg-[#ec5b13]/5"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-[#ec5b13]" : "text-slate-400 group-hover:text-slate-600")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 p-2 rounded-xl border border-transparent">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold uppercase ring-2 ring-white shadow-sm">
            {user?.name?.substring(0, 2) || "sa"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </button>
      </div>
    </div>
  );
}
