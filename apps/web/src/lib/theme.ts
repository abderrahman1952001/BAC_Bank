export const THEME_STORAGE_KEY = 'bac-bank-theme';
export const THEME_EVENT_NAME = 'bacbank:themechange';

export type ThemeMode = 'light' | 'dark';

export function getThemeInitScript() {
  return `
    (() => {
      try {
        const storageKey = '${THEME_STORAGE_KEY}';
        const storedTheme = window.localStorage.getItem(storageKey);
        const theme = storedTheme === 'dark' || storedTheme === 'light'
          ? storedTheme
          : 'dark';

        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.dataset.theme = 'dark';
        document.documentElement.style.colorScheme = 'dark';
      }
    })();
  `;
}
