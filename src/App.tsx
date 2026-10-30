/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar, NavTab } from './components/Navbar';
import { StorageBanner } from './components/StorageBanner';
import { ToastContainer } from './components/ToastContainer';
import { ProfileModal } from './components/ProfileModal';
import { RestoreModal } from './components/RestoreModal';
import { AuthModal } from './components/AuthModal';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { ProfilesListView } from './components/ProfilesListView';
import { SkillGapView } from './components/SkillGapView';
import { Roadmap7View } from './components/Roadmap7View';
import { Roadmap30View } from './components/Roadmap30View';
import { MockInterviewView } from './components/MockInterviewView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { OnboardingView } from './components/OnboardingView';
import { PrimaryProfileSelectorModal } from './components/PrimaryProfileSelectorModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginView } from './components/admin/AdminLoginView';
import { Compass, Sparkles, ShieldCheck, CloudUpload, Check, Shield } from 'lucide-react';

const AuthenticatedDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const { activeProfile, theme, toggleTheme } = useApp();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Storage & Cloud Sync disclosure banner with backup options */}
      <StorageBanner />

      {/* Main Navbar */}
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeProfile ? (
          <OnboardingView />
        ) : (
          <>
            {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
            {currentTab === 'profiles' && <ProfilesListView />}
            {currentTab === 'skill-analysis' && <SkillGapView />}
            {currentTab === 'roadmap-7' && <Roadmap7View />}
            {currentTab === 'roadmap-30' && <Roadmap30View />}
            {currentTab === 'mock-interview' && <MockInterviewView />}
            {(currentTab === 'analytics' || currentTab === 'velocity') && (
              <AnalyticsDashboard onNavigate={setCurrentTab} />
            )}
          </>
        )}
      </main>

      {/* Primary Profile Consolidation Modal (for legacy multi-profile stores) */}
      <PrimaryProfileSelectorModal />

      {/* Profile Creation / Edit Modal */}
      <ProfileModal />

      {/* Session Recovery & Restore Modal */}
      <RestoreModal />

      {/* Authentication Modal */}
      <AuthModal />

      {/* Notifications / Toast Feedback */}
      <ToastContainer />

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">PrepPilot AI</span>
            <span>• Placement Preparation & Readiness Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Powered by Gemini AI
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Authenticated {user?.role === 'admin' ? 'Admin' : 'Student'}: {user?.email}
            </span>
            <span>•</span>
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = '#admin';
              }}
              className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold hover:underline"
              title="Access Administrator Portal"
            >
              <Shield className="w-3 h-3" /> Admin Portal
            </a>
            <span>•</span>
            <span>Portfolio Showcase Edition</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoadingSession } = useAuth();
  const { theme, toggleTheme } = useApp();
  const [currentHash, setCurrentHash] = useState(() => (typeof window !== 'undefined' ? window.location.hash : ''));
  const [currentPath, setCurrentPath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : ''));

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentHash(window.location.hash);
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 animate-pulse">
            <Compass className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Checking authenticated session...
          </p>
        </div>
      </div>
    );
  }

  const isAdminRoute =
    currentHash.startsWith('#admin') ||
    currentPath.startsWith('/admin');

  const handleSwitchToStudentView = () => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin')) {
        window.history.pushState({}, '', '/');
      }
      window.location.hash = '';
      setCurrentHash('');
      setCurrentPath('/');
    }
  };

  const handleAdminLoginSuccess = () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '#admin';
      setCurrentHash('#admin');
    }
  };

  if (isAdminRoute) {
    if (isAuthenticated && user?.role === 'admin') {
      return (
        <>
          <AdminDashboard onSwitchToStudentView={handleSwitchToStudentView} />
          <ToastContainer />
        </>
      );
    }

    return (
      <>
        <AdminLoginView
          onBackToStudent={handleSwitchToStudentView}
          onLoginSuccess={handleAdminLoginSuccess}
        />
        <ToastContainer />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingView theme={theme} onToggleTheme={toggleTheme} />
        <AuthModal />
        <ToastContainer />
      </>
    );
  }

  return <AuthenticatedDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
