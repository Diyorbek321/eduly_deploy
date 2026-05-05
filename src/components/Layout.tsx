import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AIChatWidget } from './AIChatWidget';
import { DemoBanner } from './DemoBanner';
import { SidebarProvider } from '@/src/contexts/SidebarContext';

export const Layout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#f8f6f6] text-slate-900 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DemoBanner />
          <Outlet />
        </div>
        <AIChatWidget />
      </div>
    </SidebarProvider>
  );
};
