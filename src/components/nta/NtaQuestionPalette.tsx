'use client';

import React from 'react';
import { SubjectConfig, CandidateResponseMap, QuestionStatus } from '@/lib/types';
import { NtaPaletteBadge, NtaLegendBadge } from './NtaPaletteBadge';

interface NtaQuestionPaletteProps {
  subjects: SubjectConfig[];
  activeSubjectId?: string;
  activeFilter?: string; // 'all' or subjectId ('physics', 'chemistry', 'mathematics')
  onSelectSubject?: (subjectId: string) => void;
  currentQuestionNumber: number;
  onSelectQuestion: (questionNumber: number) => void;
  candidateResponses: CandidateResponseMap;
}

export function NtaQuestionPalette({
  subjects,
  activeFilter = 'all',
  currentQuestionNumber,
  onSelectQuestion,
  candidateResponses,
}: NtaQuestionPaletteProps) {
  // Determine section ranges: from subjects or chunks of 25 questions
  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
  const rawSections: (SubjectConfig | { id: string; name: string; startQuestion: number; endQuestion: number; totalQuestions: number })[] =
    subjects && subjects.length > 0
      ? subjects
      : [
          { id: 'physics', name: 'Physics', startQuestion: 1, endQuestion: Math.min(25, totalQuestions), totalQuestions: 25 },
          { id: 'chemistry', name: 'Chemistry', startQuestion: 26, endQuestion: Math.min(50, totalQuestions), totalQuestions: 25 },
          { id: 'mathematics', name: 'Mathematics', startQuestion: 51, endQuestion: totalQuestions, totalQuestions: 25 },
        ].filter((s) => s.startQuestion <= totalQuestions);

  const sections = activeFilter && activeFilter !== 'all'
    ? rawSections.filter((s) => s.id === activeFilter)
    : rawSections;

  // Real-time calculation of status counts across the whole exam
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let markedCount = 0;
  let markedAndAnsweredCount = 0;
  let notVisitedCount = 0;

  for (let q = 1; q <= totalQuestions; q++) {
    const resp = candidateResponses[q];
    const st: QuestionStatus = resp ? resp.status : 'not_visited';
    if (st === 'answered') answeredCount++;
    else if (st === 'not_answered') notAnsweredCount++;
    else if (st === 'marked_for_review') markedCount++;
    else if (st === 'answered_and_marked') markedAndAnsweredCount++;
    else notVisitedCount++;
  }

  return (
    <div className="palette-container-wrap flex flex-col h-full select-none bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 p-3 sm:p-3.5 transition-colors">
      {/* Top Legend Area */}
      <div className="legend-wrap flex flex-col gap-2 pb-3 mb-2.5 border-b border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Legend &amp; Status
        </span>

        {/* Row 1: Answered & Not Answered */}
        <div className="grid grid-cols-2 gap-2">
          <NtaLegendBadge status="answered" label="Answered" count={answeredCount} />
          <NtaLegendBadge status="not_answered" label="Not Answered" count={notAnsweredCount} />
        </div>

        {/* Row 2: Not Visited & Marked for Review */}
        <div className="grid grid-cols-2 gap-2">
          <NtaLegendBadge status="not_visited" label="Not Visited" count={notVisitedCount} />
          <NtaLegendBadge status="marked_for_review" label="Marked for Review" count={markedCount} />
        </div>

        {/* Row 3: Answered & Marked for Review */}
        <div className="mt-0.5">
          <NtaLegendBadge
            status="answered_and_marked"
            label="Ans. &amp; Marked for Review (Evaluated)"
            count={markedAndAnsweredCount}
          />
        </div>
      </div>

      {/* Choose a Question Header */}
      <div className="bg-[#1e4273] dark:bg-slate-800 text-white px-2.5 py-1.5 rounded-t text-xs font-bold flex items-center justify-between">
        <span>Choose a Question</span>
        <span className="text-[11px] text-blue-200 dark:text-slate-400">
          Total: {totalQuestions}
        </span>
      </div>

      {/* Question Grid Section (Section-broken 9-column grid with vertical scrollbar) */}
      <div className="palette-scroll-wrap flex-1 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/60 border border-t-0 border-slate-300 dark:border-slate-800 rounded-b flex flex-col gap-3 max-h-[calc(100vh-250px)]">
        {sections.map((sec, secIdx) => {
          const qList: number[] = [];
          for (let q = sec.startQuestion; q <= sec.endQuestion; q++) {
            qList.push(q);
          }

          return (
            <div key={secIdx} className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block px-0.5">
                {sec.name} (Q{sec.startQuestion} - Q{sec.endQuestion})
              </span>
              <div className="grid grid-cols-7 sm:grid-cols-9 gap-1">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
