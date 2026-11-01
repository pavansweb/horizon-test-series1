'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Test, SubjectConfig, MarkingScheme } from '@/lib/types';
import { AnswerKeyEditor } from './AnswerKeyEditor';
import { UploadIcon, CheckIcon } from '@/components/icons/Icons';

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestSaved: () => void;
  testToEdit?: Test | null;
}

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

  // Default JEE subjects (25 each = 75 questions)
  const [physicsCount, setPhysicsCount] = useState<number>(25);
  const [chemistryCount, setChemistryCount] = useState<number>(25);
  const [mathCount, setMathCount] = useState<number>(25);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create preview object URL when local file is picked
  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (testToEdit?.pdfUrl) {
      setPdfPreviewUrl(testToEdit.pdfUrl);
    } else {
      setPdfPreviewUrl(null);
    }
  }, [pdfFile, testToEdit]);

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

      const pSub = testToEdit.subjects.find((s) => s.id === 'physics');
      const cSub = testToEdit.subjects.find((s) => s.id === 'chemistry');
      const mSub = testToEdit.subjects.find((s) => s.id === 'mathematics');

      if (pSub) setPhysicsCount(pSub.totalQuestions);
      if (cSub) setChemistryCount(cSub.totalQuestions);
      if (mSub) setMathCount(mSub.totalQuestions);
      setPdfFile(null);
    } else {
      // Defaults for new test
      setTitle('JEE (Main) Mock Test - Paper 1');
      setDuration(180);
      setPdfStartPage(1);
      setPdfEndPage(undefined);
      setPhysicsCount(25);
      setChemistryCount(25);
      setMathCount(25);
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

  // Build subject config dynamically from question counts
  const subjects: SubjectConfig[] = [
    {
      id: 'physics',
      name: 'Physics',
      startQuestion: 1,
      endQuestion: physicsCount,
      totalQuestions: physicsCount,
    },
    {
      id: 'chemistry',
      name: 'Chemistry',
      startQuestion: physicsCount + 1,
      endQuestion: physicsCount + chemistryCount,
      totalQuestions: chemistryCount,
    },
    {
      id: 'mathematics',
      name: 'Mathematics',
      startQuestion: physicsCount + chemistryCount + 1,
      endQuestion: physicsCount + chemistryCount + mathCount,
      totalQuestions: mathCount,
    },
  ];

  const totalQuestions = physicsCount + chemistryCount + mathCount;
  // Automatically calculate maximum marks based on question count & correct marking scheme
  const autoTotalMarks = totalQuestions * (Number(markingCorrect) || 4);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full border border-gray-300 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base sm:text-lg">
              {isEditing ? 'Edit Test Paper' : 'Upload & Configure JEE Mock Test'}
            </h2>
            <p className="text-xs text-blue-200">
              {isEditing ? `Modifying: ${testToEdit?.title}` : 'Drop PDF, select pages, and configure answer key'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-3 border-b-2 cursor-pointer transition-all ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            1. Test Details & PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`pb-2 px-3 border-b-2 cursor-pointer transition-all ${
              activeTab === 'subjects'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            2. Subjects & Marking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('answers')}
            className={`pb-2 px-3 border-b-2 cursor-pointer transition-all ${
              activeTab === 'answers'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            3. Answer Key ({Object.keys(answerKey).length}/{totalQuestions})
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* TAB 1: DETAILS & PDF */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Test Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026 Session 1 - Full Syllabus"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 180)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  />
                  <span className="text-[11px] text-gray-500">Standard JEE Main: 180 mins (3 hours)</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Maximum Marks (Auto-set)
                  </label>
                  <div className="w-full p-2 border border-blue-200 bg-blue-50/60 rounded text-xs sm:text-sm font-bold text-blue-900 flex items-center justify-between">
                    <span>{autoTotalMarks} Marks</span>
                    <span className="text-[11px] font-medium text-blue-700">
                      ({totalQuestions} Qs × {markingCorrect} marks)
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500">Auto-calculated based on question count & marking scheme</span>
                </div>
              </div>

              {/* PDF Upload */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Question Paper PDF {!isEditing && <span className="text-red-500">*</span>}
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg p-5 text-center cursor-pointer transition-all bg-gray-50 hover:bg-blue-50/40"
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
                  <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-blue-700 block mb-0.5">
                    {pdfFile
                      ? pdfFile.name
                      : isEditing
                      ? `Keep existing: ${testToEdit?.pdfFileName || 'Current PDF'}`
                      : 'Click to select Question Paper PDF'}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Standard PDF format'}
                  </span>
                </div>
              </div>

              {/* PDF Preview and Page Range Selection */}
              {pdfPreviewUrl && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      PDF Preview & Page Range Selection
                    </span>
                    <span className="text-[11px] text-blue-700 font-semibold">
                      Showing Page {pdfStartPage} to {pdfEndPage || 'End (N)'}
                    </span>
                  </div>

                  {/* Page Range Inputs */}
                  <div className="grid grid-cols-2 gap-3 bg-white p-2.5 rounded border border-gray-200">
                    <div>
                      <label className="block font-bold text-gray-700 text-[11px] mb-0.5">
                        Start Page
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={pdfStartPage}
                        onChange={(e) => setPdfStartPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        placeholder="1"
                      />
                      <span className="text-[10px] text-gray-400">Default: 1</span>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 text-[11px] mb-0.5">
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
                        className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        placeholder="All pages (N)"
                      />
                      <span className="text-[10px] text-gray-400">Leave blank for all pages</span>
                    </div>
                  </div>

                  {/* Compact PDF Preview Frame */}
                  <div className="border border-gray-300 rounded overflow-hidden h-44 bg-white relative">
                    <iframe
                      src={`${pdfPreviewUrl}#page=${pdfStartPage}&toolbar=0&navpanes=0`}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    />
                  </div>
                </div>
              )}

              {/* Publication Status */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Publish Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={status === 'published'}
                      onChange={() => setStatus('published')}
                    />
                    <span className="font-semibold text-green-700">Published (Visible to students)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={status === 'draft'}
                      onChange={() => setStatus('draft')}
                    />
                    <span className="font-semibold text-gray-600">Draft (Hidden)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBJECTS & MARKING */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-xs sm:text-sm">
                    Questions per Subject (Total: {totalQuestions})
                  </h3>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Max Marks: {autoTotalMarks}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Physics Questions
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={physicsCount}
                      onChange={(e) => setPhysicsCount(parseInt(e.target.value, 10) || 25)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-[10px] text-gray-500">Q. 1 to {physicsCount} (21-25 Integer)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Chemistry Questions
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={chemistryCount}
                      onChange={(e) => setChemistryCount(parseInt(e.target.value, 10) || 25)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-[10px] text-gray-500">
                      Q. {physicsCount + 1} to {physicsCount + chemistryCount} (45-50 Integer)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Mathematics Questions
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={mathCount}
                      onChange={(e) => setMathCount(parseInt(e.target.value, 10) || 25)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-[10px] text-gray-500">
                      Q. {physicsCount + chemistryCount + 1} to {totalQuestions} (70-75 Integer)
                    </span>
                  </div>
                </div>
              </div>

              {/* Marking Scheme */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-800 text-xs sm:text-sm mb-3">
                  Marking Scheme Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-green-700 mb-1">
                      Correct Answer Marks (+)
                    </label>
                    <input
                      type="number"
                      value={markingCorrect}
                      onChange={(e) => setMarkingCorrect(parseInt(e.target.value, 10) || 4)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-[10px] text-gray-500">Default: +4</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-red-600 mb-1">
                      Incorrect Answer Marks (-)
                    </label>
                    <input
                      type="number"
                      value={markingIncorrect}
                      onChange={(e) => setMarkingIncorrect(parseInt(e.target.value, 10) || -1)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-[10px] text-gray-500">Default: -1</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Unattempted Marks
                    </label>
                    <input
                      type="number"
                      value={markingUnattempted}
                      onChange={(e) => setMarkingUnattempted(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                    />
                    <span className="text-[10px] text-gray-500">Default: 0</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANSWER KEY */}
          {activeTab === 'answers' && (
            <AnswerKeyEditor
              subjects={subjects}
              answerKey={answerKey}
              onChangeAnswerKey={(newKey) => setAnswerKey(newKey)}
            />
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <div>
              {activeTab !== 'details' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'answers') setActiveTab('subjects');
                    else if (activeTab === 'subjects') setActiveTab('details');
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium text-xs cursor-pointer"
                >
                  ← Previous Step
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium text-xs cursor-pointer"
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
    </div>
  );
}
