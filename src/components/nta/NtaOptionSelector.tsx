'use client';

import React from 'react';

interface NtaOptionSelectorProps {
  currentQuestionNumber: number;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  onClearResponse: () => void;
  isInteger?: boolean;
}

export function NtaOptionSelector({
  selectedOption,
  onSelectOption,
  onClearResponse,
  isInteger = false,
}: NtaOptionSelectorProps) {
  // 4 standard CBT options matching the NTA replica: 1), 2), 3), 4)
  const options = [
    { value: 'A', numVal: '1', label: '1)' },
    { value: 'B', numVal: '2', label: '2)' },
    { value: 'C', numVal: '3', label: '3)' },
    { value: 'D', numVal: '4', label: '4)' },
  ];

  const isOptionSelected = (opt: { value: string; numVal: string }) => {
    if (!selectedOption) return false;
    const s = selectedOption.toUpperCase();
    return s === opt.value || s === opt.numVal;
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

  return (
    <div className="options-panel-wrap w-full select-none bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-300 dark:border-slate-800 transition-colors">
      {isInteger ? (
        /* Numerical / Integer Type Question Interface */
        <div className="flex flex-col gap-2.5 max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 uppercase tracking-wide">
              Numerical Value Answer
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Use keyboard or keypad to enter answer)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Answer:</span>
            <input
              type="text"
              value={selectedOption || ''}
              onChange={(e) => onSelectOption(e.target.value)}
              placeholder="e.g. 5 or -2.5"
              className="px-3 py-1.5 border-2 border-blue-600 dark:border-blue-500 rounded font-bold text-base w-48 text-left bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Virtual On-screen Keypad */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded border border-slate-300 dark:border-slate-700 w-fit">
            <div className="grid grid-cols-3 gap-1.5 w-48">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '-'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className="py-1.5 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded font-bold text-sm text-slate-800 dark:text-slate-100 active:bg-blue-200 transition-colors cursor-pointer text-center shadow-2xs"
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded font-bold text-xs text-amber-800 dark:text-amber-300 col-span-1 text-center cursor-pointer shadow-2xs"
                title="Backspace"
              >
                ⌫ Back
              </button>
              <button
                type="button"
                onClick={onClearResponse}
                className="py-1.5 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800 rounded font-bold text-xs text-red-700 dark:text-red-300 col-span-2 text-center cursor-pointer shadow-2xs"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MCQ 4-Option Horizontal / Vertical Selector */
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              Select your response:
            </span>
            {selectedOption && (
              <button
                type="button"
                onClick={onClearResponse}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {options.map((opt) => {
              const selected = isOptionSelected(opt);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded border-2 cursor-pointer transition-all ${
                    selected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-xs'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="candidate_option_choice"
                    value={opt.value}
                    checked={selected}
                    onChange={() => onSelectOption(opt.value)}
                    className="w-4 h-4 text-blue-600 accent-blue-600 cursor-pointer"
                  />
                  <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Option {opt.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
