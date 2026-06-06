'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Activity, ArrowLeft, Building2, Globe, Mail, Phone, Lock, FileText, ArrowRight, UserCheck } from 'lucide-react';

type RegisterRole = 'vendor' | 'officer' | 'manager';

export default function SignupPage() {
  const router = useRouter();

  // Selected registration role
  const [role, setRole] = useState<RegisterRole>('vendor');

  // Input states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Vendor Business Details (conditional)
  const [vendorName, setVendorName] = useState('');
  const [country, setCountry] = useState('United States');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName || !lastName || !email || !phone || !password) {
      setErrorMsg('Please fill out all required personal representative fields.');
      return;
    }

    if (role === 'vendor' && !vendorName) {
      setErrorMsg('Business Name is required for Vendor registrations.');
      return;
    }

    setLoading(true);
    try {
      let vendorId: number | null = null;

      // 1. If Registering as Vendor, create the Vendor Profile first
      if (role === 'vendor') {
        const vendorPayload = {
          name: vendorName,
          category: 'General Supplier',
          gst_number: 'TEMP-' + Math.floor(Math.random() * 900000 + 100000), // mock tax identifier
          email: email,
          phone: phone,
          status: 'active',
          rating: 5.0
        };

        const vendorResponse = await api.post('/vendors', vendorPayload);
        if (!vendorResponse.data?.success) {
          throw new Error(vendorResponse.data?.error || 'Vendor business profile registration failed.');
        }
        vendorId = vendorResponse.data.data.vendorId;
      }

      // 2. Register User Account
      const userPayload = {
        name: `${firstName} ${lastName}`,
        email: email,
        password: password,
        role: role, // 'vendor' | 'officer' | 'manager'
        vendor_id: vendorId // null for officer/manager
      };

      const registerResponse = await api.post('/auth/register', userPayload);
      if (!registerResponse.data?.success) {
        throw new Error(registerResponse.data?.error || 'User credential registration failed.');
      }

      toast.success(`Account successfully registered as ${role.toUpperCase()}!`);
      router.push('/login');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Registration failed.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    'United States', 'India', 'Germany', 'United Kingdom', 'Canada', 
    'Singapore', 'Australia', 'Japan', 'France', 'Netherlands'
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-6 transition-colors duration-200">
      <div className="w-full max-w-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Registration Portal
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Adaptive Registry Sign Up</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify your workspace role, fill out matching inputs, and configure your credentials.
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Signup form */}
        <form onSubmit={handleSignup} className="space-y-6">
          
          {/* Mandatory Role Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span>Register As (Portal Role) *</span>
            </label>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as RegisterRole);
                setErrorMsg('');
              }}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm font-semibold"
            >
              <option value="vendor">Vendor / Supplier representative</option>
              <option value="officer">Procurement Officer coordinator</option>
              <option value="manager">Manager / Approver evaluator</option>
            </select>
          </div>

          {/* Section 1: Business Identity (Only visible for vendor role) */}
          {role === 'vendor' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                1. Business Identity Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Vendor Business Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Acme Hardware Corp"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Country Selector *
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm appearance-none"
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Additional Vendor Information
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    placeholder="Provide manufacturing facilities detail, logistics supply capability, or specific tax scopes..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={2}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Contact Representative Credentials */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {role === 'vendor' ? '2. Representative details' : '1. Representative details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Business Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="rep@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+1-555-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Account Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50 transition-all text-sm"
                  />
                </div>
              </div>
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
                <span>Complete Registration</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
