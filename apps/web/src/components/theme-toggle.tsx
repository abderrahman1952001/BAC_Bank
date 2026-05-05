'use client';

import { useEffect, useState } from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { THEME_EVENT_NAME, THEME_STORAGE_KEY, ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';

function getResolvedTheme(): ThemeMode {
  if (typeof document === 'undefined') {
    return 'dark';
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
  const [theme, setTheme] = useState<ThemeMode>('dark');

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
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={cn('size-12 rounded-2xl', className)}
      aria-label={theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      onClick={() => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
    >
      {theme === 'dark' ? (
        <SunMedium data-icon="solo" aria-hidden="true" />
      ) : (
        <MoonStar data-icon="solo" aria-hidden="true" />
      )}
    </Button>
  );
}
