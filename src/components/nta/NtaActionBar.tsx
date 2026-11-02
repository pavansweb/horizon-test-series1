'use client';

import React from 'react';

interface NtaActionBarProps {
  onSaveAndNext: () => void;
  onSaveAndMarkForReview: () => void;
  onClearResponse: () => void;
  onMarkForReviewAndNext: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmitTest: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  hasSelectedOption: boolean;
}

export function NtaActionBar({
  onSaveAndNext,
  onSaveAndMarkForReview,
  onClearResponse,
  onMarkForReviewAndNext,
  onPrevious,
  onNext,
  onSubmitTest,
  isFirstQuestion,
  isLastQuestion,
  hasSelectedOption,
}: NtaActionBarProps) {
  return (
    <div className="action-bar-wrap w-full flex flex-wrap items-center justify-between select-none bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 px-4 py-3 gap-3 transition-colors">
      {/* Left button group: Save & Next, Save & Mark, Mark for Review, Clear */}
      <div className="flex flex-wrap items-center gap-2">
        {/* SAVE & NEXT (Green) */}
        <button
          type="button"
          onClick={onSaveAndNext}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded uppercase tracking-wider shadow-xs cursor-pointer transition-all"
        >
          Save &amp; Next
        </button>

        {/* SAVE & MARK FOR REVIEW (Amber/Orange) */}
        <button
          type="button"
          onClick={onSaveAndMarkForReview}
          disabled={!hasSelectedOption}
          className={`px-4 py-2 font-bold text-xs rounded uppercase tracking-wider shadow-xs transition-all ${
            hasSelectedOption
              ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
          }`}
        >
          Save &amp; Mark For Review
        </button>

        {/* MARK FOR REVIEW & NEXT (Navy Blue) */}
        <button
          type="button"
          onClick={onMarkForReviewAndNext}
          className="px-4 py-2 bg-[#1b4372] hover:bg-[#15355e] dark:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded uppercase tracking-wider shadow-xs cursor-pointer transition-all"
        >
          Mark For Review &amp; Next
        </button>

        {/* CLEAR RESPONSE */}
        {hasSelectedOption && (
          <button
            type="button"
            onClick={onClearResponse}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-xs rounded uppercase tracking-wider cursor-pointer transition-all"
          >
            Clear Response
          </button>
        )}
      </div>

      {/* Right button group: Back, Next & Submit */}
      <div className="flex items-center gap-2">
        {/* << BACK */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded uppercase tracking-wide cursor-pointer transition-all"
        >
          &lt;&lt; Back
        </button>

        {/* NEXT >> */}
        <button
          type="button"
          onClick={onNext}
          disabled={isLastQuestion}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs rounded uppercase tracking-wide cursor-pointer transition-all"
        >
          Next &gt;&gt;
        </button>

        {/* SUBMIT (Green, prominent) */}
        <button
          type="button"
          onClick={onSubmitTest}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded uppercase tracking-wider shadow-sm cursor-pointer transition-all ml-2"
        >
          Submit Test
        </button>
      </div>
    </div>
  );
}
