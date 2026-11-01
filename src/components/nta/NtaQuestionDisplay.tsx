'use client';

import React, { useState } from 'react';
import { PublicQuestion } from '@/lib/types';
import { NtaPdfViewer } from './NtaPdfViewer';

interface NtaQuestionDisplayProps {
  question: PublicQuestion;
  currentQuestionNumber: number;
  totalQuestions: number;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  onClearResponse: () => void;
  pdfUrl?: string;
  pdfStartPage?: number;
  pdfEndPage?: number;
}

export function NtaQuestionDisplay({
  question,
  currentQuestionNumber,
  selectedOption,
  onSelectOption,
  onClearResponse,
  pdfUrl,
  pdfStartPage,
  pdfEndPage,
}: NtaQuestionDisplayProps) {
  const [showPdfReference, setShowPdfReference] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');

  const isInteger = question.type === 'numerical';

  // Standard 4 MCQ options: A, B, C, D
  const optionKeys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const isOptionSelected = (optKey: string, index: number) => {
    if (!selectedOption) return false;
    const s = selectedOption.toUpperCase();
    return s === optKey || s === String(index + 1);
  };

  const handleKeypadPress = (val: string) => {
    const current = selectedOption || '';
    onSelectOption(current + val);
  };

  const handleKeypadBackspace = () => {
    const current = selectedOption || '';
    if (current.length > 0) {
      onSelectOption(current.slice(0, -1));
    }
  };

  const fontSizeClasses = {
    normal: 'text-[15px] leading-relaxed',
    large: 'text-[17px] leading-relaxed',
    xlarge: 'text-[19px] leading-relaxed',
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800 select-none">
      {/* 1. Header Bar: Question No, Subject Tag, Marks & PDF Toggle */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-[16px] font-bold text-[#7f1d1d] dark:text-red-400 font-sans">
            Question No : {currentQuestionNumber}
          </span>
          <span className="text-xs uppercase font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            {question.subjectId}
          </span>
          <span className="text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
            {isInteger ? 'Section B (Numerical)' : 'Section A (MCQ)'}
          </span>
          <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded border border-green-200 dark:border-green-800">
            +{question.marks ?? 4}, -{question.negativeMarks ?? 1}
          </span>
        </div>

        {/* Right Controls: Font size & PDF Reference Toggle */}
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <button
              type="button"
              onClick={() => setShowPdfReference(!showPdfReference)}
              className="text-xs font-semibold px-2.5 py-1 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Toggle original PDF viewer for diagram verification"
            >
              <span>📄</span>
              <span>{showPdfReference ? 'Hide Original PDF' : 'View Original PDF'}</span>
            </button>
          )}

          <div className="flex items-center border border-gray-300 dark:border-slate-700 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => setFontSize('normal')}
              className={`px-2 py-0.5 text-xs font-bold ${
                fontSize === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Standard Font Size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('large')}
              className={`px-2 py-0.5 text-xs font-bold border-l border-r border-gray-300 dark:border-slate-700 ${
                fontSize === 'large'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Large Font Size"
            >
              A+
            </button>
            <button
              type="button"
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-0.5 text-xs font-bold ${
                fontSize === 'xlarge'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Extra Large Font Size"
            >
              A++
            </button>
          </div>
        </div>
      </div>

      {/* Optional Embedded PDF Reference Toggle Box */}
      {showPdfReference && pdfUrl && (
        <div className="border-b border-gray-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
          <div className="flex items-center justify-between pb-1 px-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Original PDF Paper Reference (for figures & complex symbols):</span>
            <button
              type="button"
              onClick={() => setShowPdfReference(false)}
              className="text-red-600 dark:text-red-400 font-bold hover:underline"
            >
              ✕ Close PDF
            </button>
          </div>
          <NtaPdfViewer
            pdfUrl={pdfUrl}
            currentQuestionNumber={currentQuestionNumber}
            startPage={pdfStartPage}
            endPage={pdfEndPage}
          />
        </div>
      )}

      {/* 2. Main Question Statement Box */}
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[460px] bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className={`text-gray-900 dark:text-slate-100 font-normal whitespace-pre-wrap ${fontSizeClasses[fontSize]}`}>
            {question.questionText || `Question ${currentQuestionNumber}`}
          </div>
        </div>
      </div>

      {/* 3. Options or Numerical Keypad Section */}
      <div className="border-t border-gray-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 sm:p-5">
        <div className="max-w-4xl mx-auto">
          {isInteger ? (
            /* Numerical / Integer Interface */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 tracking-wide">
                  Numerical Value Answer
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Enter your calculated numerical value using keypad)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Answer:</span>
                <input
                  type="text"
                  value={selectedOption || ''}
                  onChange={(e) => onSelectOption(e.target.value)}
                  placeholder="e.g. 5 or -2.5"
                  className="px-3 py-2 border-2 border-blue-600 dark:border-blue-500 rounded font-bold text-lg w-52 text-left bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-xs"
                />
              </div>

              {/* Virtual Keypad */}
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 w-fit shadow-xs mt-1">
                <div className="grid grid-cols-3 gap-1.5 w-52">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '-'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key)}
                      className="py-2 bg-gray-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600 rounded font-bold text-sm text-gray-800 dark:text-gray-100 active:bg-blue-200 transition-colors cursor-pointer text-center shadow-2xs"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 rounded font-bold text-xs text-amber-800 dark:text-amber-300 col-span-1 text-center cursor-pointer shadow-2xs"
                    title="Backspace"
                  >
                    ⌫ Back
                  </button>
                  <button
                    type="button"
                    onClick={onClearResponse}
                    className="py-2 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 border border-red-300 dark:border-red-800 rounded font-bold text-xs text-red-700 dark:text-red-300 col-span-2 text-center cursor-pointer shadow-2xs"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MCQ Options List */
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Choose the correct option:
              </span>

              {optionKeys.map((optKey, idx) => {
                const optObj = question.options?.find(
                  (o) => o.id.toUpperCase() === optKey || o.id === String(idx + 1)
                );
                const selected = isOptionSelected(optKey, idx);

                return (
                  <div
                    key={optKey}
                    onClick={() => onSelectOption(optKey)}
                    className={`flex items-start gap-3.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Radio circle */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        selected
                          ? 'border-blue-600 dark:border-blue-400 bg-white dark:bg-slate-900'
                          : 'border-gray-400 dark:border-slate-500 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
                    </div>

                    {/* Option Label & Text */}
                    <div className="flex items-start gap-2.5 text-sm sm:text-base">
                      <span className="font-bold text-gray-900 dark:text-slate-100 shrink-0">
                        {idx + 1})
                      </span>
                      <span className="text-gray-800 dark:text-slate-200 leading-normal">
                        {optObj?.text || `Option ${optKey}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {selectedOption && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={onClearResponse}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer px-2 py-1"
                  >
                    Clear Response
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}