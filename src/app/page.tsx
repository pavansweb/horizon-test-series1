'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicTest } from '@/lib/types';
import {
  ClockIcon,
  BarChartIcon,
  LockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from '@/components/icons/Icons';

export default function StudentHomePage() {
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPublishedTests() {
      try {
        setLoading(true);
        const res = await fetch('/api/tests');
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

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-gray-900 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#1e3a8a] text-white border-b-2 border-[#172554] shadow-sm select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-white text-[#1e3a8a] font-black flex items-center justify-center text-sm shadow">
              NTA
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight">
                JEE (Main) Mock Test Portal
              </h1>
              <p className="text-xs text-blue-200">
                Official Computer Based Test (CBT) Simulation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded bg-blue-950/80 hover:bg-blue-950 text-blue-200 hover:text-white border border-blue-800 transition-all cursor-pointer"
            >
              <LockIcon className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white py-10 px-4 sm:px-6 select-none shadow-inner">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-white/20">
            <CheckCircleIcon className="w-4 h-4 text-green-300" />
            <span>Desktop-First NTA JEE Main Examination Engine</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-3xl mx-auto">
            Experience the Real JEE (Main) CBT Environment
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Practice with authentic JEE Main question papers, the official 5-state question palette,
            independent PDF scrolling, section timer, and automatic performance evaluation.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-gray-300">
          <div>
            <h3 className="font-extrabold text-lg text-gray-900">
              Available Mock Examinations
            </h3>
            <p className="text-xs text-gray-500">
              Select a test paper below to begin your full-length CBT practice session
            </p>
          </div>

          <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded">
            {tests.length} {tests.length === 1 ? 'Exam Ready' : 'Exams Ready'}
          </span>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-xl border border-gray-200">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading JEE Mock Tests...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-700">
            <AlertCircleIcon className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <BarChartIcon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 text-base">No Mock Tests Available Yet</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Please log in to the Admin Dashboard to upload your first JEE Main question paper PDF and configure its answer key.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded shadow-xs"
            >
              <LockIcon className="w-3.5 h-3.5" />
              <span>Go to Admin Dashboard</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tests.map((test) => {
              const totalQ = test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

              return (
                <div
                  key={test.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                        Paper 1 (B.E./B.Tech)
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        {test.duration} mins
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-gray-900 group-hover:text-blue-700 transition-colors">
                      {test.title}
                    </h4>

                    {/* Metadata tags */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <ClockIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{test.duration} Minutes</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <BarChartIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{test.totalMarks} Marks</span>
                      </div>
                    </div>

                    {/* Subject Pills */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                        Sections ({totalQ} Total Questions):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {test.subjects.map((sub) => (
                          <span
                            key={sub.id}
                            className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                          >
                            {sub.name}: {sub.totalQuestions} Qs
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500">
                      Marking: <span className="text-green-700 font-bold">+{test.markingScheme.correct}</span> for correct,{' '}
                      <span className="text-red-600 font-bold">{test.markingScheme.incorrect}</span> for incorrect
                    </div>
                  </div>

                  {/* Start Exam Footer */}
                  <div className="bg-gray-50 p-4 border-t border-gray-100">
                    <Link
                      href={`/test/${test.id}`}
                      className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Start CBT Mock Test</span>
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
      <footer className="bg-white border-t border-gray-200 py-6 px-4 text-center text-xs text-gray-500 space-y-1 select-none">
        <p className="font-semibold text-gray-700">
          Personal JEE (Main) CBT Mock Test Platform
        </p>
        <p>
          Simulating National Testing Agency Computer Based Test standards with automatic auto-save and immediate analysis.
        </p>
      </footer>
    </div>
  );
}
