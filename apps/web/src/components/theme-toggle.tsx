'use client';

import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { THEME_EVENT_NAME, THEME_STORAGE_KEY, ThemeMode } from '@/lib/theme';

function getResolvedTheme(): ThemeMode {
  if (typeof document === 'undefined') {
    return 'light';
  }

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: theme }));
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    function syncTheme() {
      setTheme(getResolvedTheme());
    }

    syncTheme();
    window.addEventListener('storage', syncTheme);
    window.addEventListener(THEME_EVENT_NAME, syncTheme as EventListener);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener(THEME_EVENT_NAME, syncTheme as EventListener);
    };
  }, []);

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : 'theme-toggle'}
      data-theme={theme}
      aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      onClick={() => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === 'dark' ? <SunMedium size={17} /> : <MoonStar size={17} />}
      </span>
      <span className="theme-toggle-label">
        {theme === 'dark' ? 'فاتح' : 'داكن'}
      </span>
    </button>
  );
}
