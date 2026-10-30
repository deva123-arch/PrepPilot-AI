/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle, Eye, EyeOff, KeyRound, Sparkles, ShieldCheck, ShieldAlert, LogOut } from 'lucide-react';

interface AdminLoginViewProps {
  onBackToStudent: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onBackToStudent, onLoginSuccess }) => {
  const { adminLogin, user: currentUser, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter both administrator email and password.');
      }
      await adminLogin(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Administrator authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Shield Icon Branding */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 text-white shadow-xl shadow-indigo-500/25 mb-4">
          <Shield className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          PrepPilot<span className="text-indigo-400">AI</span> Admin Portal
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Placement Operations, Platform Analytics & Student Governance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-700">
          {/* Active Student Session Notice */}
          {currentUser && currentUser.role === 'student' && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-100">Active Student Account Detected</p>
                  <p className="mt-0.5 text-amber-200/90 leading-relaxed text-[11px]">
                    You are signed in as student <strong>{currentUser.email}</strong>. Administrator privileges are required to access institutional records.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-amber-800/40">
                <button
                  type="button"
                  onClick={onBackToStudent}
                  className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800/60 text-amber-100 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold text-rose-200">Authentication Failed</p>
                <p className="mt-0.5 text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@preppilot.ai"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <KeyRound className="w-4 h-4 animate-spin" />
                    <span>Verifying Authority...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Authenticate as Administrator</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Secure Provisioning Guide */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Secure Administrator Provisioning</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Administrator accounts are strictly verified on the server. Public student registration cannot grant the administrator role.
              </p>
              <div className="pt-1 space-y-1 text-slate-400">
                <p>
                  • Provision or promote an administrator via server CLI:
                </p>
                <code className="block bg-slate-950 px-2.5 py-1.5 rounded-lg text-indigo-300 font-mono text-[10px] border border-slate-800">
                  npm run create-admin &lt;email&gt; &lt;password&gt; [name]
                </code>
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Initial platform admin bootstrap is controlled via <code className="text-slate-400 font-mono">INITIAL_ADMIN_EMAIL</code> and <code className="text-slate-400 font-mono">INITIAL_ADMIN_PASSWORD</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Return to Student Landing / Dashboard */}
          <div className="mt-6 text-center">
            <button
              onClick={onBackToStudent}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Platform</span>
            </button>
          </div>
        </div>

        {/* Security & Audit notice */}
        <p className="mt-4 text-center text-[10px] text-slate-500">
          All administrative sessions and privileged operations are cryptographically verified and recorded in the audit ledger.
        </p>
      </div>
    </div>
  );
};
