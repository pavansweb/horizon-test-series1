'use client';

import React from 'react';
import { NtaPaletteBadge } from './NtaPaletteBadge';

interface NtaInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  durationMinutes: number;
  markingScheme: { correct: number; incorrect: number; unattempted: number };
}

export function NtaInstructionsModal({
  isOpen,
  onClose,
  durationMinutes,
  markingScheme,
}: NtaInstructionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border-2 border-[#1e4273] dark:border-blue-600 rounded-md max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl transition-colors">
        {/* Header */}
        <div className="bg-[#1e4273] dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <span>📖</span>
            <span>EXAMINATION INSTRUCTIONS</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-red-200 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1 space-y-4">
          <div>
            <h3 className="font-extrabold text-blue-900 dark:text-blue-400 mb-2 text-sm">
              1. General Examination Instructions:
            </h3>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                Total duration of the examination is <strong>{durationMinutes} minutes</strong>.
              </li>
              <li>
                The countdown timer in the top header indicates your remaining time. The test submits automatically when the timer reaches zero.
              </li>
              <li>
                Your answers are automatically saved locally, ensuring your progress is never lost even if you accidentally refresh or lose connection.
              </li>
            </ol>
          </div>

          {/* Palette Legend Explanation */}
          <div>
            <h3 className="font-extrabold text-blue-900 dark:text-blue-400 mb-2 text-sm">
              2. Question Palette Symbols &amp; Meaning:
            </h3>
            <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded p-3 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-3">
                <NtaPaletteBadge number={1} status="not_visited" size="sm" />
                <span>You have not visited the question yet.</span>
              </div>
              <div className="flex items-center gap-3">
                <NtaPaletteBadge number={2} status="not_answered" size="sm" />
                <span>You have not answered the question.</span>
              </div>
              <div className="flex items-center gap-3">
                <NtaPaletteBadge number={3} status="answered" size="sm" />
                <span>You have answered the question.</span>
              </div>
              <div className="flex items-center gap-3">
                <NtaPaletteBadge number={4} status="marked_for_review" size="sm" />
                <span>You have NOT answered the question, but marked it for review.</span>
              </div>
              <div className="flex items-center gap-3">
                <NtaPaletteBadge number={5} status="answered_and_marked" size="sm" />
                <span>
                  The question is <strong>Answered and Marked for Review</strong> (it <em>will be evaluated</em>).
                </span>
              </div>
            </div>
          </div>

          {/* Marking Scheme */}
          <div>
            <h3 className="font-extrabold text-blue-900 dark:text-blue-400 mb-2 text-sm">
              3. Marking Scheme:
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="block text-[11px] text-emerald-800 dark:text-emerald-300 font-bold uppercase">Correct Answer</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">+{markingScheme.correct} Marks</span>
              </div>
              <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                <span className="block text-[11px] text-red-800 dark:text-red-300 font-bold uppercase">Incorrect Answer</span>
                <span className="text-base font-black text-red-600 dark:text-red-400">{markingScheme.incorrect} Mark</span>
              </div>
              <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                <span className="block text-[11px] text-slate-600 dark:text-slate-400 font-bold uppercase">Unattempted</span>
                <span className="text-base font-black text-slate-700 dark:text-slate-300">{markingScheme.unattempted} Marks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer transition-colors"
          >
            Close Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
