/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Search, Bell, MessageSquare } from "lucide-react";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar />
      <div className="pl-60">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">Super Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Qidiruv..."
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#ec5b13]/10"
              />
            </div>
            <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>
            <button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
              <MessageSquare className="h-5 w-5" />
            </button>
            <button className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
          </div>
        </header>
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
