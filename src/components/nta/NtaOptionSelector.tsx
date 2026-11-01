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
    <div
      className="options-panel-wrap w-full select-none"
      style={{
        background: '#ffffff',
        padding: '10px 16px',
        borderBottom: '1px solid #d1d5db',
      }}
    >
      {isInteger ? (
        /* Numerical / Integer Type Question Interface */
        <div className="flex flex-col gap-2.5 max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
              Numerical Value Answer
            </span>
            <span className="text-[11px] text-gray-500">
              (Use keyboard or keypad to enter answer)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">Answer:</span>
            <input
              type="text"
              value={selectedOption || ''}
              onChange={(e) => onSelectOption(e.target.value)}
              placeholder="e.g. 5 or -2.5"
              className="px-3 py-1.5 border-2 border-blue-600 rounded font-bold text-base w-48 text-left bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Virtual On-screen Keypad */}
          <div className="bg-gray-50 p-2 rounded border border-gray-300 w-fit">
            <div className="grid grid-cols-3 gap-1.5 w-48">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '-'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className="py-1.5 bg-white hover:bg-blue-50 border border-gray-300 rounded font-bold text-sm text-gray-800 active:bg-blue-200 transition-colors cursor-pointer text-center shadow-2xs"
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded font-bold text-xs text-amber-800 col-span-1 text-center cursor-pointer shadow-2xs"
                title="Backspace"
              >
                ⌫ Back
              </button>
              <button
                type="button"
                onClick={onClearResponse}
                className="py-1.5 bg-red-50 hover:bg-red-100 border border-red-300 rounded font-bold text-xs text-red-700 col-span-2 text-center cursor-pointer shadow-2xs"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standard 4-Option MCQ Interface */
        <div className="flex flex-col gap-2.5">
          {options.map((opt) => {
            const selected = isOptionSelected(opt);

            return (
              <label
                key={opt.value}
                onClick={() => onSelectOption(opt.value)}
                className="flex items-center gap-3 cursor-pointer group"
                style={{
                  width: 'fit-content',
                  padding: '2px 4px',
                }}
              >
                {/* Radio Circle */}
                <div
                  className={`option-radio-circle ${selected ? 'selected' : ''}`}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: `2.5px solid ${selected ? '#1e4273' : '#64748b'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    flexShrink: 0,
                    transition: 'border-color 0.1s',
                  }}
                >
                  {selected && (
                    <div
                      className="option-radio-dot"
                      style={{
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        background: '#1e4273',
                      }}
                    />
                  )}
                </div>

                {/* Option Number Label e.g. 1) */}
                <span
                  className="option-radio-label"
                  style={{
                    fontSize: '16px',
                    fontWeight: selected ? 700 : 600,
                    color: selected ? '#0f172a' : '#1e293b',
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                  }}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Clear Response Link */}
      {selectedOption && !isInteger && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={onClearResponse}
            style={{
              fontSize: '11px',
              color: '#dc2626',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '2px 6px',
            }}
          >
            Clear Response
          </button>
        </div>
      )}
    </div>
  );
}
