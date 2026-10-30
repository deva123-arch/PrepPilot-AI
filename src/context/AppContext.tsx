/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  UserProfile,
  SkillGapAnalysis,
  Roadmap7Day,
  Roadmap30Day,
  MockInterviewSession,
  ActivityLog,
  PersonalizedRecommendations,
  ProfileDataStore,
  TaskStatus,
} from '../types';
import {
  loadDataStore,
  saveDataStore,
  getEmptyStore,
  saveProfile as persistProfile,
  deleteProfile as persistDeleteProfile,
  createOrUpdatePrimaryProfile,
  seedDemoProfile,
  selectPrimaryProfile,
  exportProfileData,
  archiveLegacySecondaryProfile,
  saveAnalysis as persistAnalysis,
  saveRoadmap7 as persistRoadmap7,
  saveRoadmap30 as persistRoadmap30,
  setRoadmap7TaskStatus,
  setRoadmap30TaskStatus,
  toggleRoadmap7Task,
  toggleRoadmap30Task,
  updateDailyStudyHours,
  saveInterviewSession,
  deleteInterviewSession as persistDeleteInterview,
  saveRecommendations as persistRecommendations,
  getSavedTheme,
  applyTheme,
  logActivity,
  checkPendingRecovery,
  dismissRecoveryNotice,
  restoreDataStore,
  exportStudentData,
  validateAndParseBackup,
  getPreRestoreBackup,
  revertToPreRestoreBackup,
  BackupValidationResult,
} from '../services/storage';
import { useAuth } from './AuthContext';
import {
  fetchServerStudentData,
  saveServerStudentData,
  migrateLocalDataToServer,
} from '../services/authApi';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: (forced?: 'light' | 'dark') => void;
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  hasPrimaryProfile: boolean;
  switchProfile: (profileId: string) => void;
  selectPrimaryProfile: (profileId: string) => void;
  loadDemoProfile: () => void;
  createProfile: (data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => UserProfile;
  editProfile: (profile: UserProfile) => void;
  deleteProfile: (profileId: string) => void;
  archiveSecondaryProfile: (profileId: string) => void;
  exportProfileBackup: (profileId?: string) => string;
  exportMyData: (profileId?: string) => { json: string; filename: string; profileName: string };
  currentAnalysis: SkillGapAnalysis | null;
  analysisHistory: SkillGapAnalysis[];
  setAnalysis: (analysis: SkillGapAnalysis) => void;
  currentRoadmap7: Roadmap7Day | null;
  setRoadmap7: (roadmap: Roadmap7Day) => void;
  currentRoadmap30: Roadmap30Day | null;
  setRoadmap30: (roadmap: Roadmap30Day) => void;
  interviews: MockInterviewSession[];
  saveInterview: (session: MockInterviewSession) => void;
  deleteInterview: (sessionId: string) => void;
  activities: ActivityLog[];
  recommendations: PersonalizedRecommendations | null;
  setRecommendations: (rec: PersonalizedRecommendations) => void;
  toggleTask7: (day: number) => boolean;
  toggleTask30: (day: number) => boolean;
  setTask7Status: (day: number, status: TaskStatus) => void;
  setTask30Status: (day: number, status: TaskStatus) => void;
  setDailyStudyHours: (hours: number) => void;
  logStudyTime: (minutes: number, topic: string) => void;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  removeToast: (id: string) => void;
  // Modal helpers
  isProfileModalOpen: boolean;
  profileModalMode: 'create' | 'edit';
  profileToEdit: UserProfile | null;
  openCreateProfileModal: () => void;
  openEditProfileModal: (profile?: UserProfile) => void;
  closeProfileModal: () => void;
  // Restore / Recovery helpers
  isRestoreModalOpen: boolean;
  restoreModalReason: string | null;
  openRestoreModal: (reason?: string) => void;
  closeRestoreModal: () => void;
  restoreStore: (targetStore: ProfileDataStore) => boolean;
  validateBackup: (jsonStr: string) => BackupValidationResult;
  revertLastRestore: () => boolean;
  hasPreRestoreBackup: boolean;
  migrateLocalData: () => Promise<boolean>;
  isCloudSynced: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, setIsOnboarded } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getSavedTheme());
  const [store, setStore] = useState(() => loadDataStore());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'create' | 'edit'>('create');
  const [profileToEdit, setProfileToEdit] = useState<UserProfile | null>(null);

  // Restore Modal states
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreModalReason, setRestoreModalReason] = useState<string | null>(null);

  // Apply theme whenever active theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Synchronize student data from server when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchServerStudentData()
        .then((serverStore) => {
          if (serverStore && Array.isArray(serverStore.profiles)) {
            setStore(serverStore);
            saveDataStore(serverStore);
            setIsCloudSynced(true);
            setIsOnboarded(serverStore.profiles.length > 0 && !!serverStore.activeProfileId);
          }
        })
        .catch((err) => {
          console.warn('Failed to load server student data, falling back to local store', err);
        });
    } else if (!isAuthenticated) {
      // Isolate data on sign out: clear memory store so next student has a clean workspace
      const empty = getEmptyStore();
      setStore(empty);
      setIsCloudSynced(false);
    }
  }, [isAuthenticated, user?.id]);

  // Check for pending recovery on initial mount ONLY (never on theme changes)
  useEffect(() => {
    const recovery = checkPendingRecovery();
    if (recovery.needed && recovery.reason) {
      setRestoreModalReason(recovery.reason);
      setIsRestoreModalOpen(true);
    }
  }, []);

  const toggleTheme = (forced?: 'light' | 'dark' | unknown) => {
    const validForced = forced === 'light' || forced === 'dark' ? forced : undefined;
    const next = validForced || (theme === 'dark' ? 'light' : 'dark');
    setTheme(next);
    applyTheme(next);
  };

  const persistAndSync = (newStore: ProfileDataStore) => {
    setStore(newStore);
    if (isAuthenticated) {
      saveServerStudentData(newStore).catch((err) => {
        console.warn('Could not sync student data to server', err);
      });
    }
  };

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const activeProfile = useMemo(() => {
    if (!store.activeProfileId) return store.profiles[0] || null;
    return store.profiles.find((p) => p.id === store.activeProfileId) || store.profiles[0] || null;
  }, [store.activeProfileId, store.profiles]);

  const currentAnalysis = useMemo(() => {
    if (!activeProfile) return null;
    return store.analyses[activeProfile.id] || null;
  }, [activeProfile, store.analyses]);

  const analysisHistory = useMemo(() => {
    if (!activeProfile) return [];
    const list = store.analysisHistory?.[activeProfile.id];
    if (Array.isArray(list) && list.length > 0) return list;
    const single = store.analyses[activeProfile.id];
    return single ? [single] : [];
  }, [activeProfile, store.analysisHistory, store.analyses]);

  const currentRoadmap7 = useMemo(() => {
    if (!activeProfile) return null;
    return store.roadmaps7[activeProfile.id] || null;
  }, [activeProfile, store.roadmaps7]);

  const currentRoadmap30 = useMemo(() => {
    if (!activeProfile) return null;
    return store.roadmaps30[activeProfile.id] || null;
  }, [activeProfile, store.roadmaps30]);

  const interviews = useMemo(() => {
    if (!activeProfile) return [];
    return store.interviews[activeProfile.id] || [];
  }, [activeProfile, store.interviews]);

  const activities = useMemo(() => {
    if (!activeProfile) return [];
    return store.activities[activeProfile.id] || [];
  }, [activeProfile, store.activities]);

  const recommendations = useMemo(() => {
    if (!activeProfile) return null;
    return store.recommendations[activeProfile.id] || null;
  }, [activeProfile, store.recommendations]);

  const switchProfile = (profileId: string) => {
    const updated = { ...store, activeProfileId: profileId };
    saveDataStore(updated);
    setStore(updated);
    const target = updated.profiles.find((p) => p.id === profileId);
    if (target) {
      addToast('info', 'Profile Switched', `Active candidate profile set to ${target.name}.`);
    }
  };

  const handleSelectPrimaryProfile = (profileId: string) => {
    const updatedStore = selectPrimaryProfile(profileId);
    setStore(updatedStore);
    const target = updatedStore.profiles.find((p) => p.id === profileId);
    addToast('success', 'Primary Profile Selected', `Active primary profile set to ${target?.name || profileId}.`);
  };

  const loadDemo = () => {
    const demoStore = seedDemoProfile();
    setStore(demoStore);
    addToast('success', 'Demo Profile Loaded', 'Loaded starter profile (Aarav Sharma - Frontend Track).');
  };

  const createProfile = (data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const isUpdate = !!activeProfile;
    const { store: updatedStore, profile } = createOrUpdatePrimaryProfile(data);
    persistAndSync(updatedStore);
    if (isUpdate) {
      addToast('info', 'Profile Updated in Place', `Existing student profile for "${profile.name}" updated without creating duplicate.`);
    } else {
      addToast('success', 'Student Profile Initialized', `Welcome, ${profile.name}! Your placement prep workspace is ready.`);
    }
    return profile;
  };

  const editProfile = (profile: UserProfile) => {
    const updatedStore = persistProfile(profile);
    persistAndSync(updatedStore);
    addToast('success', 'Profile Updated', `Updated settings for "${profile.name}".`);
  };

  const archiveSecondaryProfile = (profileId: string) => {
    const target = store.profiles.find((p) => p.id === profileId);
    const updatedStore = archiveLegacySecondaryProfile(profileId);
    persistAndSync(updatedStore);
    addToast('info', 'Legacy Profile Archived', `Legacy candidate track "${target?.name || profileId}" safely removed.`);
  };

  const exportProfileBackup = (profileId?: string): string => {
    const targetId = profileId || activeProfile?.id || (store.profiles[0]?.id ?? '');
    if (!targetId) return JSON.stringify(store, null, 2);
    return exportProfileData(targetId);
  };

  const exportMyData = (profileId?: string): { json: string; filename: string; profileName: string } => {
    return exportStudentData(profileId);
  };

  const validateBackup = (jsonStr: string): BackupValidationResult => {
    return validateAndParseBackup(jsonStr);
  };

  const revertLastRestore = (): boolean => {
    const success = revertToPreRestoreBackup();
    if (success) {
      const restored = loadDataStore();
      persistAndSync(restored);
      addToast('success', 'Session Reverted', 'Successfully restored your previous session from before the last restore.');
    } else {
      addToast('error', 'Revert Failed', 'No prior pre-restore session recorded.');
    }
    return success;
  };

  const deleteProfile = (profileId: string) => {
    const target = store.profiles.find((p) => p.id === profileId);
    const updatedStore = persistDeleteProfile(profileId);
    persistAndSync(updatedStore);
    addToast('info', 'Profile Deleted', `Profile "${target?.name || profileId}" has been removed.`);
  };

  const setAnalysis = (analysis: SkillGapAnalysis) => {
    const updatedStore = persistAnalysis(analysis);
    persistAndSync(updatedStore);
    addToast('success', 'Analysis Saved', 'Skill-gap analysis saved to active profile.');
  };

  const setRoadmap7 = (roadmap: Roadmap7Day) => {
    const updatedStore = persistRoadmap7(roadmap);
    persistAndSync(updatedStore);
    addToast('success', '7-Day Roadmap Ready', 'Personalized sprint plan saved.');
  };

  const setRoadmap30 = (roadmap: Roadmap30Day) => {
    const updatedStore = persistRoadmap30(roadmap);
    persistAndSync(updatedStore);
    addToast('success', '30-Day Master Ready', 'Comprehensive 4-phase curriculum saved.');
  };

  const toggleTask7 = (day: number) => {
    if (!activeProfile) return false;
    const { store: updatedStore, completed } = toggleRoadmap7Task(activeProfile.id, day);
    persistAndSync(updatedStore);
    addToast(
      completed ? 'success' : 'info',
      completed ? 'Task Completed' : 'Task Unchecked',
      `Day ${day} task updated.`
    );
    return completed;
  };

  const toggleTask30 = (day: number) => {
    if (!activeProfile) return false;
    const { store: updatedStore, completed } = toggleRoadmap30Task(activeProfile.id, day);
    persistAndSync(updatedStore);
    addToast(
      completed ? 'success' : 'info',
      completed ? 'Task Completed' : 'Task Unchecked',
      `Day ${day} milestone updated.`
    );
    return completed;
  };

  const setTask7Status = (day: number, status: TaskStatus) => {
    if (!activeProfile) return;
    const { store: updatedStore } = setRoadmap7TaskStatus(activeProfile.id, day, status);
    persistAndSync(updatedStore);
    const label = status === 'completed' ? 'Completed' : status === 'skipped' ? 'Skipped' : 'Incomplete';
    addToast(
      status === 'completed' ? 'success' : 'info',
      `Day ${day} ${label}`,
      `Task status updated to ${label.toLowerCase()}.`
    );
  };

  const setTask30Status = (day: number, status: TaskStatus) => {
    if (!activeProfile) return;
    const { store: updatedStore } = setRoadmap30TaskStatus(activeProfile.id, day, status);
    persistAndSync(updatedStore);
    const label = status === 'completed' ? 'Completed' : status === 'skipped' ? 'Skipped' : 'Incomplete';
    addToast(
      status === 'completed' ? 'success' : 'info',
      `Day ${day} ${label}`,
      `Milestone status updated to ${label.toLowerCase()}.`
    );
  };

  const setDailyStudyHours = (hours: number) => {
    if (!activeProfile) return;
    const updatedStore = updateDailyStudyHours(activeProfile.id, hours);
    persistAndSync(updatedStore);
    addToast(
      'success',
      'Study Velocity Updated',
      `Daily preparation set to ${hours} hour${hours === 1 ? '' : 's'}/day.`
    );
  };

  const saveInterview = (session: MockInterviewSession) => {
    const updatedStore = saveInterviewSession(session);
    persistAndSync(updatedStore);
  };

  const deleteInterview = (sessionId: string) => {
    if (!activeProfile) return;
    const updatedStore = persistDeleteInterview(activeProfile.id, sessionId);
    persistAndSync(updatedStore);
    addToast('info', 'Session Removed', 'Mock interview session removed from history.');
  };

  const setRecommendations = (rec: PersonalizedRecommendations) => {
    const updatedStore = persistRecommendations(rec);
    persistAndSync(updatedStore);
  };

  const logStudyTime = (minutes: number, topic: string) => {
    if (!activeProfile) return;
    logActivity(activeProfile.id, {
      date: new Date().toISOString().split('T')[0],
      type: 'study_log',
      durationMinutes: minutes,
      title: topic,
    });
    const loaded = loadDataStore();
    persistAndSync(loaded);
    addToast('success', 'Study Time Logged', `Logged ${minutes} minutes for "${topic}".`);
  };

  const openCreateProfileModal = () => {
    if (activeProfile) {
      // Single profile architecture: if profile already exists, edit it instead of creating duplicates
      setProfileModalMode('edit');
      setProfileToEdit(activeProfile);
      setIsProfileModalOpen(true);
      return;
    }
    setProfileModalMode('create');
    setProfileToEdit(null);
    setIsProfileModalOpen(true);
  };

  const openEditProfileModal = (profile?: UserProfile) => {
    setProfileModalMode('edit');
    setProfileToEdit(profile || activeProfile);
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileToEdit(null);
  };

  const openRestoreModal = (reason?: string) => {
    setRestoreModalReason(reason || null);
    setIsRestoreModalOpen(true);
  };

  const closeRestoreModal = () => {
    setIsRestoreModalOpen(false);
    setRestoreModalReason(null);
    dismissRecoveryNotice();
  };

  const restoreStore = (targetStore: ProfileDataStore): boolean => {
    const success = restoreDataStore(targetStore, true);
    if (success) {
      setStore(loadDataStore());
      dismissRecoveryNotice();
    }
    return success;
  };

  const migrateLocalData = async (): Promise<boolean> => {
    try {
      const localStore = loadDataStore();
      if (!localStore || !Array.isArray(localStore.profiles) || localStore.profiles.length === 0) {
        addToast('info', 'No Local Profiles Found', 'No local student profiles found in this browser to migrate.');
        return false;
      }
      const res = await migrateLocalDataToServer(localStore);
      setStore(res.data);
      saveDataStore(res.data);
      setIsOnboarded(true);
      addToast('success', 'Local Data Migrated', res.message);
      return true;
    } catch (err: any) {
      addToast('error', 'Migration Failed', err.message || 'Could not migrate local records.');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        profiles: store.profiles,
        activeProfile,
        hasPrimaryProfile: !!activeProfile && store.profiles.length > 0,
        switchProfile,
        selectPrimaryProfile: handleSelectPrimaryProfile,
        loadDemoProfile: loadDemo,
        createProfile,
        editProfile,
        deleteProfile,
        archiveSecondaryProfile,
        exportProfileBackup,
        exportMyData,
        validateBackup,
        revertLastRestore,
        hasPreRestoreBackup: !!getPreRestoreBackup(),
        currentAnalysis,
        analysisHistory,
        setAnalysis,
        currentRoadmap7,
        setRoadmap7,
        currentRoadmap30,
        setRoadmap30,
        interviews,
        saveInterview,
        deleteInterview,
        activities,
        recommendations,
        setRecommendations,
        toggleTask7,
        toggleTask30,
        setTask7Status,
        setTask30Status,
        setDailyStudyHours,
        logStudyTime,
        toasts,
        addToast,
        removeToast,
        isProfileModalOpen,
        profileModalMode,
        profileToEdit,
        openCreateProfileModal,
        openEditProfileModal,
        closeProfileModal,
        isRestoreModalOpen,
        restoreModalReason,
        openRestoreModal,
        closeRestoreModal,
        restoreStore,
        migrateLocalData,
        isCloudSynced,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
