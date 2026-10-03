'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdminUser, setActiveAdminUser, DEFAULT_ADMIN_USERS } from '@/lib/data-store';
import { BrandLogo } from '@/components/public/logo';
import { Shield, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, UserCheck, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authenticateAdminUser(email, password);
      if (res.success && res.user) {
        router.push('/admin');
        return;
      }
      if (res.error) {
        setError(res.error);
      } else {
        setError('Invalid login credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError('');
  };

  const handleQuickDemoLogin = () => {
    setActiveAdminUser(DEFAULT_ADMIN_USERS[0]);
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Soft Ambient Red Glow */}
      <div className="fixed -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="fixed -bottom-24 right-1/4 w-[400px] h-[250px] bg-amber-400/10 blur-[120px] pointer-events-none rounded-full" />

      <main className="w-full max-w-md z-10 flex flex-col items-center">
        <div className="mb-6">
          <BrandLogo size="lg" showText={true} />
        </div>

        <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white shadow-xl relative">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Admin & Team Portal</h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Sign in with your email, password, and assigned access role.
            </p>
          </div>

          {/* Preset Quick Login Buttons */}
          <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-rose-600" /> Admin Role Preset Credentials
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('ytstreamerscreatives@gmail.com', 'admin123')}
                className="p-2.5 rounded-xl bg-white border border-rose-200 hover:border-rose-400 text-left transition-all text-xs cursor-pointer shadow-2xs group"
              >
                <div className="font-extrabold text-slate-900 group-hover:text-rose-600 flex items-center justify-between">
                  <span>YT Streamers (Super Admin)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold">FULL</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">ytstreamerscreatives@gmail.com</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-600" /> Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 font-medium transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600" /> Password
              </label>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 font-medium transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating Credentials & Role...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In as Authorized User</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 mt-2"
            >
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              <span>Instant Super Admin Access</span>
            </button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} BBQ Warriors. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}

