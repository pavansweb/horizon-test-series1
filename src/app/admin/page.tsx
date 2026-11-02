'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Test, TestResult, isQuestionUnformatted } from '@/lib/types';
import { TestUploadModal } from '@/components/admin/TestUploadModal';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  UploadIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  BarChartIcon,
} from '@/components/icons/Icons';

interface SubmissionStats {
  totalSubmissions: number;
  avgScore: number;
  avgAccuracy: number;
  topScore: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Navigation tab: 'tests' | 'submissions'
  const [activeTab, setActiveTab] = useState<'tests' | 'submissions'>('tests');

  // Tests state
  const [tests, setTests] = useState<Test[]>([]);
  const [loadingTests, setLoadingTests] = useState<boolean>(true);
  const [testError, setTestError] = useState<string | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<TestResult[]>([]);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [submissionSearch, setSubmissionSearch] = useState<string>('');
  const [submissionTestFilter, setSubmissionTestFilter] = useState<string>('all');

  // Upload/Edit Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [testToEdit, setTestToEdit] = useState<Test | null>(null);

  // Theme state (Dark Mode)
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
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

  const fetchTests = useCallback(async () => {
    try {
      setLoadingTests(true);
      setTestError(null);

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;

      const res = await fetch('/api/admin/tests', {
        headers,
        cache: 'no-store',
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTestError(data.error || 'Failed to load test papers');
        return;
      }

      setTests(data.tests || []);
    } catch (err) {
      console.error('Error fetching admin tests:', err);
      setTestError('Network error while connecting to admin API.');
    } finally {
      setLoadingTests(false);
    }
  }, [router]);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoadingSubmissions(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;

      const res = await fetch('/api/admin/submissions', {
        headers,
        cache: 'no-store',
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissions(data.submissions || []);
        setSubmissionStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTests();
    fetchSubmissions();
  }, [fetchTests, fetchSubmissions]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      sessionStorage.removeItem('admin_token');
      router.push('/admin/login');
    } catch {
      router.push('/admin/login');
    }
  };

  const handleTogglePublish = async (testId: string) => {
    try {
      const targetTest = tests.find((t) => t.id === testId);
      if (targetTest && targetTest.status !== 'published') {
        const unformatted = (targetTest.questions || []).filter(isQuestionUnformatted);
        if (unformatted.length > 0) {
          const qList = unformatted.slice(0, 6).map((q) => `Q${q.questionNumber}`).join(', ');
          const extra = unformatted.length > 6 ? ` and ${unformatted.length - 6} more` : '';
          const proceed = confirm(
            `Notice: "${targetTest.title}" has ${unformatted.length} unformatted question(s) (${qList}${extra}).\n\n` +
            `Students taking the CBT will see generic placeholders with original PDF reference for these questions.\n\n` +
            `Click OK to publish anyway, or Cancel to open the editor and format the remaining questions.`
          );
          if (!proceed) {
            setTestToEdit(targetTest);
            setIsUploadModalOpen(true);
            return;
          }
        }
      }

      const token = sessionStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;

      const res = await fetch(`/api/admin/tests/${testId}/toggle-publish`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        fetchTests();
      }
    } catch (err) {
      console.error('Toggle publish error:', err);
    }
  };

  const handleDeleteTest = async (testId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = sessionStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;

      const res = await fetch(`/api/admin/tests/${testId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        fetchTests();
      } else {
        alert('Failed to delete test paper.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error while deleting test.');
    }
  };

  const handleDeleteSubmission = async (submissionId: string, candidateName: string) => {
    if (!confirm(`Delete test attempt for "${candidateName}"?`)) {
      return;
    }

    try {
      const token = sessionStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['x-admin-token'] = token;

      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        fetchSubmissions();
      } else {
        alert('Failed to delete student submission.');
      }
    } catch (err) {
      console.error('Delete submission error:', err);
      alert('Network error while deleting submission.');
    }
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (submissionTestFilter !== 'all' && sub.testId !== submissionTestFilter) {
      return false;
    }
    if (submissionSearch.trim()) {
      const query = submissionSearch.toLowerCase();
      const nameMatch = (sub.candidateName || '').toLowerCase().includes(query);
      const titleMatch = (sub.testTitle || '').toLowerCase().includes(query);
      return nameMatch || titleMatch;
    }
    return true;
  });

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remMins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans pb-12 transition-colors">
      {/* Top Header */}
      <header className="bg-[#1e3a8a] dark:bg-slate-900 text-white border-b border-blue-900 dark:border-slate-800 shadow-sm py-3 px-4 sm:px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center">
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight text-white">
                Horizon-Test-series • Admin Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center cursor-pointer"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <Link
              href="/"
              className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded border border-white/20 transition-all font-semibold"
            >
              Student Portal
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold cursor-pointer transition-all shadow-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-gray-300 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-lg transition-all cursor-pointer ${
              activeTab === 'tests'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-850'
            }`}
          >
            <span>📝 Test Papers</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'tests' ? 'bg-blue-800 text-blue-100' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
            }`}>
              {tests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('submissions');
              fetchSubmissions();
            }}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-lg transition-all cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-850'
            }`}
          >
            <span>📊 Student Performances</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'submissions' ? 'bg-blue-800 text-blue-100' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
            }`}>
              {submissions.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SIMPLE, MODERN TEST PAPERS SECTION                                 */}
        {/* ========================================================================= */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs transition-colors">
              <div>
                <h2 className="font-extrabold text-lg text-gray-900 dark:text-slate-100">
                  Question Papers &amp; Test Series
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Upload PDF question papers, auto-format with Gemini AI, and publish to the mock portal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchTests()}
                  className="p-2 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 cursor-pointer transition-colors"
                  title="Refresh test papers list"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setTestToEdit(null);
                    setIsUploadModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Upload Paper (AI Auto-Format)</span>
                </button>
              </div>
            </div>

            {testError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {testError}
              </div>
            )}

            {/* Loading State */}
            {loadingTests ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">Loading test papers...</span>
              </div>
            ) : tests.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <UploadIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-gray-800 dark:text-slate-200">No Test Papers Yet</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
                  Upload any JEE Main question paper PDF. Gemini AI will break it down into questions, extract LaTeX math, and prepare the CBT interface.
                </p>
                <button
                  onClick={() => {
                    setTestToEdit(null);
                    setIsUploadModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Upload &amp; Format Question Paper</span>
                </button>
              </div>
            ) : (
              /* Simple, Clean Test Papers List */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map((test) => {
                  const totalQ = (test.questions && test.questions.length > 0)
                    ? test.questions.length
                    : test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
                  const isFormatted = test.questions && test.questions.length > 0;
                  const answerKeyCount = Object.keys(test.answerKey || {}).length;
                  const unformattedQuestions = (test.questions || []).filter(isQuestionUnformatted);
                  const unformattedCount = unformattedQuestions.length;
                  const isFullyFormatted = isFormatted && unformattedCount === 0;

                  return (
                    <div
                      key={test.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        {/* Status badge & Duration */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(test.id)}
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                              test.status === 'published'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                            }`}
                            title="Click to toggle published / draft"
                          >
                            {test.status === 'published' ? '● Published' : '○ Draft'}
                          </button>

                          <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                            {test.duration} mins
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100 leading-snug">
                          {test.title}
                        </h3>

                        {/* Meta tags */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded font-bold">
                            {totalQ} Questions
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded font-semibold">
                            {test.totalMarks} Marks
                          </span>
                          {isFullyFormatted ? (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                              ✨ 100% Formatted ({test.questions?.length})
                            </span>
                          ) : unformattedCount > 0 ? (
                            <span
                              onClick={() => {
                                setTestToEdit(test);
                                setIsUploadModalOpen(true);
                              }}
                              className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded font-bold border border-amber-300 dark:border-amber-800 text-[11px] flex items-center gap-1 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60"
                              title={`Click to format unformatted questions: ${unformattedQuestions.map((q) => 'Q' + q.questionNumber).join(', ')}`}
                            >
                              <span>⚠️ {unformattedCount} Unformatted</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[11px]">
                              PDF Paper
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded font-semibold">
                            Key: {answerKeyCount}/{totalQ}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <Link
                          href={`/test/${test.id}`}
                          target="_blank"
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                          title="Open Student CBT Test Interface"
                        >
                          <span>Take CBT</span>
                          <ExternalLinkIcon className="w-3.5 h-3.5" />
                        </Link>

                        <div className="flex items-center gap-1.5">
                          {unformattedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setTestToEdit(test);
                                setIsUploadModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-950/60 dark:to-indigo-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title={`Format ${unformattedCount} remaining questions with AI`}
                            >
                              <span>✨ Format ({unformattedCount})</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setTestToEdit(test);
                              setIsUploadModalOpen(true);
                            }}
                            className="p-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg transition-all cursor-pointer"
                            title="Review / Edit Questions"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTest(test.id, test.title)}
                            className="p-1.5 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-300 rounded-lg transition-all cursor-pointer"
                            title="Delete test paper"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: STUDENT PERFORMANCES & ANALYTICS                                   */}
        {/* ========================================================================= */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            {/* KPI Metrics Cards */}
            {submissionStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Total Attempts</span>
                  <div className="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-400 my-1">
                    {submissionStats.totalSubmissions}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">Completed Student Submissions</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Average Score</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 my-1">
                    {submissionStats.avgScore}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">Across All Test Submissions</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Top Highest Score</span>
                  <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 my-1">
                    {submissionStats.topScore}
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">Highest Score Recorded</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
                  <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400">Average Accuracy</span>
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 my-1">
                    {submissionStats.avgAccuracy}%
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">Overall Accuracy Rate</span>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by student name or test title..."
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-xs sm:text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <select
                  value={submissionTestFilter}
                  onChange={(e) => setSubmissionTestFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Test Papers</option>
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchSubmissions()}
                className="p-2 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 cursor-pointer transition-colors self-end sm:self-auto"
                title="Refresh student submissions"
              >
                <RefreshCwIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Submissions Table */}
            {loadingSubmissions ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-sm text-gray-600 dark:text-slate-300 font-medium">Loading student submissions...</span>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-800 space-y-2">
                <BarChartIcon className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto" />
                <h4 className="font-bold text-gray-800 dark:text-slate-200 text-base">No Student Submissions Found</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {submissionSearch || submissionTestFilter !== 'all'
                    ? 'No submissions match your search or filter.'
                    : 'When students attempt and submit mock tests, their scores and detailed reviews appear here.'}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold border-b border-gray-200 dark:border-slate-700">
                        <th className="p-3">Candidate Name</th>
                        <th className="p-3">Test Paper</th>
                        <th className="p-3 text-center">Score</th>
                        <th className="p-3 text-center">Accuracy</th>
                        <th className="p-3 text-center">Breakdown (C/W/L)</th>
                        <th className="p-3 text-center">Time Spent</th>
                        <th className="p-3 text-center">Submitted At</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredSubmissions.map((sub) => {
                        const scorePct = Math.round((sub.totalScore / (sub.maxScore || 300)) * 100);

                        return (
                          <tr
                            key={sub.submissionId}
                            className="hover:bg-gray-50 dark:hover:bg-slate-850/50 transition-colors"
                          >
                            <td className="p-3 font-bold text-gray-900 dark:text-slate-100">
                              <span className="flex items-center gap-1.5">
                                <span>👤</span>
                                <span>{sub.candidateName || 'JEE Aspirant'}</span>
                              </span>
                            </td>

                            <td className="p-3 text-gray-800 dark:text-slate-200 font-medium">
                              {sub.testTitle}
                            </td>

                            <td className="p-3 text-center">
                              <span className="font-black text-blue-900 dark:text-blue-400 text-sm">
                                {sub.totalScore}
                              </span>
                              <span className="text-gray-400 text-xs"> / {sub.maxScore}</span>
                              <span className="text-[10px] text-gray-500 dark:text-slate-400 block font-semibold">
                                ({scorePct}%)
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`font-bold text-xs px-2.5 py-0.5 rounded ${
                                  sub.overallAccuracy >= 75
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : sub.overallAccuracy >= 50
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                }`}
                              >
                                {sub.overallAccuracy}%
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span className="font-semibold text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {sub.totalCorrect}
                                </span>
                                {' / '}
                                <span className="text-red-600 dark:text-red-400 font-bold">
                                  {sub.totalIncorrect}
                                </span>
                                {' / '}
                                <span className="text-gray-500 dark:text-slate-400">
                                  {sub.totalUnattempted}
                                </span>
                              </span>
                            </td>

                            <td className="p-3 text-center font-mono text-xs text-gray-600 dark:text-slate-300">
                              {formatDuration(sub.timeTakenSeconds)}
                            </td>

                            <td className="p-3 text-center text-[11px] text-gray-500 dark:text-slate-400">
                              {new Date(sub.submittedAt).toLocaleString()}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  href={`/result/${sub.submissionId}`}
                                  target="_blank"
                                  className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                  title="View full candidate analysis"
                                >
                                  <span>View Report</span>
                                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubmission(sub.submissionId, sub.candidateName)}
                                  className="p-1.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-lg transition-all cursor-pointer"
                                  title="Delete submission"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Clean AI Test Upload & Breakdown Modal */}
      <TestUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setTestToEdit(null);
        }}
        onTestSaved={() => {
          fetchTests();
          fetchSubmissions();
        }}
        testToEdit={testToEdit}
      />
    </div>
  );
}
