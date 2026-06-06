'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Activity, ShieldCheck, UserPlus, LogIn } from 'lucide-react';

export default function IndexPage() {
  const router = useRouter();
  const { role } = useAuthStore();

  React.useEffect(() => {
    if (role === 'manager') {
      window.location.href = '/manager/reports';
      return;
    }
    if (typeof window !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )role=([^;]*)/);
      const cookieRole = match ? decodeURIComponent(match[1]) : null;
      if (cookieRole === 'manager') {
        window.location.href = '/manager/reports';
      }
    }
  }, [role]);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Decorative Mesh Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Visual Splash Container */}
      <div className="relative max-w-2xl text-center px-6 space-y-8 z-10">
        
        {/* Animated ERP Shield badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest animate-pulse mx-auto">
          <ShieldCheck className="h-4 w-4" />
          <span>ColdTrack Procurement Portal</span>
        </div>

        {/* Branding Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Activity className="h-10 w-10" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-4">
            Vendor<span className="text-emerald-400">Bridge</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-emerald-500 font-extrabold">
            Enterprise Procurement ERP
          </p>
        </div>

        {/* Value Proposition Text */}
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
          High-performance relational bidding matrices, automated 18% GST statement ledgers, and secure managerial controls built for modern supply chain logistics.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            id="signin-btn"
            onClick={() => router.push('/login')}
            className="group flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl font-bold text-sm text-slate-100 transition-all hover:scale-[1.02]"
          >
            <LogIn className="h-4 w-4 text-emerald-400" />
            <span>Sign In to Workspace</span>
          </button>

          <button
            id="signup-btn"
            onClick={() => router.push('/signup')}
            className="group flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:scale-[1.02]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Start Now / Onboard Vendor</span>
          </button>
        </div>

        {/* System status logs indicator */}
        <div className="text-[10px] text-slate-500 font-mono pt-8 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Relational Database: CONNECTED</span>
        </div>

      </div>

    </div>
  );
}
