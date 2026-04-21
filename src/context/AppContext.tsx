import React, { createContext, useContext, useState, useEffect } from 'react';

interface HistoryItem {
  id: string;
  filename: string;
  type: string;
  date: string;
  data: any;
  recommendations?: string[];
}

interface User {
  email: string;
  userId: string;
  token: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  globalLanguage: string;
  setGlobalLanguage: (lang: string) => void;
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ✅ FIX: Load user from localStorage on init
  const [user, setUserState] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });

  // ✅ FIX: globalLanguage now persists to localStorage so page navigation can't reset it
  const [globalLanguage, setGlobalLanguageState] = useState<string>(() => {
    return localStorage.getItem('globalLanguage') || 'English';
  });

  // ✅ FIX: history loaded from localStorage on init
  const [history, setHistoryState] = useState<HistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('studyHistory') || '[]'); }
    catch { return []; }
  });

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  };

  const setGlobalLanguage = (lang: string) => {
    setGlobalLanguageState(lang);
    localStorage.setItem('globalLanguage', lang); // ✅ Persist immediately
  };

  const setHistory = (h: HistoryItem[]) => {
    setHistoryState(h);
    localStorage.setItem('studyHistory', JSON.stringify(h));
  };

  const logout = () => {
    setUser(null);
    setHistoryState([]);
    localStorage.removeItem('user');
    localStorage.removeItem('studyHistory');
    localStorage.removeItem('podcast_script');
    localStorage.removeItem('podcast_notes');
  };

  return (
    <AppContext.Provider value={{ user, setUser, logout, globalLanguage, setGlobalLanguage, history, setHistory }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
