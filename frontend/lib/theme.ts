export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'job-ingestion-theme';
export const DEFAULT_THEME: Theme = 'dark';

export function getThemeInitScript(): string {
  return `(function(){try{var key='${THEME_STORAGE_KEY}';var stored=localStorage.getItem(key);var theme=stored==='light'||stored==='dark'?stored:'${DEFAULT_THEME}';var root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme;}catch(e){var root=document.documentElement;root.dataset.theme='${DEFAULT_THEME}';root.style.colorScheme='${DEFAULT_THEME}';}})();`;
}

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light';
}
