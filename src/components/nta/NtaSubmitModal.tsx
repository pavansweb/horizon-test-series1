'use client';

import React from 'react';
import { SubjectConfig, CandidateResponseMap, QuestionStatus } from '@/lib/types';

interface NtaSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  subjects: SubjectConfig[];
  candidateResponses: CandidateResponseMap;
}

export function NtaSubmitModal({
  isOpen,
  onClose,
  onConfirmSubmit,
  isSubmitting,
  subjects,
  candidateResponses,
}: NtaSubmitModalProps) {
  if (!isOpen) return null;

  // Compute breakdown per subject
  const breakdown = subjects.map((subject) => {
    const counts: Record<QuestionStatus, number> = {
      not_visited: 0,
      not_answered: 0,
      answered: 0,
      marked_for_review: 0,
      answered_and_marked: 0,
    };

    for (let q = subject.startQuestion; q <= subject.endQuestion; q++) {
      const resp = candidateResponses[q];
      const status: QuestionStatus = resp ? resp.status : 'not_visited';
      counts[status]++;
    }

    return {
      name: subject.name,
      total: subject.totalQuestions,
      answered: counts.answered,
      notAnswered: counts.not_answered,
      markedForReview: counts.marked_for_review,
      answeredAndMarked: counts.answered_and_marked,
      notVisited: counts.not_visited,
    };
  });

  const totalQuestions = breakdown.reduce((sum, b) => sum + b.total, 0);
  const totalAnswered = breakdown.reduce((sum, b) => sum + b.answered, 0);
  const totalNotAnswered = breakdown.reduce((sum, b) => sum + b.notAnswered, 0);
  const totalMarkedForReview = breakdown.reduce((sum, b) => sum + b.markedForReview, 0);
  const totalAnsweredAndMarked = breakdown.reduce((sum, b) => sum + b.answeredAndMarked, 0);
  const totalNotVisited = breakdown.reduce((sum, b) => sum + b.notVisited, 0);

  const thStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRight: '1px solid #bdbdbd',
    borderBottom: '1px solid #bdbdbd',
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 700,
    background: '#e3f2fd',
    color: '#212121',
  };

  const tdStyle: React.CSSProperties = {
    padding: '5px 8px',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 500,
  };

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
          overflow: 'hidden',
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
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 700 }}>Examination Summary</h2>
          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '2px' }}>
            HORIZON CBT
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          <p style={{ fontSize: '12px', color: '#424242', marginBottom: '12px', fontWeight: 500 }}>
            Please verify your test attempt summary before final submission:
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #bdbdbd' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'left' }}>Subject</th>
                <th style={thStyle}>Total</th>
                <th style={{ ...thStyle, color: '#2e7d32' }}>Answered</th>
                <th style={{ ...thStyle, color: '#c62828' }}>Not Ans.</th>
                <th style={{ ...thStyle, color: '#7b1fa2' }}>Marked</th>
                <th style={{ ...thStyle, color: '#6a1b9a' }}>Ans & Marked</th>
                <th style={{ ...thStyle, color: '#757575', borderRight: 'none' }}>Not Visited</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.name}>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700 }}>{row.name}</td>
                  <td style={tdStyle}>{row.total}</td>
                  <td style={{ ...tdStyle, color: '#2e7d32', fontWeight: 700 }}>{row.answered}</td>
                  <td style={{ ...tdStyle, color: '#c62828' }}>{row.notAnswered}</td>
                  <td style={{ ...tdStyle, color: '#7b1fa2' }}>{row.markedForReview}</td>
                  <td style={{ ...tdStyle, color: '#6a1b9a', fontWeight: 700 }}>{row.answeredAndMarked}</td>
                  <td style={{ ...tdStyle, color: '#757575', borderRight: 'none' }}>{row.notVisited}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr style={{ background: '#f5f5f5' }}>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700, borderBottom: 'none' }}>TOTAL</td>
                <td style={{ ...tdStyle, fontWeight: 700, borderBottom: 'none' }}>{totalQuestions}</td>
                <td style={{ ...tdStyle, color: '#2e7d32', fontWeight: 700, borderBottom: 'none' }}>{totalAnswered}</td>
                <td style={{ ...tdStyle, color: '#c62828', fontWeight: 700, borderBottom: 'none' }}>{totalNotAnswered}</td>
                <td style={{ ...tdStyle, color: '#7b1fa2', fontWeight: 700, borderBottom: 'none' }}>{totalMarkedForReview}</td>
                <td style={{ ...tdStyle, color: '#6a1b9a', fontWeight: 700, borderBottom: 'none' }}>{totalAnsweredAndMarked}</td>
                <td style={{ ...tdStyle, color: '#757575', fontWeight: 700, borderRight: 'none', borderBottom: 'none' }}>{totalNotVisited}</td>
              </tr>
            </tbody>
          </table>

          {/* Warning */}
          <div
            style={{
              marginTop: '14px',
              padding: '10px 12px',
              background: '#fff3e0',
              border: '1px solid #ffb74d',
              borderRadius: '2px',
              fontSize: '12px',
              color: '#e65100',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: '1', flexShrink: 0 }}>⚠</span>
            <div>
              <strong>Important Notice:</strong> Are you sure you want to submit the test?
              Once submitted, you will not be able to change any answers.
              Your score and detailed analysis will be evaluated immediately.
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            background: '#eceff1',
            padding: '10px 16px',
            borderTop: '1px solid #bdbdbd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'white',
              color: '#424242',
              border: '1px solid #9e9e9e',
              borderRadius: '2px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            No, Resume Test
          </button>
          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            style={{
              padding: '6px 20px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#4caf50',
              color: 'white',
              border: '1px solid #388e3c',
              borderRadius: '2px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                <span>Evaluating...</span>
              </>
            ) : (
              <span>Yes, Submit Examination</span>
            )}
          </button>
        </div>
      </div>

      {/* Spin keyframes */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
