'use client';

import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@/components/icons/Icons';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const isHtmlDark = document.documentElement.classList.contains('dark');
      const saved = localStorage.getItem('cbt_theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = saved ? saved === 'dark' : (isHtmlDark || prefersDark);

      setIsDark(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {
      // Ignore
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cbt_theme') {
        const nextDark = e.newValue === 'dark';
        setIsDark(nextDark);
        if (nextDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('cbt_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('cbt_theme', 'light');
      }
      window.dispatchEvent(new Event('cbt_theme_changed'));
    } catch {
      // Ignore
    }
  };

  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-lg border border-transparent opacity-0 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700 hover:border-slate-600 shadow-sm'
          : 'bg-white/10 hover:bg-white/20 text-yellow-300 border-white/20 hover:border-white/30 shadow-xs backdrop-blur-xs'
      } ${className}`}
    >
      {isDark ? (
        <SunIcon className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <MoonIcon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
