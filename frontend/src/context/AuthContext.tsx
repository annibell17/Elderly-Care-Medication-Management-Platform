import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { translations } from '../utils/translations';

export type UserRole = 'elderly' | 'caretaker' | 'family_member';
export type FontSizeScale = 'normal' | 'large' | 'xlarge';
export type Language = 'en' | 'hi';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  language_pref: string;
}

interface AuthContextType {
  user: User | null;
  elderlyProfileId: string | null;
  currentRole: UserRole;
  loading: boolean;
  language: Language;
  fontSize: FontSizeScale;
  isHighContrast: boolean;
  switchRole: (role: 'elderly' | 'caretaker' | 'family') => Promise<void>;
  setLanguage: (lang: Language) => void;
  setFontSize: (size: FontSizeScale) => void;
  toggleHighContrast: () => void;
  t: (key: string) => string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [elderlyProfileId, setElderlyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('carecircle_lang') as Language) || 'en');
  const [fontSize, setFontSizeState] = useState<FontSizeScale>(() => (localStorage.getItem('carecircle_fontsize') as FontSizeScale) || 'normal');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => localStorage.getItem('carecircle_contrast') === 'true');

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setElderlyProfileId(data.elderly_profile_id);
      if (data.user?.language_pref && (data.user.language_pref === 'en' || data.user.language_pref === 'hi')) {
        setLanguageState(data.user.language_pref);
      }
    } catch (err) {
      console.warn("Could not fetch current user, attempting demo switch:", err);
      // Auto-fallback to Margaret Sharma demo account for seamless local evaluation
      try {
        const demoData = await api.auth.demoSwitch('elderly');
        localStorage.setItem('carecircle_token', demoData.access_token);
        setUser(demoData.user);
        setElderlyProfileId(demoData.elderly_profile_id);
      } catch (e) {
        console.error("Demo login error:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const switchRole = async (targetRole: 'elderly' | 'caretaker' | 'family') => {
    setLoading(true);
    try {
      const res = await api.auth.demoSwitch(targetRole);
      localStorage.setItem('carecircle_token', res.access_token);
      setUser(res.user);
      setElderlyProfileId(res.elderly_profile_id);
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('carecircle_lang', lang);
  };

  const setFontSize = (size: FontSizeScale) => {
    setFontSizeState(size);
    localStorage.setItem('carecircle_fontsize', size);
  };

  const toggleHighContrast = () => {
    setIsHighContrast(prev => {
      const next = !prev;
      localStorage.setItem('carecircle_contrast', String(next));
      return next;
    });
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  const currentRole: UserRole = (user?.role as UserRole) || 'elderly';

  return (
    <AuthContext.Provider
      value={{
        user,
        elderlyProfileId,
        currentRole,
        loading,
        language,
        fontSize,
        isHighContrast,
        switchRole,
        setLanguage,
        setFontSize,
        toggleHighContrast,
        t,
        refreshUser
      }}
    >
      <div className={`min-h-screen ${isHighContrast ? 'high-contrast' : ''} font-scale-${fontSize}`}>
        {children}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
