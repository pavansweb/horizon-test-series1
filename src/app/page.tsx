'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicTest } from '@/lib/types';
import {
  ClockIcon,
  BarChartIcon,
  LockIcon,
  AlertCircleIcon,
} from '@/components/icons/Icons';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function StudentHomePage() {
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadPublishedTests() {
      try {
        setLoading(true);
        const res = await fetch('/api/tests', {
          cache: 'no-store',
          headers: { Pragma: 'no-cache' },
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setTests(data.tests || []);
        } else {
          setError(data.error || 'Failed to load mock tests.');
        }
      } catch (err) {
        console.error('Error fetching mock tests:', err);
        setError('Network error while connecting to server.');
      } finally {
        setLoading(false);
      }
    }

    loadPublishedTests();
  }, []);

  const filteredTests = tests.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return t.title.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="bg-[#1e3a8a] dark:bg-slate-900 text-white border-b border-blue-900 dark:border-slate-800 shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">
              Horizon-Test-series
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded bg-blue-950/70 hover:bg-blue-950 text-blue-200 hover:text-white border border-blue-800 dark:border-slate-700 transition-colors"
            >
              <LockIcon className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-5">
        {/* Title Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-300 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">
              Mock Test Papers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a test paper to begin your 3-hour CBT exam
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search mock tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg shrink-0">
              {filteredTests.length} {filteredTests.length === 1 ? 'Test' : 'Tests'}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Loading test papers...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-center text-red-700 dark:text-red-300">
            <AlertCircleIcon className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Mock Tests Available</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery ? 'No tests match your search query.' : 'No published test papers available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((test) => {
              const totalQ = test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

              return (
                <div
                  key={test.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug">
                      {test.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <ClockIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{test.duration} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <BarChartIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{test.totalMarks} Marks</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                        Sections ({totalQ} Questions):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {test.subjects.map((sub) => (
                          <span
                            key={sub.id}
                            className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded"
                          >
                            {sub.name}: {sub.totalQuestions} Qs
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Marking: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{test.markingScheme.correct}</span> / <span className="text-red-600 dark:text-red-400 font-bold">{test.markingScheme.incorrect}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      href={`/test/${test.id}`}
                      className="w-full py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Start CBT Examination</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 select-none">
        <p>Horizon-Test-series</p>
      </footer>
    </div>
  );
}
