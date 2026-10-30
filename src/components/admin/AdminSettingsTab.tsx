/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchAdminSettings } from '../../services/authApi';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  FileCode,
  Sparkles,
} from 'lucide-react';

export const AdminSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminSettings()
      .then((res) => setSettings(res.settings))
      .catch((err) => console.warn('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
        Loading system configuration...
      </div>
    );
  }

  const cliExample1 = 'npm run create-admin -- new.admin@preppilot.com SecurePassword123! "Security Director"';
  const cliExample2 = 'npx tsx scripts/create-admin.ts supervisor@preppilot.com AdminSecret2026!';

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Platform Architecture, Policies & Security Governance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified server-side rules governing authentication, session lifecycles, and model routing.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Authentication Configuration */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cryptographic & Session Governance</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Password Hashing Algorithm</span>
              <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">
                Node.js native Scrypt
              </strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Memory-hard, CPU-resistant with 16-byte random salt per user and constant-time (timingSafeEqual) buffer comparison.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Session Management</span>
              <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">
                7 Days Sliding Window Token (Bearer Header / x-session-token)
              </strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Sessions are strictly validated server-side on every request. Immediate global revocation on password reset or account suspension.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Brute-Force & Rate Limiting</span>
              <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">
                5 consecutive failures &rarr; 15-minute IP/account lockout
              </strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Returns standard HTTP 429 Too Many Requests with Retry-After header.
              </p>
            </div>
          </div>
        </div>

        {/* Gemini AI Routing & Resilience */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>AI Model Routing & Circuit Breakers</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Primary Synthesis Model</span>
              <strong className="text-indigo-600 dark:text-indigo-400 block mt-0.5">
                gemini-3.1-flash-lite
              </strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Optimized for low-latency placement curriculum generation and rapid rubric evaluations.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Resilient Fallback Hierarchy</span>
              <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border">3.1-flash-lite</span>
                <span>&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border">flash-lite-latest</span>
                <span>&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border">flash-latest</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Instant automatic failover if any model encounters 429 Quota or 503 Capacity limits with 10-minute circuit breaker cooldown.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block">Client Rate Limit</span>
              <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">
                30 requests / minute per IP
              </strong>
              <p className="text-[11px] text-slate-500 mt-1">
                Sliding window rate limiter protecting upstream Gemini quotas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CLI Administration Documentation */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <Terminal className="w-4 h-4 text-slate-500" />
          <span>Server-Side Administrator Tooling (CLI)</span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          In compliance with security best practices, public registration forms cannot create administrators. To create or promote an administrator account, run the server CLI tool:
        </p>

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 flex items-center justify-between">
            <span className="truncate">{cliExample1}</span>
            <button
              onClick={() => copyToClipboard(cliExample1, 'cmd1')}
              className="ml-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Copy to clipboard"
            >
              {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 flex items-center justify-between">
            <span className="truncate">{cliExample2}</span>
            <button
              onClick={() => copyToClipboard(cliExample2, 'cmd2')}
              className="ml-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Copy to clipboard"
            >
              {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
