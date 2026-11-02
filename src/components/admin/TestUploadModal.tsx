'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Test, SubjectConfig, TestQuestion, MarkingScheme } from '@/lib/types';
import { MathText } from '@/components/MathText';
import { UploadIcon, TrashIcon, EditIcon } from '@/components/icons/Icons';

interface TestUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestSaved: () => void;
  testToEdit?: Test | null;
}

export function TestUploadModal({
  isOpen,
  onClose,
  onTestSaved,
  testToEdit,
}: TestUploadModalProps) {
  const isEditing = !!testToEdit;

  // Step: 'upload' | 'processing' | 'preview'
  const [step, setStep] = useState<'upload' | 'processing' | 'preview'>(
    isEditing ? 'preview' : 'upload'
  );

  // Form state
  const [title, setTitle] = useState<string>('');
  const [duration, setDuration] = useState<number>(180);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [markingCorrect, setMarkingCorrect] = useState<number>(4);
  const [markingIncorrect, setMarkingIncorrect] = useState<number>(-1);
  const [markingUnattempted, setMarkingUnattempted] = useState<number>(0);

  // Extracted questions & structure
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [subjects, setSubjects] = useState<SubjectConfig[]>([
    { id: 'physics', name: 'Physics', startQuestion: 1, endQuestion: 25, totalQuestions: 25 },
    { id: 'chemistry', name: 'Chemistry', startQuestion: 26, endQuestion: 50, totalQuestions: 25 },
    { id: 'mathematics', name: 'Mathematics', startQuestion: 51, endQuestion: 75, totalQuestions: 25 },
  ]);
  const [answerKey, setAnswerKey] = useState<Record<number, string>>({});
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [pdfEndPage, setPdfEndPage] = useState<number | undefined>(undefined);
  const [integerQuestions, setIntegerQuestions] = useState<number[]>([]);

  // Preview tab & filter
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>('all');
  const [editingQuestionNumber, setEditingQuestionNumber] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formattingQNum, setFormattingQNum] = useState<number | null>(null);

  // Status & error messages
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize when opening
  useEffect(() => {
    if (testToEdit) {
      setTitle(testToEdit.title);
      setDuration(testToEdit.duration);
      setStatus(testToEdit.status);
      setQuestions(testToEdit.questions || []);
      setSubjects(testToEdit.subjects || []);
      setAnswerKey(testToEdit.answerKey || {});
      setPdfStartPage(testToEdit.pdfStartPage || 1);
      setPdfEndPage(testToEdit.pdfEndPage);
      setIntegerQuestions(testToEdit.integerQuestions || []);
      setMarkingCorrect(testToEdit.markingScheme?.correct ?? 4);
      setMarkingIncorrect(testToEdit.markingScheme?.incorrect ?? -1);
      setMarkingUnattempted(testToEdit.markingScheme?.unattempted ?? 0);
      setStep('preview');
    } else {
      setTitle('JEE Main 2026 Mock Test - Paper 1');
      setDuration(180);
      setStatus('published');
      setPdfFile(null);
      setQuestions([]);
      setAnswerKey({});
      setPdfStartPage(1);
      setPdfEndPage(undefined);
      setIntegerQuestions([]);
      setMarkingCorrect(4);
      setMarkingIncorrect(-1);
      setMarkingUnattempted(0);
      setStep('upload');
    }
    setError(null);
    setEditingQuestionNumber(null);
  }, [testToEdit, isOpen]);

  if (!isOpen) return null;

  // File drop / select handler
  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please upload a valid PDF file.');
      return;
    }
    setPdfFile(file);
    setError(null);

    // Auto-populate a clean title from filename if title is default
    const cleanName = file.name
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (!title || title === 'JEE Main 2026 Mock Test - Paper 1') {
      setTitle(cleanName);
    }
  };

  // Step 2: Trigger Gemini AI Question Paper Formatting
  const handleFormatWithAI = async () => {
    if (!pdfFile && !testToEdit?.pdfUrl) {
      setError('Please select a Question Paper PDF first.');
      return;
    }

    try {
      setStep('processing');
      setError(null);
      setProcessingStatus('Uploading question paper & contacting Gemini AI...');

      const formData = new FormData();
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      } else if (testToEdit?.pdfUrl) {
        formData.append('pdfUrl', testToEdit.pdfUrl);
      }

      setProcessingStatus('Gemini AI is reading PDF, extracting questions, formulas & answer keys...');

      const res = await fetch('/api/admin/gemini/parse-paper', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gemini AI failed to format this paper.');
      }

      const parsed = result.data;

      if (parsed.title) setTitle(parsed.title);
      if (parsed.durationMinutes) setDuration(parsed.durationMinutes);
      if (parsed.pdfStartPage) setPdfStartPage(parsed.pdfStartPage);
      if (parsed.pdfEndPage) setPdfEndPage(parsed.pdfEndPage);

      const effectiveSubjects: SubjectConfig[] =
        parsed.subjects && Array.isArray(parsed.subjects) && parsed.subjects.length > 0
          ? parsed.subjects
          : [
              { id: 'physics', name: 'Physics', startQuestion: 1, endQuestion: 25, totalQuestions: 25 },
              { id: 'chemistry', name: 'Chemistry', startQuestion: 26, endQuestion: 50, totalQuestions: 25 },
              { id: 'mathematics', name: 'Mathematics', startQuestion: 51, endQuestion: 75, totalQuestions: 25 },
            ];
      setSubjects(effectiveSubjects);

      const effectiveIntegerQuestions: number[] = Array.isArray(parsed.integerQuestions)
        ? parsed.integerQuestions.map(Number)
        : [21, 22, 23, 24, 25, 46, 47, 48, 49, 50, 71, 72, 73, 74, 75];
      setIntegerQuestions(effectiveIntegerQuestions);

      const mergedKey: Record<number, string> = {};
      if (parsed.answerKey && typeof parsed.answerKey === 'object') {
        Object.entries(parsed.answerKey).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            mergedKey[Number(k)] = String(v).toUpperCase().trim();
          }
        });
      }

      // Extracted structured questions from parallel AI engine
      if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        setQuestions(parsed.questions);
        const derivedKey: Record<number, string> = { ...mergedKey };
        parsed.questions.forEach((q: TestQuestion) => {
          if (q.questionNumber && q.correctAnswer) {
            derivedKey[q.questionNumber] = q.correctAnswer.toUpperCase().trim();
          }
        });
        setAnswerKey(derivedKey);
        setStep('preview');
        return;
      }

      // Check extracted questions fallback
      const parsedQuestions: TestQuestion[] = Array.isArray(parsed.questions) ? parsed.questions : [];
      const questionMap = new Map<number, TestQuestion>();
      parsedQuestions.forEach((q) => {
        if (q && q.questionNumber) {
          questionMap.set(q.questionNumber, q);
          if (q.correctAnswer && !mergedKey[q.questionNumber]) {
            mergedKey[q.questionNumber] = String(q.correctAnswer).toUpperCase().trim();
          }
        }
      });

      // Calculate total questions to ensure NO missing questions
      const totalFromSubjects = effectiveSubjects.reduce((sum, s) => sum + (s.totalQuestions || 25), 0);
      const totalFromKeys = Object.keys(mergedKey).length;
      const maxKeyNum = Object.keys(mergedKey).reduce((m, k) => Math.max(m, Number(k) || 0), 0);
      const totalCount = Math.max(totalFromSubjects, totalFromKeys, maxKeyNum, 75);

      const finalQuestions: TestQuestion[] = [];
      for (let q = 1; q <= totalCount; q++) {
        const sub =
          effectiveSubjects.find((s) => q >= s.startQuestion && q <= s.endQuestion) ||
          effectiveSubjects[0];
        const isInt =
          effectiveIntegerQuestions.includes(q) ||
          q % 25 > 20 ||
          q % 25 === 0;
        const key = mergedKey[q] || (isInt ? '0' : 'A');
        mergedKey[q] = key;

        if (questionMap.has(q)) {
          const existing = questionMap.get(q)!;
          finalQuestions.push({
            questionNumber: q,
            subjectId: existing.subjectId || sub.id,
            type: isInt ? 'numerical' : (existing.type || 'mcq'),
            questionText:
              existing.questionText && existing.questionText.trim().length > 5
                ? existing.questionText
                : `Question ${q} statement (refer to Question Paper PDF)`,
            options: isInt
              ? []
              : (existing.options && existing.options.length === 4
                  ? existing.options
                  : [
                      { id: 'A', text: 'Option A' },
                      { id: 'B', text: 'Option B' },
                      { id: 'C', text: 'Option C' },
                      { id: 'D', text: 'Option D' },
                    ]),
            correctAnswer: existing.correctAnswer || key,
            solution: existing.solution || '',
          });
        } else {
          finalQuestions.push({
            questionNumber: q,
            subjectId: sub.id,
            type: isInt ? 'numerical' : 'mcq',
            questionText: `Question ${q} statement (refer to Question Paper PDF)`,
            options: isInt
              ? []
              : [
                  { id: 'A', text: 'Option A' },
                  { id: 'B', text: 'Option B' },
                  { id: 'C', text: 'Option C' },
                  { id: 'D', text: 'Option D' },
                ],
            correctAnswer: key,
            solution: '',
          });
        }
      }

      setQuestions(finalQuestions);
      setAnswerKey(mergedKey);
      setStep('preview');
    } catch (err: unknown) {
      console.error('Gemini formatting error:', err);
      setError((err as Error)?.message || 'AI auto-formatting failed. Please try again.');
      setStep('upload');
    }
  };

  // Helper to generate placeholder questions if user wants to build without AI
  const handleGenerateManualPlaceholders = () => {
    const totalQ = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
    const list: TestQuestion[] = [];
    for (let q = 1; q <= totalQ; q++) {
      const sub = subjects.find((s) => q >= s.startQuestion && q <= s.endQuestion) || subjects[0];
      const isInt = integerQuestions.includes(q) || (q % 25 > 20 || q % 25 === 0);
      list.push({
        questionNumber: q,
        subjectId: sub.id,
        type: isInt ? 'numerical' : 'mcq',
        questionText: `Question ${q} text statement...`,
        options: isInt
          ? []
          : [
              { id: 'A', text: 'Option A' },
              { id: 'B', text: 'Option B' },
              { id: 'C', text: 'Option C' },
              { id: 'D', text: 'Option D' },
            ],
        correctAnswer: answerKey[q] || (isInt ? '0' : 'A'),
        solution: '',
      });
    }
    setQuestions(list);
    setStep('preview');
  };

  // Update a single question
  const handleUpdateQuestion = (qNum: number, updated: Partial<TestQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.questionNumber === qNum) {
          const merged = { ...q, ...updated };
          if (updated.correctAnswer !== undefined) {
            setAnswerKey((k) => ({ ...k, [qNum]: updated.correctAnswer! }));
          }
          return merged;
        }
        return q;
      })
    );
  };

  // Delete a question
  const handleDeleteQuestion = (qNum: number) => {
    setQuestions((prev) => prev.filter((q) => q.questionNumber !== qNum));
    setAnswerKey((prev) => {
      const copy = { ...prev };
      delete copy[qNum];
      return copy;
    });
  };

  // Add a new question
  const handleAddQuestion = () => {
    const nextQNum = questions.length > 0 ? Math.max(...questions.map((q) => q.questionNumber)) + 1 : 1;
    const sub = subjects[0] || { id: 'physics', name: 'Physics' };
    const newQ: TestQuestion = {
      questionNumber: nextQNum,
      subjectId: sub.id,
      type: 'mcq',
      questionText: `New Question ${nextQNum}`,
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' },
      ],
      correctAnswer: 'A',
      solution: '',
    };
    setQuestions((prev) => [...prev, newQ]);
    setEditingQuestionNumber(nextQNum);
  };

  // Step 4: Final Save & Publish
  const handleFinalPublish = async () => {
    if (!title.trim()) {
      setError('Please provide a test title.');
      return;
    }

    if (!isEditing && !pdfFile) {
      setError('Please provide a question paper PDF.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const markingScheme: MarkingScheme = {
        correct: Number(markingCorrect) || 4,
        incorrect: Number(markingIncorrect) || -1,
        unattempted: Number(markingUnattempted) || 0,
      };

      const totalQ = questions.length > 0
        ? questions.length
        : subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
      const totalMarks = totalQ * markingScheme.correct;

      if (isEditing && testToEdit) {
        // PUT update
        const res = await fetch(`/api/admin/tests/${testToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            duration: Number(duration),
            totalMarks,
            pdfStartPage: Number(pdfStartPage) || 1,
            pdfEndPage: pdfEndPage ? Number(pdfEndPage) : null,
            subjects,
            integerQuestions,
            questions: questions.length > 0 ? questions : undefined,
            markingScheme,
            answerKey,
            status,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update test paper.');
        }
      } else {
        // POST create with FormData
        const formData = new FormData();
        if (pdfFile) formData.append('pdf', pdfFile);
        formData.append('title', title);
        formData.append('duration', duration.toString());
        formData.append('totalMarks', totalMarks.toString());
        formData.append('pdfStartPage', (pdfStartPage || 1).toString());
        if (pdfEndPage) formData.append('pdfEndPage', pdfEndPage.toString());
        formData.append('subjects', JSON.stringify(subjects));
        formData.append('integerQuestions', JSON.stringify(integerQuestions));
        formData.append('markingScheme', JSON.stringify(markingScheme));
        formData.append('answerKey', JSON.stringify(answerKey));
        if (questions.length > 0) {
          formData.append('questions', JSON.stringify(questions));
        }
        formData.append('status', status);

        const res = await fetch('/api/admin/tests', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create test paper.');
        }
      }

      onTestSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Save test error:', err);
      setError((err as Error)?.message || 'Failed to save test paper.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single question AI auto-formatter
  const handleFormatSingleQuestionWithAi = async (qNum: number) => {
    const target = questions.find((q) => q.questionNumber === qNum);
    if (!target) return;
    try {
      setFormattingQNum(qNum);
      const res = await fetch('/api/admin/gemini/parse-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'format-single-question',
          question: target,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.question) {
        handleUpdateQuestion(qNum, data.question);
      }
    } catch (err) {
      console.warn('AI question formatting error:', err);
    } finally {
      setFormattingQNum(null);
    }
  };

  // Filtered questions for preview (subject filter + search query)
  const filteredQuestions = questions.filter((q) => {
    if (activeSubjectFilter !== 'all' && q.subjectId.toLowerCase() !== activeSubjectFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const qText = (q.questionText || '').toLowerCase();
      const qNumStr = String(q.questionNumber);
      const optTexts = (q.options || []).map((o) => o.text.toLowerCase()).join(' ');
      const query = searchQuery.trim().toLowerCase();
      return qNumStr === query || qText.includes(query) || optTexts.includes(query);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="bg-[#1e3a8a] dark:bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shadow-xs">
              📄
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base leading-tight">
                {isEditing ? 'Edit Test Paper' : 'Upload & Format Question Paper'}
              </h2>
              <p className="text-[11px] text-blue-200 dark:text-slate-400">
                {step === 'upload' && 'Step 1: Upload Question Paper PDF'}
                {step === 'processing' && 'Step 2: Formatting with Gemini AI...'}
                {step === 'preview' && 'Step 3: Preview Questions & Publish'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-base font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-800 px-4 py-2 text-xs text-red-700 dark:text-red-300 font-medium flex items-center justify-between shrink-0">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-700 dark:text-red-300 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: SIMPLE UPLOAD FORM                                                */}
        {/* ========================================================================= */}
        {step === 'upload' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Title & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Examination / Paper Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026 Full Syllabus Mock Test"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Duration (Minutes):
                </label>
                <input
                  type="number"
                  min={10}
                  max={360}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10) || 180)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center"
                />
              </div>
            </div>

            {/* Drag & Drop PDF Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                pdfFile
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 hover:border-blue-500 hover:bg-blue-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {pdfFile ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-2xl font-bold shadow-xs">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-base text-slate-900 dark:text-slate-100">
                      {pdfFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB PDF selected • Ready to format
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                  >
                    Click to change PDF
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <UploadIcon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                      Click to Browse or Drag &amp; Drop Question Paper PDF
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Upload any standard JEE Main question paper PDF. Gemini AI will automatically extract and format each question.
                    </p>
                  </div>
                  <span className="px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs">
                    Browse File
                  </span>
                </>
              )}
            </div>

            {/* Big Action Button */}
            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleFormatWithAI}
                disabled={!pdfFile}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 hover:from-blue-800 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2.5 transition-all transform active:scale-98"
              >
                <span>✨ Format with Gemini AI &amp; Break Down Questions</span>
                <span>→</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateManualPlaceholders}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer underline"
              >
                Or enter questions manually without AI
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: AI PROCESSING / LOADING                                           */}
        {/* ========================================================================= */}
        {step === 'processing' && (
          <div className="p-16 flex flex-col items-center justify-center text-center space-y-4 flex-1">
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                ✨ Formatting Question Paper with Gemini AI
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {processingStatus}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300 max-w-sm">
              Extracting Physics, Chemistry &amp; Mathematics sections, mathematical equations, option choices, and answer keys.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: QUESTION BREAKDOWN & PREVIEW                                      */}
        {/* ========================================================================= */}
        {step === 'preview' && (
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Summary Bar */}
            <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {questions.length} Questions Extracted
                </span>
                <span className="text-slate-400">•</span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded font-bold">
                  Physics: {questions.filter((q) => q.subjectId === 'physics').length}
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-bold">
                  Chemistry: {questions.filter((q) => q.subjectId === 'chemistry').length}
                </span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded font-bold">
                  Math: {questions.filter((q) => q.subjectId === 'mathematics').length}
                </span>
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-bold">
                  Keys: {Object.keys(answerKey).length}/{questions.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-bold text-xs cursor-pointer"
                >
                  ➕ Add Question
                </button>
              </div>
            </div>

            {/* Subject Filter Pills & Quick Search */}
            <div className="px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Filter Subject:</span>
                {['all', 'physics', 'chemistry', 'mathematics'].map((subId) => {
                  const count = subId === 'all'
                    ? questions.length
                    : questions.filter((q) => q.subjectId.toLowerCase() === subId).length;
                  const label = subId === 'all' ? 'All Questions' : subId.charAt(0).toUpperCase() + subId.slice(1);
                  const isActive = activeSubjectFilter === subId;

                  return (
                    <button
                      key={subId}
                      type="button"
                      onClick={() => setActiveSubjectFilter(subId)}
                      className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Quick Search */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Search Q# or formula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {filteredQuestions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <div className="text-2xl">🔍</div>
                  <p className="font-semibold text-sm">No questions in this section.</p>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isEditingThis = editingQuestionNumber === q.questionNumber;
                  const isNumerical = q.type === 'numerical';

                  return (
                    <div
                      key={q.questionNumber}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      {/* Question Top Row: Q Number, Subject, Type, Key, Edit, Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-blue-900 dark:text-blue-400">
                            Question {q.questionNumber}
                          </span>
                          <span className="text-[11px] font-bold uppercase bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                            {q.subjectId}
                          </span>
                          <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                            {isNumerical ? 'Section B (Numerical)' : 'Section A (MCQ)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Key: {q.correctAnswer ? `(${q.correctAnswer})` : 'Not Set'}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingQuestionNumber(isEditingThis ? null : q.questionNumber)
                            }
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Edit question statement or options"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.questionNumber)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/60 rounded text-red-600 dark:text-red-400 cursor-pointer"
                            title="Delete question"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Statement Preview or Editor */}
                      {isEditingThis ? (
                        <div className="space-y-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                              Question Statement (LaTeX supported with $...$):
                            </label>
                            <textarea
                              rows={3}
                              value={q.questionText}
                              onChange={(e) =>
                                handleUpdateQuestion(q.questionNumber, { questionText: e.target.value })
                              }
                              className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-sans leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Subject:
                              </label>
                              <select
                                value={q.subjectId}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.questionNumber, { subjectId: e.target.value })
                                }
                                className="w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                              >
                                <option value="physics">Physics</option>
                                <option value="chemistry">Chemistry</option>
                                <option value="mathematics">Mathematics</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Correct Answer:
                              </label>
                              <input
                                type="text"
                                value={q.correctAnswer || ''}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.questionNumber, {
                                    correctAnswer: e.target.value.toUpperCase().trim(),
                                  })
                                }
                                placeholder="A, B, C, D or numerical e.g. 15"
                                className="w-full p-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold"
                              />
                            </div>
                          </div>

                          {/* Options Editor */}
                          {!isNumerical && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                                MCQ Options (A, B, C, D):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(['A', 'B', 'C', 'D'] as const).map((optId) => {
                                  const optObj = q.options?.find((o) => o.id.toUpperCase() === optId);
                                  return (
                                    <div key={optId} className="flex items-center gap-1.5 text-xs">
                                      <span className="font-bold text-slate-600 dark:text-slate-400 w-5">
                                        ({optId})
                                      </span>
                                      <input
                                        type="text"
                                        value={optObj?.text || ''}
                                        onChange={(e) => {
                                          const currentOpts = q.options ? [...q.options] : [];
                                          const idx = currentOpts.findIndex((o) => o.id === optId);
                                          if (idx >= 0) currentOpts[idx] = { ...currentOpts[idx], text: e.target.value };
                                          else currentOpts.push({ id: optId, text: e.target.value });
                                          handleUpdateQuestion(q.questionNumber, { options: currentOpts });
                                        }}
                                        placeholder={`Option ${optId} text`}
                                        className="flex-1 p-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Live KaTeX Preview Box */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                              Live KaTeX Math &amp; Formula Preview:
                            </span>
                            <MathText
                              content={q.questionText || 'Enter question statement above to preview math...'}
                              className="text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingQuestionNumber(null)}
                              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                              ✓ Done Editing
                            </button>

                            <button
                              type="button"
                              disabled={formattingQNum === q.questionNumber}
                              onClick={() => handleFormatSingleQuestionWithAi(q.questionNumber)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                              title="Uses Gemini AI to clean up LaTeX math formatting, equations, and units"
                            >
                              {formattingQNum === q.questionNumber ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Formatting Math...</span>
                                </>
                              ) : (
                                <>
                                  <span>✨ Auto-Format Math (AI)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-relaxed">
                            <MathText content={q.questionText} />
                          </div>

                          {/* Options grid */}
                          {!isNumerical && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                              {q.options.map((opt) => {
                                const isKey = (q.correctAnswer || '').toUpperCase() === opt.id.toUpperCase();
                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                                      isKey
                                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <span className="font-bold shrink-0">({opt.id})</span>
                                    <div className="flex-1">
                                      <MathText content={opt.text} />
                                    </div>
                                    {isKey && (
                                      <span className="text-emerald-600 font-bold shrink-0 text-[10px]">
                                        ✓ Correct Key
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Solution if available */}
                          {q.solution && (
                            <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                              <span className="font-bold block mb-0.5">💡 Solution / Explanation:</span>
                              <MathText content={q.solution} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-bold text-xs cursor-pointer"
              >
                ← Back / Re-upload PDF
              </button>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Status:</span>
                  <button
                    type="button"
                    onClick={() => setStatus((prev) => (prev === 'published' ? 'draft' : 'published'))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      status === 'published'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {status === 'published' ? '● Published' : '○ Draft'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleFinalPublish}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Paper...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Save Changes' : 'Publish Test Paper'}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
