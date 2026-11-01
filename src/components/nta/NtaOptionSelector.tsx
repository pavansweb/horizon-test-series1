'use client';

import React from 'react';

interface NtaOptionSelectorProps {
  currentQuestionNumber: number;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  onClearResponse: () => void;
}

export function NtaOptionSelector({
  selectedOption,
  onSelectOption,
  onClearResponse,
}: NtaOptionSelectorProps) {
  // 4 standard CBT options matching the attached screenshot: 1), 2), 3), 4)
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

  return (
    <div
      className="options-panel-wrap w-full select-none"
      style={{
        background: '#ffffff',
        padding: '10px 16px',
        borderBottom: '1px solid #d1d5db',
      }}
    >
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

      {/* Clear Response Link */}
      {selectedOption && (
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
