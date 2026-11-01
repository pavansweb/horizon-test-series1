'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SubjectConfig, isIntegerQuestion } from '@/lib/types';
import {
  parseUniversalAnswerKey,
  generateAnswerKeyCsv,
  ParseResult,
} from '@/lib/answerKeyParser';
import {
  RotateCcwIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/icons/Icons';

interface AnswerKeyEditorProps {
  subjects: SubjectConfig[];
  answerKey: Record<number, string>;
  onChangeAnswerKey: (updatedKey: Record<number, string>) => void;
  integerQuestions?: number[];
}

export function AnswerKeyEditor({
  subjects,
  answerKey,
  onChangeAnswerKey,
  integerQuestions,
}: AnswerKeyEditorProps) {
  // Navigation modes
  const [editorMode, setEditorMode] = useState<'smart_paste' | 'speed_tagger' | 'matrix'>('smart_paste');

  // Smart Paste state
  const [bulkText, setBulkText] = useState<string>('');
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Speed-Tagger state
  const [taggerQ, setTaggerQ] = useState<number>(1);
  const taggerInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  // Matrix tab state
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>(
    subjects[0]?.id || 'physics'
  );

  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  // Live parse result as user types or pastes in Smart Paste
  const liveParseResult: ParseResult = useMemo(() => {
    return parseUniversalAnswerKey(bulkText, totalQuestions, integerQuestions);
  }, [bulkText, totalQuestions, integerQuestions]);

  // Handle applying parsed result
  const handleApplyParsed = () => {
    if (liveParseResult.filledCount === 0) return;
    const merged = { ...answerKey, ...liveParseResult.answerKey };
    onChangeAnswerKey(merged);
    setAppliedNotice(
      `Applied ${liveParseResult.filledCount} answers successfully (${liveParseResult.detectedFormat})!`
    );
    setBulkText('');
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  // Download CSV Template
  const handleDownloadCsv = () => {
    const csvContent = generateAnswerKeyCsv(totalQuestions, answerKey, integerQuestions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jee_answer_key_template_${totalQuestions}q.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file upload (CSV or text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkText(content);
        setEditorMode('smart_paste');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Speed Tagger: Handle keyboard shortcuts
  useEffect(() => {
    if (editorMode !== 'speed_tagger') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is in an outside input
      const target = e.target as HTMLElement;
      const isInteger = isIntegerQuestion(taggerQ, integerQuestions);

      if (isInteger) {
        // If integer, let normal typing happen in input, handle Enter to advance
        if (e.key === 'Enter') {
          e.preventDefault();
          if (taggerQ < totalQuestions) {
            setTaggerQ((prev) => prev + 1);
          }
        }
        return;
      }

      // If in a general text field other than tagger
      if (target && target.tagName === 'INPUT' && target !== taggerInputRef.current) {
        return;
      }

      const key = e.key.toUpperCase();
      let selectedOption: string | null = null;

      if (key === 'A' || key === '1') selectedOption = 'A';
      else if (key === 'B' || key === '2') selectedOption = 'B';
      else if (key === 'C' || key === '3') selectedOption = 'C';
      else if (key === 'D' || key === '4') selectedOption = 'D';

      if (selectedOption) {
        e.preventDefault();
        const updated = { ...answerKey, [taggerQ]: selectedOption };
        onChangeAnswerKey(updated);
        if (taggerQ < totalQuestions) {
          setTaggerQ((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (taggerQ < totalQuestions) setTaggerQ((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (taggerQ > 1) setTaggerQ((prev) => prev - 1);
      } else if (e.key === 'Backspace' && !isInteger) {
        e.preventDefault();
        const updated = { ...answerKey };
        delete updated[taggerQ];
        onChangeAnswerKey(updated);
        if (taggerQ > 1) setTaggerQ((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorMode, taggerQ, totalQuestions, answerKey, integerQuestions, onChangeAnswerKey]);

  // Focus integer input in Speed-Tagger when question changes
  useEffect(() => {
    if (editorMode === 'speed_tagger' && isIntegerQuestion(taggerQ, integerQuestions)) {
      taggerInputRef.current?.focus();
    }
  }, [taggerQ, editorMode, integerQuestions]);

  // Set single question in matrix
  const handleSetOption = (qNum: number, opt: string) => {
    const current = answerKey[qNum];
    const newKey = { ...answerKey };
    if (current === opt) {
      delete newKey[qNum];
    } else {
      newKey[qNum] = opt;
    }
    onChangeAnswerKey(newKey);
  };

  const handleSetNumeric = (qNum: number, value: string) => {
    const newKey = { ...answerKey };
    const trimmed = value.trim();
    if (trimmed === '') {
      delete newKey[qNum];
    } else {
      newKey[qNum] = trimmed;
    }
    onChangeAnswerKey(newKey);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all configured answers?')) {
      onChangeAnswerKey({});
      setBulkText('');
      setAppliedNotice(null);
    }
  };

  // Find subject for given question number
  const getSubjectForQ = (q: number) => {
    return (
      subjects.find((s) => q >= s.startQuestion && q <= s.endQuestion) ||
      subjects[0] || { id: 'general', name: 'General' }
    );
  };

  const currentSubject = subjects.find((s) => s.id === activeSubjectTab) || subjects[0];
  const subjectQuestions: number[] = [];
  if (currentSubject) {
    for (let q = currentSubject.startQuestion; q <= currentSubject.endQuestion; q++) {
      subjectQuestions.push(q);
    }
  }

  const filledAnswersCount = Object.keys(answerKey).filter(
    (k) => parseInt(k, 10) <= totalQuestions && !!answerKey[parseInt(k, 10)]
  ).length;

  const taggerSubject = getSubjectForQ(taggerQ);
  const taggerIsInt = isIntegerQuestion(taggerQ, integerQuestions);
  const taggerCurrentVal = answerKey[taggerQ] || '';

  return (
    <div className="space-y-3 select-none">
      {/* Top Workflow Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-800">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setEditorMode('smart_paste')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              editorMode === 'smart_paste'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ⚡ Smart Universal Paste
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('speed_tagger')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              editorMode === 'speed_tagger'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ⌨️ Speed-Tagger (Rapid Entry)
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('matrix')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              editorMode === 'matrix'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            📊 Grid Overview
          </button>
        </div>

        {/* Global Progress & Utility Controls */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded border ${
              filledAnswersCount === totalQuestions
                ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
          >
            {filledAnswersCount} / {totalQuestions} Keyed ({Math.round((filledAnswersCount / totalQuestions) * 100)}%)
          </span>

          {/* Hidden File Input for CSV upload */}
          <input
            type="file"
            ref={fileUploadRef}
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileUploadRef.current?.click()}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold rounded cursor-pointer transition-colors shadow-2xs"
            title="Upload CSV or text file"
          >
            📤 Upload CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[11px] font-semibold rounded cursor-pointer transition-colors shadow-2xs"
            title="Download blank or current CSV template"
          >
            📥 Template
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 cursor-pointer ml-1"
            title="Clear all answer keys"
          >
            <RotateCcwIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MODE 1: SMART UNIVERSAL PASTE */}
      {editorMode === 'smart_paste' && (
        <div className="p-3 bg-blue-50/70 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-blue-950 dark:text-blue-300 uppercase tracking-wide">
                Universal Multi-Format Smart Paste
              </span>
              <p className="text-[11px] text-blue-700 dark:text-slate-400">
                Paste copied tables from PDFs, websites, WhatsApp, or Excel. Multi-column tables &amp; (1)-(4) options are auto-detected.
              </p>
            </div>
            {liveParseResult.filledCount > 0 && (
              <span className="text-[11px] font-bold bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-300 dark:border-slate-700">
                Format: {liveParseResult.detectedFormat} | {liveParseResult.filledCount} Parsed
              </span>
            )}
          </div>

          <textarea
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Paste ANY format here, e.g.:\n- Multi-column: 1 A 26 B 51 C ...\n- Numbered: 1: (2), 2: (4), 21: 15 ...\n- Excel: Copy columns directly and paste\n- Sequence: A B C D A B C ...`}
            className="w-full text-xs font-mono p-2.5 border border-blue-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-inner"
          />

          {/* Quick Format Help Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-blue-900 dark:text-blue-300">Try Quick Examples:</span>
            <button
              type="button"
              onClick={() =>
                setBulkText(
                  '1 A 26 B 51 C\n2 B 27 C 52 D\n3 C 28 A 53 A\n21 5 45 12 70 -2.5'
                )
              }
              className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded border border-blue-200 dark:border-slate-700 text-blue-800 dark:text-blue-300 cursor-pointer"
            >
              Multi-column Table
            </button>
            <button
              type="button"
              onClick={() =>
                setBulkText(
                  '1: (1), 2: (3), 3: (2), 4: (4), 21: 45, 22: -1.5'
                )
              }
              className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded border border-blue-200 dark:border-slate-700 text-blue-800 dark:text-blue-300 cursor-pointer"
            >
              Option Numbers: (1), (2), (3), (4)
            </button>
            <button
              type="button"
              onClick={() =>
                setBulkText(
                  Array.from({ length: totalQuestions }, (_, i) => {
                    const q = i + 1;
                    return isIntegerQuestion(q, integerQuestions)
                      ? `${q}: ${q * 2}`
                      : `${q}: ${['A', 'B', 'C', 'D'][i % 4]}`;
                  }).join(', ')
                )
              }
              className="px-1.5 py-0.5 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded border border-blue-200 dark:border-slate-700 text-blue-800 dark:text-blue-300 cursor-pointer"
            >
              Fill All {totalQuestions}
            </button>
          </div>

          {/* Live Preview Chips */}
          {liveParseResult.filledCount > 0 && (
            <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Live Preview (First 8 parsed):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(liveParseResult.answerKey)
                  .slice(0, 8)
                  .map(([q, val]) => (
                    <span
                      key={q}
                      className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200"
                    >
                      <strong>Q.{q}:</strong> {val}
                    </span>
                  ))}
                {liveParseResult.filledCount > 8 && (
                  <span className="text-slate-400 dark:text-slate-500 text-[11px] self-center">
                    +{liveParseResult.filledCount - 8} more...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleApplyParsed}
              disabled={liveParseResult.filledCount === 0}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />
              Apply {liveParseResult.filledCount} Parsed Answers to Test
            </button>

            {appliedNotice && (
              <span className="text-xs font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/80 px-2 py-1 rounded border border-green-200 dark:border-green-800">
                {appliedNotice}
              </span>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: SPEED-TAGGER (ZERO-MOUSE RAPID KEYBOARD ENTRY) */}
      {editorMode === 'speed_tagger' && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30 border border-blue-200 dark:border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-blue-200 dark:border-slate-800 pb-2">
            <div>
              <span className="text-xs font-extrabold text-blue-950 dark:text-blue-300 uppercase tracking-wide">
                Speed-Tagger: Rapid Keyboard Entry Mode
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Type directly on your keyboard to instantly tag answers &amp; auto-advance. Zero mouse required!
              </p>
            </div>
            {/* Quick Question Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jump:</span>
              <select
                value={taggerQ}
                onChange={(e) => setTaggerQ(parseInt(e.target.value, 10))}
                className="text-xs p-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
              >
                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => (
                  <option key={q} value={q}>
                    Q.{q} {answerKey[q] ? `(${answerKey[q]})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Focused Question Card */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-blue-500 dark:border-blue-600 shadow-sm flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-blue-900 dark:text-blue-300">
                Question {taggerQ} of {totalQuestions}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {taggerSubject.name}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  taggerIsInt
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                }`}
              >
                {taggerIsInt ? 'Numerical Value' : 'MCQ (1-4)'}
              </span>
            </div>

            {/* Answer Selector Controls */}
            {taggerIsInt ? (
              /* Integer Type Speed Entry */
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Answer:</span>
                  <input
                    ref={taggerInputRef}
                    type="text"
                    value={taggerCurrentVal}
                    onChange={(e) => handleSetNumeric(taggerQ, e.target.value)}
                    placeholder="Type number & press Enter"
                    className="p-2 border-2 border-blue-600 dark:border-blue-500 rounded-lg text-lg font-bold w-48 text-center bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Press <strong>Enter</strong> to save &amp; jump to next question
                </span>
              </div>
            ) : (
              /* MCQ Speed Entry */
              <div className="space-y-2 text-center">
                <div className="flex items-center justify-center gap-3">
                  {['A', 'B', 'C', 'D'].map((opt, idx) => {
                    const isSelected = taggerCurrentVal === opt;
                    const numKey = idx + 1;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const updated = { ...answerKey, [taggerQ]: opt };
                          onChangeAnswerKey(updated);
                          if (taggerQ < totalQuestions) setTaggerQ((prev) => prev + 1);
                        }}
                        className={`w-16 h-14 rounded-xl flex flex-col items-center justify-center font-bold transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-blue-700 text-white border-2 border-blue-900 dark:border-blue-400 scale-105 shadow-md'
                            : 'bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <span className="text-lg">{opt}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                          Key: {numKey}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                  Press <strong>1, 2, 3, 4</strong> (or <strong>A, B, C, D</strong>) on your keyboard to advance
                </span>
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between w-full max-w-sm pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={taggerQ <= 1}
                onClick={() => setTaggerQ((prev) => prev - 1)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeftIcon className="w-3.5 h-3.5" /> Prev (←)
              </button>

              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {taggerCurrentVal ? `Set: ${taggerCurrentVal}` : 'Unanswered'}
              </span>

              <button
                type="button"
                disabled={taggerQ >= totalQuestions}
                onClick={() => setTaggerQ((prev) => prev + 1)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                Next (→) <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: FULL GRID OVERVIEW (Always accessible or active) */}
      <div className="space-y-2">
        {/* Subject Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-slate-800">
          {subjects.map((s) => {
            const isActive = s.id === activeSubjectTab;
            let subFilled = 0;
            for (let q = s.startQuestion; q <= s.endQuestion; q++) {
              if (answerKey[q]) subFilled++;
            }

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSubjectTab(s.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-t transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{s.name}</span>
                <span className="text-[10px] opacity-80">
                  ({subFilled}/{s.totalQuestions})
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Answer Matrix Grid */}
        <div className="max-h-[260px] overflow-y-auto p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {subjectQuestions.map((qNum) => {
              const currentOpt = answerKey[qNum];
              const isInt = isIntegerQuestion(qNum, integerQuestions);

              return (
                <div
                  key={qNum}
                  className={`p-2 rounded border flex items-center justify-between text-xs transition-all ${
                    currentOpt
                      ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-900 shadow-2xs'
                      : 'bg-gray-100/70 dark:bg-slate-900/40 border-gray-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-800 dark:text-slate-200">Q.{qNum}</span>
                    {isInt && (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded border border-amber-300 dark:border-amber-800">
                        INT
                      </span>
                    )}
                  </div>

                  {isInt ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="Answer"
                        value={currentOpt || ''}
                        onChange={(e) => handleSetNumeric(qNum, e.target.value)}
                        className="w-24 px-2 py-0.5 text-xs font-bold border border-blue-400 dark:border-slate-700 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-center"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const isSelected = currentOpt === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSetOption(qNum, opt)}
                            className={`w-6 h-6 rounded font-bold text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-700 text-white shadow-xs scale-105'
                                : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
