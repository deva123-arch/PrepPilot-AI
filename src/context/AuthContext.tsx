/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AuthenticatedUser,
  getAuthToken,
  getStoredUser,
  registerStudent,
  loginStudent,
  loginAdmin,
  logoutStudent,
  fetchCurrentSession,
} from '../services/authApi';

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoadingSession: boolean;
  isOnboarded: boolean;
  setIsOnboarded: (val: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  openAuthModal: (mode?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AuthenticatedUser | null>(() => getStoredUser());
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');

  const refreshSession = async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setToken(null);
      setUser(null);
      setIsOnboarded(false);
      setIsLoadingSession(false);
      return;
    }

    try {
      const sessionData = await fetchCurrentSession();
      if (sessionData && sessionData.user) {
        setToken(currentToken);
        setUser(sessionData.user);
        setIsOnboarded(sessionData.isOnboarded);
      } else {
        setToken(null);
        setUser(null);
        setIsOnboarded(false);
      }
    } catch {
      setToken(null);
      setUser(null);
      setIsOnboarded(false);
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    refreshSession();

    // Check URL route on mount and hashchange for direct #login / #register routing
    const handleRoute = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (hash === '#login' || path === '/login') {
        setAuthModalMode('login');
        setAuthModalOpen(true);
      } else if (hash === '#register' || path === '/register') {
        setAuthModalMode('register');
        setAuthModalOpen(true);
      } else if (hash === '#forgot') {
        setAuthModalMode('forgot');
        setAuthModalOpen(true);
      }
    };

    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginStudent({ email, password });
    setToken(res.token);
    setUser(res.user);
    setAuthModalOpen(false);

    if (res.user.role === 'admin') {
      window.location.hash = '#admin';
    } else {
      if (['#login', '#register', '#forgot', '#reset'].includes(window.location.hash)) {
        window.location.hash = '';
      }
    }
    await refreshSession();
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await loginAdmin({ email, password });
    setToken(res.token);
    setUser(res.user);
    window.location.hash = '#admin';
    await refreshSession();
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await registerStudent({ name, email, password });
    setToken(res.token);
    setUser(res.user);
    setIsOnboarded(false); // New registered student will complete onboarding
    setAuthModalOpen(false);
    if (['#login', '#register'].includes(window.location.hash)) {
      window.location.hash = '';
    }
  };

  const logout = async () => {
    await logoutStudent();
    setToken(null);
    setUser(null);
    setIsOnboarded(false);
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
    if (typeof window !== 'undefined') {
      window.location.hash = `#${mode}`;
    }
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    if (typeof window !== 'undefined' && ['#login', '#register', '#forgot', '#reset'].includes(window.location.hash)) {
      window.location.hash = '';
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAdmin,
        isLoadingSession,
        isOnboarded,
        setIsOnboarded,
        login,
        adminLogin,
        register,
        logout,
        refreshSession,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
