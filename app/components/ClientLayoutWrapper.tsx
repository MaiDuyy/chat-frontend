"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/src/features/chat/modern-sidebar-rail';
import { AuthGuard } from '@/src/components/guards/AuthGuard';
import { AppSidebar } from '@/src/features/navigation';

const noSidebarRoutes = ['/', '/login', '/register', '/auth', '/join', '/invite' , '/setup-password', '/admin'];

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  return (
    <AuthGuard>
      {(() => {
        // Check if current route is in the exclusion list
        const hideSidebar = noSidebarRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

        if (hideSidebar) {
          return <>{children}</>;
        }

        // Dashboard / App UI with Sidebar
        return (
          <div className="flex h-screen w-full overflow-hidden bg-background font-sans relative">
            {/* Grid Line Overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.25] pointer-events-none z-0"></div>

            <Sidebar />
            {/* <AppSidebar/> */}
            <main className="flex-1 overflow-hidden relative flex flex-col z-10">
              {children}
            </main>
          </div>
        );
      })()}
    </AuthGuard>
  );
}
