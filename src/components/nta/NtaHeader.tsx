'use client';

import React from 'react';

interface NtaHeaderProps {
  testTitle?: string;
  candidateName?: string;
  timeRemainingSeconds: number;
  onSubmitTest?: () => void;
}

export function NtaHeader({
  candidateName = 'JEE Aspirant',
  timeRemainingSeconds,
}: NtaHeaderProps) {
  const [isDark, setIsDark] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('cbt_theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = saved === 'dark' || (!saved && prefersDark);
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
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('cbt_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('cbt_theme', 'light');
    }
  };

  // Format as H:M:S (e.g. 0:0:2 or 2:59:45)
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <header
      className="w-full select-none"
      style={{
        background: isDark ? '#0f172a' : '#ffffff',
        borderBottom: `1px solid ${isDark ? '#334155' : '#d1d5db'}`,
        padding: '6px 14px',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Logo & Horizon Test Series Header */}
        <div className="flex items-center gap-3">
          {/* Horizon Academic Crest Emblem */}
          <div
            style={{
              width: '44px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Outer Golden Wreath */}
              <circle cx="50" cy="50" r="46" fill="none" stroke="#d4af37" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="41" fill="#fdfbf7" stroke="#1e3a68" strokeWidth="1.5" />
              {/* Inner Shield */}
              <path
                d="M50 16 L76 26 C76 56 50 78 50 78 C50 78 24 56 24 26 Z"
                fill="#1e3a68"
                stroke="#d4af37"
                strokeWidth="1.5"
              />
              {/* Horizon Sun & Rays */}
              <path
                d="M34 50 A16 16 0 0 1 66 50 Z"
                fill="#f59e0b"
              />
              <line x1="50" y1="30" x2="50" y2="24" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              <line x1="39" y1="34" x2="35" y2="30" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              <line x1="61" y1="34" x2="65" y2="30" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              {/* Open Book in Base */}
              <path
                d="M36 58 Q44 54 50 58 Q56 54 64 58 L64 68 Q56 64 50 68 Q44 64 36 68 Z"
                fill="#ffffff"
                stroke="#d4af37"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: isDark ? '#60a5fa' : '#244874',
                letterSpacing: '0.8px',
                lineHeight: '1.15',
                margin: 0,
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                textTransform: 'uppercase',
              }}
            >
              JEE (MAIN) EXAMINATION
            </h1>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isDark ? '#94a3b8' : '#476282',
                letterSpacing: '0.4px',
                marginTop: '2px',
                textTransform: 'uppercase',
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
              }}
            >
              COMPUTER BASED TEST (CBT) SIMULATION
            </div>
          </div>
        </div>

        {/* Right: Theme Toggle, Candidate Photo, Name & Pill Timer */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Dark/Light Mode"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: `1.5px solid ${isDark ? '#475569' : '#cbd5e1'}`,
              background: isDark ? '#1e293b' : '#f8fafc',
              color: isDark ? '#f59e0b' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b' }}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#475569' }}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Candidate Photo Frame */}
          <div
            style={{
              width: '46px',
              height: '54px',
              border: `1px solid ${isDark ? '#475569' : '#94a3b8'}`,
              backgroundColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill={isDark ? '#94a3b8' : '#64748b'}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          {/* Candidate Info and Timer */}
          <div className="flex flex-col justify-center" style={{ lineHeight: '1.45' }}>
            <div style={{ fontSize: '13.5px', color: isDark ? '#e2e8f0' : '#334155' }}>
              <span style={{ fontWeight: 500 }}>Candidate Name: </span>
              <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>{candidateName}</span>
            </div>
            <div className="flex items-center" style={{ fontSize: '13.5px', color: isDark ? '#e2e8f0' : '#334155' }}>
              <span style={{ fontWeight: 500 }}>Time Left :</span>
              <span
                style={{
                  marginLeft: '8px',
                  background: isDark ? '#134e4a' : '#e0f7fa',
                  border: `2px solid ${isDark ? '#14b8a6' : '#00bcd4'}`,
                  borderRadius: '14px',
                  padding: '2px 14px',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '15.5px',
                  color: isDark ? '#2dd4bf' : '#00838f',
                  letterSpacing: '1px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {formatTime(timeRemainingSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
