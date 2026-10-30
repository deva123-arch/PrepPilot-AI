/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Sun,
  Moon,
  Plus,
  User,
  Users,
  Edit3,
  Brain,
  Calendar,
  Flame,
  MessageSquareCode,
  LineChart,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  LogOut,
  Shield,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'profiles'
  | 'skill-analysis'
  | 'roadmap-7'
  | 'roadmap-30'
  | 'mock-interview'
  | 'analytics'
  | 'velocity';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const {
    theme,
    toggleTheme,
    profiles,
    activeProfile,
    openEditProfileModal,
    openCreateProfileModal,
  } = useApp();
  const { user, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <Compass className="w-4 h-4" /> },
    { id: 'profiles', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'skill-analysis', label: 'Skill Analysis', icon: <Brain className="w-4 h-4" /> },
    { id: 'roadmap-7', label: '7-Day Sprint', icon: <Calendar className="w-4 h-4" /> },
    { id: 'roadmap-30', label: '30-Day Master', icon: <Flame className="w-4 h-4" /> },
    { id: 'mock-interview', label: 'Mock Interview', icon: <MessageSquareCode className="w-4 h-4" /> },
    { id: 'analytics', label: 'Progress Analytics', icon: <LineChart className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    PrepPilot<span className="text-indigo-600 dark:text-indigo-400 font-black">AI</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                    AI-Powered
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                  Placement Prep & Readiness Intelligence
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id || (item.id === 'analytics' && currentTab === 'velocity');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white dark:bg-[#818CF8] dark:text-[#080D1B] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header: Student Account Badge, Edit Profile, Theme Toggle */}
          <div className="flex items-center gap-2">
            {activeProfile ? (
              <div className="flex items-center gap-1.5">
                {/* Active Student Profile Badge */}
                <button
                  onClick={() => onSelectTab('profiles')}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  title="View your student profile details"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                    {activeProfile.name ? activeProfile.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="text-left hidden sm:block max-w-[130px] truncate">
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {activeProfile.name}
                    </span>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {activeProfile.targetRole}
                    </span>
                  </div>
                </button>

                {/* Direct Edit Profile Action */}
                <button
                  onClick={() => openEditProfileModal(activeProfile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Edit your target role, skill baseline, and study pace"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Edit Profile</span>
                </button>
              </div>
            ) : (
              <button
                onClick={openCreateProfileModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
                title="Complete initial student profile setup"
              >
                <User className="w-3.5 h-3.5" />
                <span>Set Up Profile</span>
              </button>
            )}

            {/* Admin Portal Shortcut */}
            {user?.role === 'admin' ? (
              <a
                href="#admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors cursor-pointer"
                title="Open Administrator Portal"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span className="hidden sm:inline">Admin Portal</span>
              </a>
            ) : (
              <a
                href="#admin"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-300 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Open Platform Administrator Login"
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xl:inline">Admin</span>
              </a>
            )}

            {/* Light / Dark Mode Toggle with clear state */}
            <button
              onClick={() => toggleTheme()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer text-xs font-medium"
              title={`Currently in ${theme} mode. Click to switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode.`}
              aria-label={`Toggle theme: Currently ${theme}`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-xs font-semibold">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline text-xs font-semibold">Dark</span>
                </>
              )}
            </button>

            {/* Logout / Sign Out Button */}
            {user && (
              <button
                onClick={logout}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer text-xs font-semibold"
                title={`Sign out of ${user.email}`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id || (item.id === 'analytics' && currentTab === 'velocity');
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white dark:bg-[#818CF8] dark:text-[#080D1B] font-bold shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <a
              href="#admin"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span>{user?.role === 'admin' ? 'Open Administrator Portal' : 'Administrator Portal Login'}</span>
            </a>

            <button
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                Theme: <strong className="capitalize">{theme} Mode</strong>
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {user && (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.email})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
