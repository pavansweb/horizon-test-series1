'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Test } from '@/lib/types';
import { TestFormModal } from '@/components/admin/TestFormModal';
import { ReplacePdfModal } from '@/components/admin/ReplacePdfModal';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  UploadIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
} from '@/components/icons/Icons';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [testToEdit, setTestToEdit] = useState<Test | null>(null);
  const [testForPdfReplace, setTestForPdfReplace] = useState<Test | null>(null);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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
        setError(data.error || 'Failed to load test papers');
        return;
      }

      setTests(data.tests || []);
    } catch (err) {
      console.error('Error fetching admin tests:', err);
      setError('Network error while connecting to admin API.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

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

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans pb-12">
      {/* Top Navigation */}
      <header className="bg-[#1e3a8a] text-white border-b border-blue-900 shadow-sm py-3.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white text-[#1e3a8a] font-black flex items-center justify-center text-sm">
              NTA
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight">
                JEE Main Test Administration
              </h1>
              <p className="text-[11px] text-blue-200">
                Manage Question Papers, PDFs & Answer Keys
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-xs">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Configured Test Papers</h2>
            <p className="text-xs text-gray-500">
              {tests.length} {tests.length === 1 ? 'test paper' : 'test papers'} available
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTests()}
              className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCwIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setTestToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Upload New JEE Test Paper</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-sm text-gray-600 font-medium">Loading test papers...</span>
          </div>
        ) : tests.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <UploadIcon className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-gray-800 mb-1">No JEE Mock Tests Uploaded Yet</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
              Upload a JEE Main question paper PDF, configure the answer key, and publish it to immediately start practicing.
            </p>
            <button
              onClick={() => {
                setTestToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-700 text-white font-bold text-xs rounded hover:bg-blue-800 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Your First Mock Test</span>
            </button>
          </div>
        ) : (
          /* Tests Table */
          <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <th className="p-3">Test Title</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Duration</th>
                    <th className="p-3 text-center">Questions</th>
                    <th className="p-3 text-center">Key Configured</th>
                    <th className="p-3 text-center">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => {
                    const totalQ = test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
                    const filledAnswers = Object.keys(test.answerKey || {}).length;
                    const isFullyKeyed = filledAnswers >= totalQ;

                    return (
                      <tr key={test.id} className="border-b border-gray-100 hover:bg-gray-50/70 font-medium">
                        <td className="p-3 font-bold text-gray-900">
                          <div>{test.title}</div>
                          <div className="text-[11px] text-gray-400 font-normal truncate max-w-xs">
                            PDF: {test.pdfFileName}
                          </div>
                        </td>

                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(test.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer border ${
                              test.status === 'published'
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                            }`}
                            title="Click to toggle publish status"
                          >
                            {test.status === 'published' ? '● Published' : '○ Draft'}
                          </button>
                        </td>

                        <td className="p-3 text-center font-mono text-gray-700">
                          {test.duration} mins
                        </td>

                        <td className="p-3 text-center">
                          <span className="font-bold text-blue-900">{totalQ}</span>
                          <span className="text-[10px] text-gray-500 block">
                            (P:{test.subjects.find((s) => s.id === 'physics')?.totalQuestions || 0}{' '}
                            C:{test.subjects.find((s) => s.id === 'chemistry')?.totalQuestions || 0}{' '}
                            M:{test.subjects.find((s) => s.id === 'mathematics')?.totalQuestions || 0})
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`font-bold text-xs px-2 py-0.5 rounded ${
                              isFullyKeyed
                                ? 'text-green-700 bg-green-50'
                                : 'text-amber-700 bg-amber-50'
                            }`}
                          >
                            {filledAnswers}/{totalQ}
                          </span>
                        </td>

                        <td className="p-3 text-center text-[11px] text-gray-500">
                          {new Date(test.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Attempt CBT */}
                            <Link
                              href={`/test/${test.id}`}
                              target="_blank"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-all"
                              title="Take / Test CBT Interface"
                            >
                              <ExternalLinkIcon className="w-4 h-4" />
                            </Link>

                            {/* Edit Test */}
                            <button
                              type="button"
                              onClick={() => {
                                setTestToEdit(test);
                                setIsCreateModalOpen(true);
                              }}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-all cursor-pointer"
                              title="Edit Details & Answer Key"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>

                            {/* Replace PDF */}
                            <button
                              type="button"
                              onClick={() => setTestForPdfReplace(test)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-all cursor-pointer"
                              title="Replace Question Paper PDF"
                            >
                              <UploadIcon className="w-4 h-4" />
                            </button>

                            {/* Delete Test */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTest(test.id, test.title)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all cursor-pointer"
                              title="Delete Test"
                            >
                              <TrashIcon className="w-4 h-4" />
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
      </main>

      {/* Test Creation & Edit Modal */}
      <TestFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTestToEdit(null);
        }}
        onTestSaved={() => fetchTests()}
        testToEdit={testToEdit}
      />

      {/* Replace PDF Modal */}
      {testForPdfReplace && (
        <ReplacePdfModal
          isOpen={!!testForPdfReplace}
          onClose={() => setTestForPdfReplace(null)}
          testId={testForPdfReplace.id}
          testTitle={testForPdfReplace.title}
          onPdfReplaced={() => fetchTests()}
        />
      )}
    </div>
  );
}
