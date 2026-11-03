'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PublicTest } from '@/lib/types';
import {
  LockIcon,
  AlertCircleIcon,
  CalendarIcon,
  FolderIcon,
  FolderPlusIcon,
  TrashIcon,
  ChevronLeftIcon,
} from '@/components/icons/Icons';
import { ThemeToggle } from '@/components/ThemeToggle';

function formatUploadDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

const DEFAULT_FOLDERS = ['Physics Wallah', 'Allen', 'Oswaal'];

function getTestDefaultFolder(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes('physicswallah') || lower.includes('physics wallah') || /\bpw\b/.test(lower)) {
    return 'Physics Wallah';
  }
  if (lower.includes('allen')) {
    return 'Allen';
  }
  if (lower.includes('oswaal')) {
    return 'Oswaal';
  }
  return null;
}

export default function StudentHomePage() {
  const router = useRouter();
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Folder navigation & state
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [testFolderMap, setTestFolderMap] = useState<Record<string, string | null>>({});

  // New folder modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');

  // Move test modal
  const [movingTest, setMovingTest] = useState<PublicTest | null>(null);

  // CBT Examination Instructions Modal
  const [candidateModalTest, setCandidateModalTest] = useState<PublicTest | null>(null);

  const handleOpenStartModal = (test: PublicTest) => {
    setCandidateModalTest(test);
  };

  useEffect(() => {
    try {
      const savedFolders = localStorage.getItem('cbt_custom_folders');
      if (savedFolders) {
        setCustomFolders(JSON.parse(savedFolders));
      }
      const savedMap = localStorage.getItem('cbt_test_folder_map');
      if (savedMap) {
        setTestFolderMap(JSON.parse(savedMap));
      }
    } catch {}
  }, []);

  const saveCustomFolders = (folders: string[]) => {
    setCustomFolders(folders);
    try {
      localStorage.setItem('cbt_custom_folders', JSON.stringify(folders));
    } catch {}
  };

  const saveTestFolderMap = (map: Record<string, string | null>) => {
    setTestFolderMap(map);
    try {
      localStorage.setItem('cbt_test_folder_map', JSON.stringify(map));
    } catch {}
  };

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

  // Determine which folder a test belongs to
  const getTestFolder = (test: PublicTest): string | null => {
    if (testFolderMap[test.id] !== undefined) {
      return testFolderMap[test.id];
    }
    return getTestDefaultFolder(test.title);
  };

  // All folders list (defaults + user created)
  const allFolderNames = Array.from(new Set([...DEFAULT_FOLDERS, ...customFolders]));

  // Calculate folder counts
  const folderCounts: Record<string, number> = {};
  allFolderNames.forEach((f) => {
    folderCounts[f] = 0;
  });

  tests.forEach((t) => {
    const f = getTestFolder(t);
    if (f && folderCounts[f] !== undefined) {
      folderCounts[f] = (folderCounts[f] || 0) + 1;
    }
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setFolderError('Please enter a folder name.');
      return;
    }
    if (allFolderNames.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      setFolderError('A folder with this name already exists.');
      return;
    }
    const updated = [...customFolders, trimmed];
    saveCustomFolders(updated);
    setNewFolderName('');
    setFolderError('');
    setIsFolderModalOpen(false);
  };

  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folderName}"? Any tests inside will be moved to the Home directory.`)) {
      return;
    }
    const updatedFolders = customFolders.filter((f) => f !== folderName);
    saveCustomFolders(updatedFolders);

    const updatedMap = { ...testFolderMap };
    Object.keys(updatedMap).forEach((id) => {
      if (updatedMap[id] === folderName) {
        updatedMap[id] = null;
      }
    });
    tests.forEach((t) => {
      if (getTestDefaultFolder(t.title) === folderName) {
        updatedMap[t.id] = null;
      }
    });
    saveTestFolderMap(updatedMap);

    if (activeFolder === folderName) {
      setActiveFolder(null);
    }
  };

  const handleMoveTest = (testId: string, targetFolder: string | null) => {
    const updatedMap = {
      ...testFolderMap,
      [testId]: targetFolder,
    };
    saveTestFolderMap(updatedMap);
    setMovingTest(null);
  };

  // Filtered tests when search query is active
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching
    ? tests.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : [];

  // Tests for active folder or home files
  const testsInCurrentFolder = activeFolder
    ? tests.filter((t) => getTestFolder(t) === activeFolder)
    : [];
  const homeTests = tests.filter((t) => getTestFolder(t) === null);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="bg-[#1e3a8a] dark:bg-slate-900 text-white border-b border-blue-900 dark:border-slate-800 shadow-xs select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Title Bar & Search & New Folder Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-300 dark:border-slate-800">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Mock Test Papers</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a test paper to begin your 3-hour CBT exam
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Search mock tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-56"
            />

            <button
              type="button"
              onClick={() => {
                setNewFolderName('');
                setFolderError('');
                setIsFolderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Create a new folder to organize tests"
            >
              <FolderPlusIcon className="w-3.5 h-3.5" />
              <span>+ New Folder</span>
            </button>

            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg shrink-0">
              {tests.length} {tests.length === 1 ? 'Test' : 'Tests'}
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
        ) : isSearching ? (
          /* ===================================================================== */
          /* VIEW 1: SEARCH RESULTS                                                */
          /* ===================================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Search Results for &ldquo;{searchQuery}&rdquo; ({searchResults.length})
              </h3>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No matching tests found</p>
                <p className="text-xs text-slate-500 mt-1">Try another keyword or clear search to browse folders.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    folderName={getTestFolder(test)}
                    onOpenStart={handleOpenStartModal}
                    onOpenMove={() => setMovingTest(test)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeFolder !== null ? (
          /* ===================================================================== */
          /* VIEW 2: INSIDE A SPECIFIC FOLDER                                      */
          /* ===================================================================== */
          <div className="space-y-4">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveFolder(null)}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Home</span>
                </button>
                <span className="text-slate-400 dark:text-slate-600">/</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FolderIcon className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                  {activeFolder}
                </span>
                <span className="text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full ml-1">
                  {testsInCurrentFolder.length} {testsInCurrentFolder.length === 1 ? 'Test' : 'Tests'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveFolder(null)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                ← Back to Folders
              </button>
            </div>

            {/* Folder Test Grid */}
            {testsInCurrentFolder.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                <FolderIcon className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Folder is Empty</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  No mock test papers are currently placed in &ldquo;{activeFolder}&rdquo;. You can move tests here from the Home directory.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFolder(null)}
                  className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Go back to Home files
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testsInCurrentFolder.map((test) => (
                  <TestCard
                    key={test.id}
                    test={test}
                    folderName={activeFolder}
                    onOpenStart={handleOpenStartModal}
                    onOpenMove={() => setMovingTest(test)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ===================================================================== */
          /* VIEW 3: HOME VIEW — FOLDERS FIRST, FOLLOWED BY FILES                  */
          /* ===================================================================== */
          <div className="space-y-8">
            {/* 1. FOLDERS SECTION (FIRST) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                    <span>Folders</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    ({allFolderNames.length})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {allFolderNames.map((folder) => {
                  const count = folderCounts[folder] || 0;
                  const isCustom = customFolders.includes(folder);

                  return (
                    <div
                      key={folder}
                      onClick={() => setActiveFolder(folder)}
                      className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <FolderIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-500/20" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {folder}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {count} {count === 1 ? 'Mock Paper' : 'Mock Papers'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
                          →
                        </span>

                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFolder(folder, e)}
                            title="Delete custom folder"
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. FILES SECTION (FOLLOWED BY FOLDERS) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    Mock Test Papers
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({homeTests.length} in Home)
                  </span>
                </div>
              </div>

              {homeTests.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    All published mock test papers are currently grouped into the folders above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homeTests.map((test) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      folderName={null}
                      onOpenStart={handleOpenStartModal}
                      onOpenMove={() => setMovingTest(test)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW FOLDER                                                */}
      {/* ========================================================================= */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl transition-all">
            <div className="bg-[#1e3a8a] dark:bg-slate-800 text-white p-4">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  New Category
                </span>
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="text-blue-200 hover:text-white text-base font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FolderPlusIcon className="w-5 h-5 text-amber-300" />
                <span>Create New Folder</span>
              </h3>
            </div>

            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Kota Revision, Math Mastery..."
                  value={newFolderName}
                  onChange={(e) => {
                    setNewFolderName(e.target.value);
                    setFolderError('');
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {folderError && (
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1.5">
                    {folderError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MOVE TEST TO FOLDER                                              */}
      {/* ========================================================================= */}
      {movingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl transition-all">
            <div className="bg-[#1e3a8a] dark:bg-slate-800 text-white p-4">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Organize Paper
                </span>
                <button
                  type="button"
                  onClick={() => setMovingTest(null)}
                  className="text-blue-200 hover:text-white text-base font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <h3 className="text-base font-extrabold text-white">Move to Folder</h3>
              <p className="text-[11px] text-blue-200 dark:text-slate-300 truncate mt-0.5">
                {movingTest.title}
              </p>
            </div>

            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {/* Option: Home / Root */}
              <button
                type="button"
                onClick={() => handleMoveTest(movingTest.id, null)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  getTestFolder(movingTest) === null
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🏠</span>
                  <span>Home Directory (No folder)</span>
                </div>
                {getTestFolder(movingTest) === null && <span>✓ Current</span>}
              </button>

              {/* All Folders */}
              {allFolderNames.map((folder) => {
                const isSelected = getTestFolder(movingTest) === folder;
                return (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => handleMoveTest(movingTest.id, folder)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderIcon className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                      <span>{folder}</span>
                    </div>
                    {isSelected && <span>✓ Current</span>}
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setMovingTest(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NTA CBT EXAMINATION INSTRUCTIONS SCREEN                                   */}
      {/* ========================================================================= */}
      {candidateModalTest && (
        <NtaInstructionsScreen
          test={candidateModalTest}
          isOpen={!!candidateModalTest}
          onClose={() => setCandidateModalTest(null)}
          onProceed={(candidateName: string) => {
            const testId = candidateModalTest.id;
            setCandidateModalTest(null);
            router.push(`/test/${testId}?name=${encodeURIComponent(candidateName)}`);
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 select-none">
        <p>Horizon-Test-series</p>
      </footer>
    </div>
  );
}

interface TestCardProps {
  test: PublicTest;
  folderName: string | null;
  onOpenStart: (test: PublicTest) => void;
  onOpenMove: () => void;
}

function TestCard({ test, folderName, onOpenStart, onOpenMove }: TestCardProps) {
  const totalQ = test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden">
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-normal">
          {test.createdAt ? (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <CalendarIcon className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>Uploaded: {formatUploadDateTime(test.createdAt)}</span>
            </div>
          ) : (
            <span />
          )}

          {folderName && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <FolderIcon className="w-2.5 h-2.5 fill-amber-500/20" />
              <span>{folderName}</span>
            </span>
          )}
        </div>

        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug">
          {test.title}
        </h3>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-1">
          <span>{test.duration} mins</span>
          <span>•</span>
          <span>{test.totalMarks} marks</span>
          <span>•</span>
          <span>{totalQ} Qs</span>
        </div>

        {test.isProofread && (
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              <span>✓</span>
              <span>Proofread &amp; Verified</span>
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenStart(test)}
          className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Start CBT Examination</span>
          <span>→</span>
        </button>

        <button
          type="button"
          onClick={onOpenMove}
          title="Move to another folder or home"
          className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <FolderIcon className="w-3.5 h-3.5 text-amber-500" />
        </button>
      </div>
    </div>
  );
}
