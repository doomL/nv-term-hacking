const STORAGE_KEY = 'language';

export type AppLanguage = 'en' | 'it';

/** Browser locale → app language (Italian only when a primary tag is `it`). */
export function detectBrowserLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const tags =
    navigator.languages?.length > 0 ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const primary = String(tag).split('-')[0]?.toLowerCase();
    if (primary === 'it') return 'it';
  }
  return 'en';
}

/** Saved preference wins; otherwise detect once (nothing written until user changes settings). */
export function getInitialLanguage(): AppLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'it') return stored;
  return detectBrowserLanguage();
}
