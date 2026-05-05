import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Bell, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-black text-[#ec5b13]">EduSaaS</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 border-l pl-4 border-gray-200">
          <div className="w-8 h-8 bg-[#ec5b13] text-white rounded-full flex items-center justify-center font-bold">
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <div className="text-sm">
            <p className="font-bold text-gray-900">{user?.name ?? 'Foydalanuvchi'}</p>
            <p className="text-gray-500 text-xs">{user?.role}</p>
          </div>
          <button 
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
