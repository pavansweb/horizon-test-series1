'use client';

import React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  CheckIcon,
} from '@/components/icons/Icons';

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
    <div className="bg-[#f8fafc] border border-gray-300 rounded p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs select-none">
      {/* Primary NTA Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Save & Next (Green) */}
        <button
          type="button"
          onClick={onSaveAndNext}
          className="px-3.5 py-1.5 rounded font-bold text-xs sm:text-sm bg-[#2ea44f] hover:bg-[#2c974b] active:bg-[#22863a] text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <CheckIcon className="w-4 h-4" />
          <span>Save & Next</span>
        </button>

        {/* Save & Mark for Review */}
        <button
          type="button"
          onClick={onSaveAndMarkForReview}
          disabled={!hasSelectedOption}
          className={`px-3 py-1.5 rounded font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer ${
            hasSelectedOption
              ? 'bg-[#e36209] hover:bg-[#d05608] text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title={hasSelectedOption ? 'Save answer and mark for review' : 'Select an option first'}
        >
          <span>Save & Mark for Review</span>
        </button>

        {/* Clear Response */}
        <button
          type="button"
          onClick={onClearResponse}
          className="px-3 py-1.5 rounded font-bold text-xs sm:text-sm bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <RotateCcwIcon className="w-3.5 h-3.5" />
          <span>Clear Response</span>
        </button>

        {/* Mark for Review & Next */}
        <button
          type="button"
          onClick={onMarkForReviewAndNext}
          className="px-3 py-1.5 rounded font-bold text-xs sm:text-sm bg-[#6f42c1] hover:bg-[#5a32a3] text-white shadow-xs transition-all cursor-pointer"
        >
          <span>Mark for Review & Next</span>
        </button>
      </div>

      {/* Navigation Controls: Previous, Next, Submit */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className={`px-3 py-1.5 rounded font-bold text-xs sm:text-sm border transition-all flex items-center gap-1 ${
            isFirstQuestion
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-2xs cursor-pointer'
          }`}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isLastQuestion}
          className={`px-3 py-1.5 rounded font-bold text-xs sm:text-sm border transition-all flex items-center gap-1 ${
            isLastQuestion
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-2xs cursor-pointer'
          }`}
        >
          <span>Next</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSubmitTest}
          className="px-4 py-1.5 rounded font-bold text-xs sm:text-sm bg-[#0969da] hover:bg-[#0860ca] active:bg-[#0757b8] text-white shadow-xs transition-all ml-1 cursor-pointer"
        >
          Submit Test
        </button>
      </div>
    </div>
  );
}
