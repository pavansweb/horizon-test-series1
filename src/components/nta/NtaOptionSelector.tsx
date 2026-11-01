'use client';

import React from 'react';
import { RotateCcwIcon } from '@/components/icons/Icons';

interface NtaOptionSelectorProps {
  currentQuestionNumber: number;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  onClearResponse: () => void;
}

export function NtaOptionSelector({
  currentQuestionNumber,
  selectedOption,
  onSelectOption,
  onClearResponse,
}: NtaOptionSelectorProps) {
  const options = ['A', 'B', 'C', 'D'];

  return (
    <div className="bg-white border border-gray-300 rounded p-3 shadow-2xs select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2 mb-2">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          Select Your Answer for Question {currentQuestionNumber}:
        </span>

        {selectedOption && (
          <button
            type="button"
            onClick={onClearResponse}
            className="text-xs text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <RotateCcwIcon className="w-3 h-3" />
            Clear Selection
          </button>
        )}
      </div>

      {/* Options Grid / Rows */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {options.map((option) => {
          const isSelected = selectedOption === option;

          return (
            <label
              key={option}
              onClick={() => onSelectOption(option)}
              className={`flex items-center gap-3 p-2.5 rounded border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">({option})</span>
                <span className="text-xs text-gray-500 font-medium">Option {option}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
