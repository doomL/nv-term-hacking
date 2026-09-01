import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Difficulty } from '@nv-hacking/shared';

interface SettingsContextValue {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [difficulty, setDifficultyState] = useState<Difficulty>(
    () => (localStorage.getItem('difficulty') as Difficulty) || 'novice',
  );
  const [language, setLanguageState] = useState(
    () => localStorage.getItem('language') || 'it',
  );

  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    localStorage.setItem('difficulty', d);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    import('../i18n').then(({ default: i18n }) => i18n.changeLanguage(lang));
  }, []);

  return (
    <SettingsContext.Provider value={{ difficulty, setDifficulty, language, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
