'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Activity, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password) {
      setValidationError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { success, data, error } = response.data;

      if (success && data) {
        // Save to store and cookies
        loginStore(data.user, data.token);
        toast.success(`Logged in as ${data.user.name}`);
        
        // Push user to appropriate route based on role
        if (data.user.role === 'admin') {
          router.push('/admin/logs');
        } else if (data.user.role === 'officer') {
          router.push('/officer');
        } else if (data.user.role === 'vendor') {
          router.push('/vendor/rfqs');
        } else if (data.user.role === 'manager') {
          window.location.href = '/manager/reports';
        }
      } else {
        setValidationError(error || 'Login failed.');
        toast.error(error || 'Login failed.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Server error. Please verify credentials.';
      setValidationError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSeededLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Activity className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">VendorBridge Sign In</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Access the Procurement ERP Portal
          </p>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 text-xs font-semibold">
            {validationError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Email / Username Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                placeholder="name@vendorbridge.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Secret Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 font-bold py-3 px-4 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure Login</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Signup redirection */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            New vendor candidate?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Register your business
            </button>
          </p>
        </div>

        {/* Seeded Credentials Helper */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center">
            Seeded Test Accounts (Click to Autofill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleSeededLogin('officer@vendorbridge.com', 'officerpassword')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 rounded font-semibold text-[10px] text-left truncate"
            >
              Officer Rep
            </button>
            <button
              onClick={() => handleSeededLogin('manager@vendorbridge.com', 'managerpassword')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 rounded font-semibold text-[10px] text-left truncate"
            >
              Manager Rep
            </button>
            <button
              onClick={() => handleSeededLogin('vendor1@vendorbridge.com', 'vendor1password')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 rounded font-semibold text-[10px] text-left truncate"
            >
              Acme Vendor
            </button>
            <button
              onClick={() => handleSeededLogin('admin@vendorbridge.com', 'adminpassword')}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 rounded font-semibold text-[10px] text-left truncate"
            >
              System Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
