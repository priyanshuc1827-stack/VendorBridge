'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/components/ThemeProvider';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  CheckSquare,
  Receipt,
  BarChart3,
  History,
  Moon,
  Sun,
  LogOut,
  Bridge,
  User,
  Activity
} from 'lucide-react';

interface LinkItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  // Fallback if user is null (middleware should intercept, but we protect here too)
  const userRole = user?.role || 'officer';

  const allLinks: LinkItem[] = [
    {
      name: 'Dashboard',
      href: userRole === 'vendor' ? '/vendor' : userRole === 'admin' ? '/admin/logs' : userRole === 'manager' ? '/manager/reports' : '/officer',
      icon: LayoutDashboard,
      roles: ['admin', 'officer', 'vendor', 'manager'],
    },
    {
      name: 'Vendors Registry',
      href: '/officer/vendors',
      icon: Users,
      roles: ['admin', 'officer', 'manager'],
    },
    {
      name: 'Create RFQ',
      href: '/officer/rfqs/create',
      icon: ClipboardList,
      roles: ['officer', 'admin'],
    },
    {
      name: 'Submit Quotation',
      href: '/vendor/rfqs/RFQ-001',
      icon: FileText,
      roles: ['vendor'],
    },
    {
      name: 'Quotation Matrix',
      href: '/officer/rfqs/RFQ-001/compare',
      icon: BarChart3,
      roles: ['officer', 'manager', 'admin'],
    },
    {
      name: 'Manager Approvals',
      href: '/manager/approvals/APP-001',
      icon: CheckSquare,
      roles: ['manager', 'admin'],
    },
    {
      name: 'Purchase Orders & Invoices',
      href: '/officer/invoices',
      icon: Receipt,
      roles: ['admin', 'officer', 'vendor', 'manager'],
    },
    {
      name: 'Reports & Analytics',
      href: '/manager/reports',
      icon: BarChart3,
      roles: ['officer', 'manager', 'admin'],
    },
    {
      name: 'Activity Logs',
      href: '/admin/logs',
      icon: History,
      roles: ['admin'],
    },
  ];

  // Filter links by role
  const links = allLinks.filter((link) => link.roles.includes(userRole));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-200">
      {/* Sidebar Panel */}
      <aside className="print:hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between h-screen sticky top-0">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800/60">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-800 dark:text-slate-100">
                VendorBridge
              </h1>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Procurement ERP
              </span>
            </div>
          </div>

          {/* User Details */}
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm truncate">{user?.name || 'Loading User...'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-4 space-y-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <button
                  key={link.name}
                  onClick={() => router.push(link.href)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-l-4 border-emerald-600 dark:border-emerald-400 pl-2'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Baseline Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/20 space-y-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            id="theme-toggle"
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
          >
            <div className="flex items-center gap-3">
              {theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4 text-slate-500" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-emerald-400" />
                  <span>Light Mode</span>
                </>
              )}
            </div>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
              {theme}
            </span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="print:hidden h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">
              {pathname.split('/').filter(Boolean).slice(-1)[0] || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Database Sync: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Connected</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
