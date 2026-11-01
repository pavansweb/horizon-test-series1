'use client';

import React from 'react';
import { SubjectConfig, CandidateResponseMap, QuestionStatus } from '@/lib/types';
import { NtaPaletteBadge, NtaLegendBadge } from './NtaPaletteBadge';

interface NtaQuestionPaletteProps {
  subjects: SubjectConfig[];
  activeSubjectId?: string;
  onSelectSubject?: (subjectId: string) => void;
  currentQuestionNumber: number;
  onSelectQuestion: (questionNumber: number) => void;
  candidateResponses: CandidateResponseMap;
}

export function NtaQuestionPalette({
  subjects,
  currentQuestionNumber,
  onSelectQuestion,
  candidateResponses,
}: NtaQuestionPaletteProps) {
  // Determine section ranges: from subjects or chunks of 25 questions
  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
  const sections: { startQuestion: number; endQuestion: number }[] =
    subjects && subjects.length > 0
      ? subjects
      : [
          { startQuestion: 1, endQuestion: Math.min(25, totalQuestions) },
          { startQuestion: 26, endQuestion: Math.min(50, totalQuestions) },
          { startQuestion: 51, endQuestion: totalQuestions },
        ].filter((s) => s.startQuestion <= totalQuestions);

  return (
    <div
      className="palette-container-wrap flex flex-col h-full select-none"
      style={{
        background: '#ffffff',
        borderLeft: '1px solid #d1d5db',
        padding: '12px 14px',
      }}
    >
      {/* Top Legend Area */}
      <div
        className="legend-wrap flex flex-col gap-2.5 pb-4 mb-3"
        style={{
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {/* Row 1: Not Visited & Not Answered */}
        <div className="grid grid-cols-2 gap-2">
          <NtaLegendBadge status="not_visited" label="Not Visited" />
          <NtaLegendBadge status="not_answered" label="Not Answered" />
        </div>

        {/* Row 2: Answered & Marked for Review */}
        <div className="grid grid-cols-2 gap-2">
          <NtaLegendBadge status="answered" label="Answered" />
          <NtaLegendBadge status="marked_for_review" label="Marked for Review" />
        </div>

        {/* Row 3: Answered & Marked for Review (will be considered for evaluation) */}
        <div className="mt-0.5">
          <NtaLegendBadge
            status="answered_and_marked"
            label="Answered & Marked for Review (will be considered for evaluation)"
          />
        </div>
      </div>

      {/* Question Grid Section (Section-broken 9-column grid with vertical scrollbar) */}
      <div
        className="palette-scroll-wrap flex-1 overflow-y-auto pr-1"
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '2px',
          padding: '8px',
          background: '#fafafa',
          maxHeight: 'calc(100vh - 230px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {sections.map((sec, secIdx) => {
          const qList: number[] = [];
          for (let q = sec.startQuestion; q <= sec.endQuestion; q++) {
            qList.push(q);
          }

          return (
            <div
              key={secIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
                gap: '5px',
              }}
            >
              {qList.map((qNum) => {
                const resp = candidateResponses[qNum];
                const status: QuestionStatus = resp ? resp.status : 'not_visited';
                const isActive = qNum === currentQuestionNumber;

                return (
                  <NtaPaletteBadge
                    key={qNum}
                    number={qNum}
                    status={status}
                    isActive={isActive}
                    onClick={() => onSelectQuestion(qNum)}
                    size="md"
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
