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
  onMarkForReviewAndNext,
  onPrevious,
  onNext,
  onSubmitTest,
  isFirstQuestion,
  isLastQuestion,
  hasSelectedOption,
}: NtaActionBarProps) {
  return (
    <div
      className="action-bar-wrap w-full flex items-end justify-between select-none"
      style={{
        background: '#ffffff',
        padding: '12px 20px 14px 20px',
      }}
    >
      {/* Left button stack matching attached media layout */}
      <div className="flex flex-col gap-2.5">
        {/* Row 1: SAVE & NEXT (Green) and SAVE & MARK FOR REVIEW (Orange) */}
        <div className="flex items-center gap-3">
          {/* SAVE & NEXT */}
          <button
            type="button"
            onClick={onSaveAndNext}
            style={{
              background: '#4caf50',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              padding: '9px 22px',
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#43a047')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4caf50')}
          >
            SAVE &amp; NEXT
          </button>

          {/* SAVE & MARK FOR REVIEW */}
          <button
            type="button"
            onClick={onSaveAndMarkForReview}
            disabled={!hasSelectedOption}
            style={{
              background: hasSelectedOption ? '#d9822b' : '#e0e0e0',
              color: hasSelectedOption ? '#ffffff' : '#9e9e9e',
              border: 'none',
              borderRadius: '2px',
              padding: '9px 22px',
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              cursor: hasSelectedOption ? 'pointer' : 'not-allowed',
              boxShadow: hasSelectedOption ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (hasSelectedOption) e.currentTarget.style.backgroundColor = '#c77424';
            }}
            onMouseLeave={(e) => {
              if (hasSelectedOption) e.currentTarget.style.backgroundColor = '#d9822b';
            }}
          >
            SAVE &amp; MARK FOR REVIEW
          </button>
        </div>

        {/* Row 2: MARK FOR REVIEW & NEXT (Dark Blue) */}
        <div>
          <button
            type="button"
            onClick={onMarkForReviewAndNext}
            style={{
              background: '#1b4372',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              padding: '9px 22px',
              fontSize: '12.5px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15355e')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b4372')}
          >
            MARK FOR REVIEW &amp; NEXT
          </button>
        </div>

        {/* Row 3: << BACK and NEXT >> */}
        <div className="flex items-center gap-2">
          {/* << BACK */}
          <button
            type="button"
            onClick={onPrevious}
            disabled={isFirstQuestion}
            style={{
              background: '#f1f3f5',
              color: isFirstQuestion ? '#9ca3af' : '#334155',
              border: '1px solid #94a3b8',
              borderRadius: '2px',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: isFirstQuestion ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isFirstQuestion) e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              if (!isFirstQuestion) e.currentTarget.style.backgroundColor = '#f1f3f5';
            }}
          >
            &lt;&lt; BACK
          </button>

          {/* NEXT >> */}
          <button
            type="button"
            onClick={onNext}
            disabled={isLastQuestion}
            style={{
              background: '#f1f3f5',
              color: isLastQuestion ? '#9ca3af' : '#334155',
              border: '1px solid #94a3b8',
              borderRadius: '2px',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: isLastQuestion ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isLastQuestion) e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              if (!isLastQuestion) e.currentTarget.style.backgroundColor = '#f1f3f5';
            }}
          >
            NEXT &gt;&gt;
          </button>
        </div>
      </div>

      {/* Right side: SUBMIT button (Green) at bottom right of question area */}
      <div>
        <button
          type="button"
          onClick={onSubmitTest}
          style={{
            background: '#4caf50',
            color: '#ffffff',
            border: 'none',
            borderRadius: '2px',
            padding: '9px 26px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#43a047')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4caf50')}
        >
          SUBMIT
        </button>
      </div>
    </div>
  );
}
