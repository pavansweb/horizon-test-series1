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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div
        style={{
          background: 'white',
          border: '2px solid #1e4273',
          borderRadius: '3px',
          maxWidth: '640px',
          width: '95%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#1e4273',
            color: 'white',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700 }}>Examination Instructions</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 4px',
              opacity: 0.8,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '16px',
            overflowY: 'auto',
            fontSize: '12px',
            color: '#424242',
            lineHeight: '1.6',
            flex: 1,
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontWeight: 700, color: '#0d47a1', marginBottom: '6px', fontSize: '13px' }}>
              General Instructions:
            </h3>
            <ol style={{ paddingLeft: '20px', listStyleType: 'decimal' }}>
              <li style={{ marginBottom: '6px' }}>
                Total duration of the examination is <strong>{durationMinutes} minutes</strong> (3 hours).
              </li>
              <li style={{ marginBottom: '6px' }}>
                The countdown clock in the top right corner displays the remaining time available to you.
                When the timer reaches zero, the examination will end automatically.
              </li>
              <li style={{ marginBottom: '6px' }}>
                The Question Palette displayed on the right side of screen will show the status of each
                question using one of the following symbols:
              </li>
            </ol>
          </div>

          {/* Palette Legend */}
          <div
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '2px',
              padding: '10px 14px',
              background: '#fafafa',
              marginBottom: '14px',
            }}
          >
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <NtaPaletteBadge number={1} status="not_visited" size="sm" />
              <span>You have not visited the question yet.</span>
            </div>
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <NtaPaletteBadge number={2} status="not_answered" size="sm" />
              <span>You have not answered the question.</span>
            </div>
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <NtaPaletteBadge number={3} status="answered" size="sm" />
              <span>You have answered the question.</span>
            </div>
            <div className="flex items-center gap-3" style={{ marginBottom: '8px' }}>
              <NtaPaletteBadge number={4} status="marked_for_review" size="sm" />
              <span>You have NOT answered the question, but have marked the question for review.</span>
            </div>
            <div className="flex items-center gap-3">
              <NtaPaletteBadge number={5} status="answered_and_marked" size="sm" />
              <span>The question is answered and marked for review (will be considered for evaluation).</span>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontWeight: 700, color: '#0d47a1', marginBottom: '6px', fontSize: '13px' }}>
              Marking Scheme:
            </h3>
            <ul style={{ paddingLeft: '20px', listStyleType: 'disc' }}>
              <li style={{ marginBottom: '4px' }}>
                For each correct answer: <strong style={{ color: '#2e7d32' }}>+{markingScheme.correct} marks</strong>
              </li>
              <li style={{ marginBottom: '4px' }}>
                For each incorrect answer: <strong style={{ color: '#c62828' }}>{markingScheme.incorrect} mark</strong>
              </li>
              <li style={{ marginBottom: '4px' }}>
                For unattempted questions: <strong>{markingScheme.unattempted} marks</strong>
              </li>
            </ul>
          </div>

          <div>
            <h3 style={{ fontWeight: 700, color: '#0d47a1', marginBottom: '6px', fontSize: '13px' }}>
              Navigating to a Question:
            </h3>
            <p>
              To answer a question, you may click on the question number in the Question Palette directly,
              or use the Previous and Next controls. Click <strong>Save &amp; Next</strong> to save your answer.
              Click <strong>Clear Response</strong> to deselect an answered option.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#eceff1',
            padding: '10px 16px',
            borderTop: '1px solid #bdbdbd',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 20px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#1565c0',
              color: 'white',
              border: '1px solid #0d47a1',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            Close Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
