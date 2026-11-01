'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Test, SubjectConfig, MarkingScheme } from '@/lib/types';
import { AnswerKeyEditor } from './AnswerKeyEditor';
import { UploadIcon, CheckIcon } from '@/components/icons/Icons';
import { parseUniversalAnswerKey } from '@/lib/answerKeyParser';

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestSaved: () => void;
  testToEdit?: Test | null;
}

export interface SubjectOrderItem {
  id: string;
  name: string;
  count: number;
}

const DEFAULT_SUBJECT_ORDER: SubjectOrderItem[] = [
  { id: 'physics', name: 'Physics', count: 25 },
  { id: 'chemistry', name: 'Chemistry', count: 25 },
  { id: 'mathematics', name: 'Mathematics', count: 25 },
];

export function TestFormModal({
  isOpen,
  onClose,
  onTestSaved,
  testToEdit,
}: TestFormModalProps) {
  const isEditing = !!testToEdit;

  const [title, setTitle] = useState<string>('');
  const [duration, setDuration] = useState<number>(180);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [pdfEndPage, setPdfEndPage] = useState<number | undefined>(undefined);

  // Subject ordering state (allows shuffling: Chemistry first, Physics first, etc.)
  const [subjectOrder, setSubjectOrder] = useState<SubjectOrderItem[]>(DEFAULT_SUBJECT_ORDER);

  // Side-by-side live PDF preview state
  const [showPdfSidebar, setShowPdfSidebar] = useState<boolean>(true);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [totalPdfPages, setTotalPdfPages] = useState<number | null>(null);

  // Gemini AI Auto-Formatting state
  const [isGeminiFormatting, setIsGeminiFormatting] = useState<boolean>(false);
  const [geminiNotice, setGeminiNotice] = useState<string | null>(null);

  // Marking Scheme
  const [markingCorrect, setMarkingCorrect] = useState<number>(4);
  const [markingIncorrect, setMarkingIncorrect] = useState<number>(-1);
  const [markingUnattempted, setMarkingUnattempted] = useState<number>(0);

  // Answer Key
  const [answerKey, setAnswerKey] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<'draft' | 'published'>('published');

  const [activeTab, setActiveTab] = useState<'details' | 'subjects' | 'answers'>('details');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanningPdf, setIsScanningPdf] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create preview object URL when local file is picked
  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfPreviewUrl(url);
      setPreviewPage(1);
      return () => URL.revokeObjectURL(url);
    } else if (testToEdit?.pdfUrl) {
      setPdfPreviewUrl(testToEdit.pdfUrl);
      setPreviewPage(testToEdit.pdfStartPage || 1);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [pdfFile, testToEdit]);

  // Read total pages from PDF once preview URL is available
  useEffect(() => {
    const activeUrl = pdfPreviewUrl;
    if (!activeUrl) {
      setTotalPdfPages(null);
      return;
    }
    let isCancelled = false;
    async function getNumPages(targetUrl: string) {
      try {
        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
              } else reject(new Error('PDF.js failed to load'));
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
          });
        }
        const doc = await window.pdfjsLib!.getDocument({ url: targetUrl }).promise;
        if (!isCancelled) {
          setTotalPdfPages(doc.numPages);
          if (!pdfEndPage && doc.numPages > 0) {
            setPdfEndPage(doc.numPages);
          }
        }
      } catch {
        // Silently fallback if PDF.js fails to inspect
      }
    }
    getNumPages(activeUrl);
    return () => {
      isCancelled = true;
    };
  }, [pdfPreviewUrl, pdfEndPage]);

  // Initialize form when testToEdit changes
  useEffect(() => {
    if (testToEdit) {
      setTitle(testToEdit.title);
      setDuration(testToEdit.duration);
      setPdfStartPage(testToEdit.pdfStartPage || 1);
      setPdfEndPage(testToEdit.pdfEndPage || undefined);
      setAnswerKey(testToEdit.answerKey || {});
      setStatus(testToEdit.status);

      setMarkingCorrect(testToEdit.markingScheme?.correct ?? 4);
      setMarkingIncorrect(testToEdit.markingScheme?.incorrect ?? -1);
      setMarkingUnattempted(testToEdit.markingScheme?.unattempted ?? 0);

      if (testToEdit.subjects && testToEdit.subjects.length > 0) {
        setSubjectOrder(
          testToEdit.subjects.map((s) => ({
            id: s.id,
            name: s.name,
            count: s.totalQuestions,
          }))
        );
      } else {
        setSubjectOrder(DEFAULT_SUBJECT_ORDER);
      }
      setPdfFile(null);
    } else {
      // Defaults for new test
      setTitle('JEE (Main) Mock Test - Paper 1');
      setDuration(180);
      setPdfStartPage(1);
      setPdfEndPage(undefined);
      setSubjectOrder(DEFAULT_SUBJECT_ORDER);
      setMarkingCorrect(4);
      setMarkingIncorrect(-1);
      setMarkingUnattempted(0);
      setAnswerKey({});
      setStatus('published');
      setPdfFile(null);
    }
    setActiveTab('details');
    setError(null);
  }, [testToEdit, isOpen]);

  if (!isOpen) return null;

  // Move subject up or down in sequence (shuffling)
  const handleMoveSubject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subjectOrder.length) return;
    const copy = [...subjectOrder];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setSubjectOrder(copy);
  };

  // Preset subject order configurations
  const applyPresetOrder = (preset: 'pcm' | 'cpm' | 'mpc' | 'pmc') => {
    const findCount = (id: string, fallback: number = 25) =>
      subjectOrder.find((s) => s.id === id)?.count || fallback;

    if (preset === 'cpm') {
      // Chemistry -> Physics -> Mathematics (Allen / Resonance format)
      setSubjectOrder([
        { id: 'chemistry', name: 'Chemistry', count: findCount('chemistry') },
        { id: 'physics', name: 'Physics', count: findCount('physics') },
        { id: 'mathematics', name: 'Mathematics', count: findCount('mathematics') },
      ]);
    } else if (preset === 'pcm') {
      // Physics -> Chemistry -> Mathematics (Standard NTA format)
      setSubjectOrder([
        { id: 'physics', name: 'Physics', count: findCount('physics') },
        { id: 'chemistry', name: 'Chemistry', count: findCount('chemistry') },
        { id: 'mathematics', name: 'Mathematics', count: findCount('mathematics') },
      ]);
    } else if (preset === 'mpc') {
      // Mathematics -> Physics -> Chemistry
      setSubjectOrder([
        { id: 'mathematics', name: 'Mathematics', count: findCount('mathematics') },
        { id: 'physics', name: 'Physics', count: findCount('physics') },
        { id: 'chemistry', name: 'Chemistry', count: findCount('chemistry') },
      ]);
    } else if (preset === 'pmc') {
      // Physics -> Mathematics -> Chemistry
      setSubjectOrder([
        { id: 'physics', name: 'Physics', count: findCount('physics') },
        { id: 'mathematics', name: 'Mathematics', count: findCount('mathematics') },
        { id: 'chemistry', name: 'Chemistry', count: findCount('chemistry') },
      ]);
    }
  };

  const handleUpdateSubjectCount = (id: string, count: number) => {
    setSubjectOrder((prev) =>
      prev.map((s) => (s.id === id ? { ...s, count: Math.max(1, count) } : s))
    );
  };

  // Build sequential subject configs dynamically based on shuffled order
  let runningQ = 1;
  const subjects: SubjectConfig[] = subjectOrder.map((item) => {
    const startQ = runningQ;
    const endQ = runningQ + item.count - 1;
    runningQ = endQ + 1;
    return {
      id: item.id,
      name: item.name,
      startQuestion: startQ,
      endQuestion: endQ,
      totalQuestions: item.count,
    };
  });

  const totalQuestions = subjectOrder.reduce((acc, s) => acc + s.count, 0);
  const autoTotalMarks = totalQuestions * (Number(markingCorrect) || 4);

  // Dynamically compute integer type questions based on the shuffled subjects
  // (In JEE 25-Q format: last 5 questions of each subject are numerical/integer type)
  const computedIntegerQuestions: number[] = [];
  subjects.forEach((sub) => {
    const intCount = sub.totalQuestions >= 30 ? 10 : 5;
    const startInt = sub.endQuestion - intCount + 1;
    for (let q = startInt; q <= sub.endQuestion; q++) {
      computedIntegerQuestions.push(q);
    }
  });

  const handleScanPdfForAnswers = async () => {
    if (!pdfPreviewUrl) {
      setScanStatus('No PDF loaded to scan.');
      return;
    }
    try {
      setIsScanningPdf(true);
      setScanStatus('Scanning PDF pages for answer key...');

      if (!window.pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              resolve();
            } else reject(new Error('PDF.js failed to load'));
          };
          script.onerror = () => reject(new Error('Failed to load PDF.js script'));
          document.head.appendChild(script);
        });
      }

      const doc = await window.pdfjsLib!.getDocument({ url: pdfPreviewUrl }).promise;
      let combinedText = '';

      // Check the final 4 pages first (where answer keys typically reside)
      const startScan = Math.max(1, doc.numPages - 4);
      for (let p = startScan; p <= doc.numPages; p++) {
        const page = (await doc.getPage(p)) as unknown as {
          getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
        };
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item) => item?.str || '')
          .join(' ');
        combinedText += `\n ${pageStrings}`;
      }

      const parsed = parseUniversalAnswerKey(combinedText, totalQuestions, computedIntegerQuestions);
      if (parsed.filledCount >= 5) {
        setAnswerKey((prev) => ({ ...prev, ...parsed.answerKey }));
        setScanStatus(`Found and loaded ${parsed.filledCount} answers from PDF (${parsed.detectedFormat})!`);
        setActiveTab('answers');
      } else {
        setScanStatus('No printed answer key detected in final pages. Use Smart Paste or Speed-Tagger.');
      }
    } catch (err) {
      console.warn('PDF answer scan error:', err);
      setScanStatus('Could not scan PDF text.');
    } finally {
      setIsScanningPdf(false);
    }
  };

  // Google Gemini AI Auto-Formatting handler
  const handleAutoFormatWithGemini = async () => {
    if (!pdfFile && !testToEdit?.pdfUrl) {
      setError('Please select or upload a Question Paper PDF first to format with Gemini AI.');
      return;
    }

    try {
      setIsGeminiFormatting(true);
      setGeminiNotice('✨ Gemini AI is analyzing question paper structure, subject sequence & answer key...');
      setError(null);

      const formData = new FormData();
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      } else if (testToEdit?.pdfUrl) {
        formData.append('pdfUrl', testToEdit.pdfUrl);
      }

      const res = await fetch('/api/admin/gemini/parse-paper', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gemini paper analysis failed.');
      }

      const parsed = result.data;
      if (parsed.title) setTitle(parsed.title);
      if (parsed.durationMinutes) setDuration(parsed.durationMinutes);
      if (parsed.pdfStartPage) {
        setPdfStartPage(parsed.pdfStartPage);
        setPreviewPage(parsed.pdfStartPage);
      }
      if (parsed.pdfEndPage) {
        setPdfEndPage(parsed.pdfEndPage);
      }

      if (parsed.subjects && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        setSubjectOrder(
          parsed.subjects.map((s: { id: string; name: string; totalQuestions: number }) => ({
            id: s.id,
            name: s.name,
            count: s.totalQuestions || 25,
          }))
        );
      }

      const answersFound = Object.keys(parsed.answerKey || {}).length;
      if (answersFound > 0) {
        setAnswerKey((prev) => ({ ...prev, ...parsed.answerKey }));
      }

      const orderNames = (parsed.subjects || []).map((s: { name: string }) => s.name).join(' → ');
      setGeminiNotice(
        `✨ Gemini auto-format complete (${result.modelUsed})! Title: "${parsed.title || 'JEE Paper'}" • Order: ${orderNames || 'Default'} • ${
          answersFound > 0 ? `${answersFound} answers extracted` : 'Paper structure ready'
        }.`
      );
    } catch (err: unknown) {
      console.error('Gemini error:', err);
      setError((err as Error)?.message || 'Gemini auto-formatting failed.');
      setGeminiNotice(null);
    } finally {
      setIsGeminiFormatting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a test title.');
      setActiveTab('details');
      return;
    }

    if (!isEditing && !pdfFile) {
      setError('Please upload a question paper PDF.');
      setActiveTab('details');
      return;
    }

    try {
      setIsSubmitting(true);

      const markingScheme: MarkingScheme = {
        correct: Number(markingCorrect),
        incorrect: Number(markingIncorrect),
        unattempted: Number(markingUnattempted),
      };

      if (isEditing && testToEdit) {
        // Update existing test
        const res = await fetch(`/api/admin/tests/${testToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            duration: Number(duration),
            totalMarks: autoTotalMarks,
            pdfStartPage: Number(pdfStartPage) || 1,
            pdfEndPage: pdfEndPage ? Number(pdfEndPage) : null,
            subjects,
            integerQuestions: computedIntegerQuestions,
            markingScheme,
            answerKey,
            status,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to update test.');
          return;
        }
      } else {
        // Create new test with FormData (PDF file)
        const formData = new FormData();
        if (pdfFile) {
          formData.append('pdf', pdfFile);
        }
        formData.append('title', title);
        formData.append('duration', duration.toString());
        formData.append('totalMarks', autoTotalMarks.toString());
        formData.append('pdfStartPage', (pdfStartPage || 1).toString());
        if (pdfEndPage) {
          formData.append('pdfEndPage', pdfEndPage.toString());
        }
        formData.append('subjects', JSON.stringify(subjects));
        formData.append('integerQuestions', JSON.stringify(computedIntegerQuestions));
        formData.append('markingScheme', JSON.stringify(markingScheme));
        formData.append('answerKey', JSON.stringify(answerKey));
        formData.append('status', status);

        const res = await fetch('/api/admin/tests', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to create test.');
          return;
        }
      }

      onTestSaved();
      onClose();
    } catch (err) {
      console.error('Error saving test:', err);
      setError('Network error occurred while saving the test.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs select-none">
      <div
        className={`bg-white dark:bg-slate-900 rounded-lg shadow-2xl transition-all duration-200 border border-gray-300 dark:border-slate-800 overflow-hidden flex flex-col h-[94vh] max-h-[94vh] text-slate-900 dark:text-slate-100 ${
          showPdfSidebar ? 'w-[98vw] max-w-7xl' : 'w-full max-w-3xl'
        }`}
      >
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                {isEditing ? 'Edit Test Paper' : 'Upload & Configure JEE Mock Test'}
                <span className="text-[11px] font-semibold bg-blue-900/90 text-blue-200 px-2 py-0.5 rounded">
                  {totalQuestions} Qs • {autoTotalMarks} Marks
                </span>
              </h2>
              <p className="text-[11px] text-blue-200">
                {isEditing ? `Modifying: ${testToEdit?.title}` : 'Drop PDF, shuffle subjects to match paper, & configure answer key'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Auto-Format with Gemini AI Button in Header */}
            <button
              type="button"
              disabled={!pdfPreviewUrl || isGeminiFormatting}
              onClick={handleAutoFormatWithGemini}
              className="text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white px-3 py-1 rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Analyze paper structure, subject sequence, and extract answers automatically with Gemini AI"
            >
              <span>{isGeminiFormatting ? '✨ Analyzing...' : '✨ Gemini Auto-Format'}</span>
            </button>

            {/* Toggle Side-by-Side PDF Preview button */}
            <button
              type="button"
              onClick={() => setShowPdfSidebar((prev) => !prev)}
              className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded border border-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Toggle Side-by-Side PDF viewer"
            >
              <span>{showPdfSidebar ? '◧ Hide PDF' : '◫ PDF Side-by-Side'}</span>
              {pdfPreviewUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 pt-2 gap-2 text-xs font-bold flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-3 border-b-2 cursor-pointer transition-all ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            1. Test Details &amp; PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`pb-2 px-3 border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'subjects'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            2. Shuffle Subjects ({subjectOrder.map((s) => s.name[0]).join('→')})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('answers')}
            className={`pb-2 px-3 border-b-2 cursor-pointer transition-all ${
              activeTab === 'answers'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            3. Answer Key ({Object.keys(answerKey).length}/{totalQuestions})
          </button>
        </div>

        {/* Gemini AI Success / Progress Banner */}
        {geminiNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between flex-shrink-0 animate-fade-in">
            <span className="flex items-center gap-1.5">{geminiNotice}</span>
            <button
              type="button"
              onClick={() => setGeminiNotice(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Split Container: Left = Form / Right = Side-by-Side Live PDF Viewer */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column: Form Controls */}
          <div className="flex-1 min-w-[320px] flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 font-medium text-xs">
                    {error}
                  </div>
                )}

                {/* TAB 1: DETAILS & PDF */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Test Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. JEE Main 2026 Session 1 - Full Syllabus"
                        className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                          Duration (Minutes)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={600}
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value, 10) || 180)}
                          className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                        />
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">Standard JEE Main: 180 mins (3 hours)</span>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                          Maximum Marks (Auto-calculated)
                        </label>
                        <div className="w-full p-2 border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 rounded text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center justify-between">
                          <span>{autoTotalMarks} Marks</span>
                          <span className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                            ({totalQuestions} Qs × {markingCorrect} marks)
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">Auto-set from questions count &amp; marking scheme</span>
                      </div>
                    </div>

                    {/* Google Gemini AI Auto-Formatting Banner */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-900 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <span>✨ Google Gemini AI Auto-Formatting</span>
                          <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                            Fast &amp; Accurate
                          </span>
                        </div>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                          Let Gemini analyze your PDF to auto-detect title, subject order (Chem/Phy/Math), and extract answers!
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!pdfPreviewUrl || isGeminiFormatting}
                        onClick={handleAutoFormatWithGemini}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs flex-shrink-0"
                      >
                        {isGeminiFormatting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Analyzing Paper...</span>
                          </>
                        ) : (
                          <>
                            <span>🪄 Auto-Format Paper with Gemini AI</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* PDF Upload */}
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">
                        Question Paper PDF {!isEditing && <span className="text-red-500">*</span>}
                      </label>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-blue-500 rounded-lg p-5 text-center cursor-pointer transition-all bg-gray-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setPdfFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <UploadIcon className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-1" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block mb-0.5">
                          {pdfFile
                            ? pdfFile.name
                            : isEditing
                            ? `Keep existing: ${testToEdit?.pdfFileName || 'Current PDF'}`
                            : 'Click to select Question Paper PDF'}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400">
                          {pdfFile
                            ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Preview active on right side`
                            : 'Standard PDF format • Live preview opens automatically'}
                        </span>
                      </div>
                    </div>

                    {/* PDF Page Range Selection */}
                    <div className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wide">
                          Page Range for Students (1 to N)
                        </span>
                        <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                          Active: Page {pdfStartPage} to {pdfEndPage || (totalPdfPages ? `${totalPdfPages} (All)` : 'End')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-2.5 rounded border border-gray-200 dark:border-slate-800">
                        <div>
                          <label className="block font-bold text-gray-700 dark:text-slate-300 text-[11px] mb-0.5">
                            Start Page
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={pdfStartPage}
                            onChange={(e) => {
                              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setPdfStartPage(v);
                              setPreviewPage(v);
                            }}
                            className="w-full p-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded text-xs focus:ring-1 focus:ring-blue-500"
                            placeholder="1"
                          />
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">Default: 1</span>
                        </div>

                        <div>
                          <label className="block font-bold text-gray-700 dark:text-slate-300 text-[11px] mb-0.5">
                            End Page (N)
                          </label>
                          <input
                            type="number"
                            min={pdfStartPage}
                            value={pdfEndPage || ''}
                            onChange={(e) => {
                              const v = e.target.value ? parseInt(e.target.value, 10) : undefined;
                              setPdfEndPage(v);
                            }}
                            className="w-full p-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded text-xs focus:ring-1 focus:ring-blue-500"
                            placeholder={totalPdfPages ? `${totalPdfPages} (All)` : 'All pages (N)'}
                          />
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">Leave blank for all pages</span>
                        </div>
                      </div>
                    </div>

                    {/* Publication Status */}
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-slate-300 mb-1">Publish Status</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="published"
                            checked={status === 'published'}
                            onChange={() => setStatus('published')}
                          />
                          <span className="font-semibold text-green-700 dark:text-green-400">Published (Visible to students)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            value="draft"
                            checked={status === 'draft'}
                            onChange={() => setStatus('draft')}
                          />
                          <span className="font-semibold text-gray-600 dark:text-slate-400">Draft (Hidden)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: SUBJECT SHUFFLING & MARKING */}
                {activeTab === 'subjects' && (
                  <div className="space-y-4">
                    {/* Subject Shuffling Box */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                            <span>🔀 Subject Sequence &amp; Shuffling</span>
                          </h3>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400">
                            Reorder to match the PDF question paper sequence (e.g. Chemistry first, Physics first, etc.)
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded self-start sm:self-auto border border-blue-200 dark:border-blue-900">
                          Total: {totalQuestions} Questions
                        </span>
                      </div>

                      {/* Quick Preset Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-gray-600 dark:text-slate-400 mr-1">Quick Presets:</span>
                        <button
                          type="button"
                          onClick={() => applyPresetOrder('cpm')}
                          className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          🧪 Chemistry → ⚡ Physics → 📐 Math
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetOrder('pcm')}
                          className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          ⚡ Physics → 🧪 Chemistry → 📐 Math
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPresetOrder('mpc')}
                          className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 rounded shadow-2xs transition-colors cursor-pointer"
                        >
                          📐 Math → ⚡ Physics → 🧪 Chemistry
                        </button>
                      </div>

                      {/* Interactive Reorder Cards */}
                      <div className="space-y-2 pt-1">
                        {subjects.map((sub, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === subjects.length - 1;
                          const intCount = sub.totalQuestions >= 30 ? 10 : 5;
                          const intStart = sub.endQuestion - intCount + 1;

                          return (
                            <div
                              key={sub.id}
                              className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-300 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-400 dark:hover:border-blue-500 transition-all"
                            >
                              {/* Left: Position & Subject Info */}
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>{sub.name}</span>
                                    <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                                      Q. {sub.startQuestion} to {sub.endQuestion}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                    <span>MCQs: Q.{sub.startQuestion}–{intStart - 1}</span>
                                    <span>•</span>
                                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                      Integers: Q.{intStart}–{sub.endQuestion}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Question Count & Move Up / Down Buttons */}
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Questions:</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={sub.totalQuestions}
                                    onChange={(e) =>
                                      handleUpdateSubjectCount(sub.id, parseInt(e.target.value, 10) || 25)
                                    }
                                    className="w-16 p-1 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded text-xs text-center font-bold"
                                  />
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={isFirst}
                                    onClick={() => handleMoveSubject(idx, 'up')}
                                    title="Move Up"
                                    className="p-1.5 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-gray-700 dark:text-slate-200"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isLast}
                                    onClick={() => handleMoveSubject(idx, 'down')}
                                    title="Move Down"
                                    className="p-1.5 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-gray-700 dark:text-slate-200"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Marking Scheme */}
                    <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-200 dark:border-slate-800">
                      <h3 className="font-bold text-gray-800 dark:text-slate-200 text-xs sm:text-sm mb-3">
                        Marking Scheme Configuration
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                            Correct Answer Marks (+)
                          </label>
                          <input
                            type="number"
                            value={markingCorrect}
                            onChange={(e) => setMarkingCorrect(parseInt(e.target.value, 10) || 4)}
                            className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded text-xs"
                          />
                          <span className="text-[10px] text-gray-500 dark:text-slate-400">Default: +4</span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                            Incorrect Answer Marks (-)
                          </label>
                          <input
                            type="number"
                            value={markingIncorrect}
                            onChange={(e) => setMarkingIncorrect(parseInt(e.target.value, 10) || -1)}
                            className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded text-xs"
                          />
                          <span className="text-[10px] text-gray-500 dark:text-slate-400">Default: -1</span>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-1">
                            Unattempted Marks
                          </label>
                          <input
                            type="number"
                            value={markingUnattempted}
                            onChange={(e) => setMarkingUnattempted(parseInt(e.target.value, 10) || 0)}
                            className="w-full p-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded text-xs"
                          />
                          <span className="text-[10px] text-gray-500 dark:text-slate-400">Default: 0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ANSWER KEY */}
                {activeTab === 'answers' && (
                  <div className="space-y-3">
                    {pdfPreviewUrl && (
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Question Paper:</span>
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {pdfFile?.name || testToEdit?.pdfFileName || 'PDF Attached'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={handleAutoFormatWithGemini}
                            disabled={isGeminiFormatting}
                            className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            {isGeminiFormatting ? '✨ Extracting with AI...' : '✨ Extract Key with Gemini AI'}
                          </button>
                          <button
                            type="button"
                            onClick={handleScanPdfForAnswers}
                            disabled={isScanningPdf}
                            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            🔍 {isScanningPdf ? 'Scanning...' : 'In-Browser Scan'}
                          </button>
                        </div>
                      </div>
                    )}

                    {scanStatus && (
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-semibold">
                        {scanStatus}
                      </div>
                    )}

                    <AnswerKeyEditor
                      subjects={subjects}
                      answerKey={answerKey}
                      onChangeAnswerKey={(newKey) => setAnswerKey(newKey)}
                      integerQuestions={computedIntegerQuestions}
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex items-center justify-between flex-shrink-0">
                <div>
                  {activeTab !== 'details' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'answers') setActiveTab('subjects');
                        else if (activeTab === 'subjects') setActiveTab('details');
                      }}
                      className="px-3 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium text-xs cursor-pointer rounded"
                    >
                      ← Previous Step
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium text-xs cursor-pointer rounded"
                  >
                    Cancel
                  </button>

                  {activeTab !== 'answers' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'details') {
                          if (!title.trim()) {
                            setError('Please provide a test title.');
                            return;
                          }
                          if (!isEditing && !pdfFile) {
                            setError('Please upload a question paper PDF.');
                            return;
                          }
                          setError(null);
                          setActiveTab('subjects');
                        } else if (activeTab === 'subjects') {
                          setActiveTab('answers');
                        }
                      }}
                      className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs cursor-pointer"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      {isSubmitting
                        ? 'Saving...'
                        : isEditing
                        ? 'Update Test'
                        : 'Publish JEE Mock Test'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Live PDF Preview Side-by-Side Panel */}
          {showPdfSidebar && (
            <div className="w-[46%] lg:w-[48%] border-l border-gray-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden">
              {/* PDF Toolbar */}
              <div className="p-2 bg-slate-800 dark:bg-slate-900 text-white flex items-center justify-between text-xs flex-shrink-0 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    📄 Live PDF Preview
                  </span>
                  {totalPdfPages && (
                    <span className="text-[11px] text-slate-300">
                      ({totalPdfPages} pages)
                    </span>
                  )}
                </div>

                {pdfPreviewUrl && (
                  <div className="flex items-center gap-1.5">
                    {/* Previous Page */}
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage <= 1}
                      title="Previous Page"
                      className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded text-xs font-bold cursor-pointer"
                    >
                      ‹ Prev
                    </button>

                    {/* Page Jump Input */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span>Page</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPdfPages || 999}
                        value={previewPage}
                        onChange={(e) =>
                          setPreviewPage(Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="w-11 px-1 py-0.5 bg-slate-900 text-white rounded border border-slate-600 text-center font-bold text-xs"
                      />
                      <span>/ {totalPdfPages || 'N'}</span>
                    </div>

                    {/* Next Page */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPage((p) =>
                          totalPdfPages ? Math.min(totalPdfPages, p + 1) : p + 1
                        )
                      }
                      disabled={totalPdfPages ? previewPage >= totalPdfPages : false}
                      title="Next Page"
                      className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded text-xs font-bold cursor-pointer"
                    >
                      Next ›
                    </button>

                    {/* Quick Button: Set as Start Page */}
                    <button
                      type="button"
                      onClick={() => setPdfStartPage(previewPage)}
                      title="Set current preview page as Question Paper Start Page"
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-[11px] font-semibold text-white ml-1 cursor-pointer"
                    >
                      Start={previewPage}
                    </button>

                    {/* Quick Button: Set as End Page */}
                    <button
                      type="button"
                      onClick={() => setPdfEndPage(previewPage)}
                      title="Set current preview page as Question Paper End Page"
                      className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-[11px] font-semibold text-white cursor-pointer"
                    >
                      End={previewPage}
                    </button>

                    {/* Open in New Tab */}
                    <a
                      href={pdfPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open full PDF in new tab"
                      className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-bold"
                    >
                      ↗
                    </a>
                  </div>
                )}
              </div>

              {/* PDF Preview Frame or Empty State */}
              <div className="flex-1 overflow-hidden relative bg-slate-200 dark:bg-slate-900 flex flex-col">
                {pdfPreviewUrl ? (
                  <iframe
                    key={`${pdfPreviewUrl}-${previewPage}`}
                    src={`${pdfPreviewUrl}#page=${previewPage}&toolbar=0&navpanes=0`}
                    className="w-full h-full border-none bg-white"
                    title="Question Paper Live Preview"
                  />
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-slate-400 hover:text-blue-600 cursor-pointer transition-colors bg-slate-50 dark:bg-slate-900/60 border-2 border-dashed border-slate-300 dark:border-slate-700 m-3 rounded-lg"
                  >
                    <UploadIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-2" />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-1">
                      No Question Paper PDF Loaded
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-3">
                      Select or drop a question paper PDF on the left. The live preview will appear right here side-by-side!
                    </p>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold">
                      Browse Question Paper PDF
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
