'use client';

import React, { useState } from 'react';
import { SubjectConfig, CandidateResponseMap, QuestionStatus } from '@/lib/types';
import { NtaPaletteBadge, NtaLegendBadge } from './NtaPaletteBadge';

export type PaletteFilterStatus =
  | 'all'
  | 'answered'
  | 'not_answered'
  | 'marked_for_review'
  | 'answered_and_marked'
  | 'not_visited';

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
  const [statusFilter, setStatusFilter] = useState<PaletteFilterStatus>('all');

  // Determine section ranges: from subjects or chunks of questions
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

  const toggleFilter = (target: PaletteFilterStatus) => {
    setStatusFilter((prev) => (prev === target ? 'all' : target));
  };

  // Helper to determine if a question matches current filter
  const matchesFilter = (qNum: number): boolean => {
    if (statusFilter === 'all') return true;
    const resp = candidateResponses[qNum];
    const st: QuestionStatus = resp ? resp.status : 'not_visited';
    return st === statusFilter;
  };

  // Count how many questions match the active filter across the exam
  let totalMatchingFilter = 0;
  for (let q = 1; q <= totalQuestions; q++) {
    if (matchesFilter(q)) totalMatchingFilter++;
  }

  return (
    <div className="palette-container-wrap flex flex-col h-full select-none bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 p-3 sm:p-3.5 transition-colors">
      {/* Top Legend Area (Clickable to Filter) */}
      <div className="legend-wrap flex flex-col gap-2 pb-3 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Legend (Click to Filter)
          </span>
          {statusFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Row 1: Answered & Not Answered */}
        <div className="grid grid-cols-2 gap-2">
          <NtaLegendBadge
            status="answered"
            label="Answered"
            count={answeredCount}
            isSelected={statusFilter === 'answered'}
            onClick={() => toggleFilter('answered')}
          />
          <NtaLegendBadge
            status="not_answered"
            label="Not Answered"
            count={notAnsweredCount}
            isSelected={statusFilter === 'not_answered'}
            onClick={() => toggleFilter('not_answered')}
          />
        </div>

        {/* Row 2: Not Visited & Marked for Review */}
        <div className="grid grid-cols-2 gap-2">
          <NtaLegendBadge
            status="not_visited"
            label="Not Visited"
            count={notVisitedCount}
            isSelected={statusFilter === 'not_visited'}
            onClick={() => toggleFilter('not_visited')}
          />
          <NtaLegendBadge
            status="marked_for_review"
            label="Marked for Review"
            count={markedCount}
            isSelected={statusFilter === 'marked_for_review'}
            onClick={() => toggleFilter('marked_for_review')}
          />
        </div>

        {/* Row 3: Answered & Marked for Review */}
        <div className="mt-0.5">
          <NtaLegendBadge
            status="answered_and_marked"
            label="Ans. &amp; Marked for Review"
            count={markedAndAnsweredCount}
            isSelected={statusFilter === 'answered_and_marked'}
            onClick={() => toggleFilter('answered_and_marked')}
          />
        </div>
      </div>

      {/* Filter Quick Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 text-[10px] font-bold shrink-0">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
            statusFilter === 'all'
              ? 'bg-blue-700 text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          All ({totalQuestions})
        </button>
        <button
          type="button"
          onClick={() => toggleFilter('answered')}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
            statusFilter === 'answered'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
          }`}
        >
          Ans ({answeredCount})
        </button>
        <button
          type="button"
          onClick={() => toggleFilter('not_answered')}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
            statusFilter === 'not_answered'
              ? 'bg-red-700 text-white shadow-2xs'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
          }`}
        >
          Unans ({notAnsweredCount})
        </button>
        <button
          type="button"
          onClick={() => toggleFilter('marked_for_review')}
          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
            statusFilter === 'marked_for_review'
              ? 'bg-purple-700 text-white shadow-2xs'
              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300'
          }`}
        >
          Review ({markedCount})
        </button>
      </div>

      {/* Choose a Question Header */}
      <div className="bg-[#1e4273] dark:bg-slate-800 text-white px-2.5 py-1.5 rounded-t text-xs font-bold flex items-center justify-between shrink-0">
        <span>Questions Palette</span>
        <span className="text-[11px] text-blue-200 dark:text-slate-400">
          {statusFilter === 'all'
            ? `${totalQuestions} Questions`
            : `${totalMatchingFilter} / ${totalQuestions} filtered`}
        </span>
      </div>

      {/* Active Filter Notification Bar */}
      {statusFilter !== 'all' && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border-x border-b border-blue-200 dark:border-blue-900 px-2 py-1 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between shrink-0">
          <span>Filter: <strong>{statusFilter.replace(/_/g, ' ')}</strong> ({totalMatchingFilter})</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Show All
          </button>
        </div>
      )}

      {/* Question Grid Section */}
      <div className="palette-scroll-wrap flex-1 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/60 border border-t-0 border-slate-300 dark:border-slate-800 rounded-b flex flex-col gap-3 max-h-[calc(100vh-270px)]">
        {totalMatchingFilter === 0 && statusFilter !== 'all' ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <p className="text-xs">No questions currently marked as <strong>{statusFilter.replace(/_/g, ' ')}</strong>.</p>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Show all questions
            </button>
          </div>
        ) : (
          sections.map((sec, secIdx) => {
            const allQInSec: number[] = [];
            for (let q = sec.startQuestion; q <= sec.endQuestion; q++) {
              allQInSec.push(q);
            }

            const visibleQList = allQInSec.filter((qNum) => matchesFilter(qNum));

            if (visibleQList.length === 0 && statusFilter !== 'all') {
              return null;
            }

            return (
              <div key={secIdx} className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block px-0.5">
                  {sec.name} ({visibleQList.length} Qs)
                </span>
                <div className="grid grid-cols-7 sm:grid-cols-9 gap-1">
                  {visibleQList.map((qNum) => {
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
          })
        )}
      </div>
    </div>
  );
}
