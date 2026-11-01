'use client';

import React from 'react';
import { SubjectConfig, CandidateResponseMap, QuestionStatus } from '@/lib/types';
import { NtaPaletteBadge, NtaLegendBadge } from './NtaPaletteBadge';
import { UserIcon } from '@/components/icons/Icons';

interface NtaQuestionPaletteProps {
  subjects: SubjectConfig[];
  activeSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  currentQuestionNumber: number;
  onSelectQuestion: (questionNumber: number) => void;
  candidateResponses: CandidateResponseMap;
  onSubmitTest: () => void;
  candidateName?: string;
}

export function NtaQuestionPalette({
  subjects,
  activeSubjectId,
  onSelectSubject,
  currentQuestionNumber,
  onSelectQuestion,
  candidateResponses,
  onSubmitTest,
  candidateName = 'JEE Aspirant',
}: NtaQuestionPaletteProps) {
  // Find current subject
  const currentSubject = subjects.find((s) => s.id === activeSubjectId) || subjects[0];

  // Calculate global status counts
  const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
  const statusCounts: Record<QuestionStatus, number> = {
    not_visited: 0,
    not_answered: 0,
    answered: 0,
    marked_for_review: 0,
    answered_and_marked: 0,
  };

  for (let q = 1; q <= totalQuestions; q++) {
    const state = candidateResponses[q];
    const status: QuestionStatus = state ? state.status : 'not_visited';
    statusCounts[status]++;
  }

  // Questions in current subject
  const subjectQuestions: number[] = [];
  if (currentSubject) {
    for (let q = currentSubject.startQuestion; q <= currentSubject.endQuestion; q++) {
      subjectQuestions.push(q);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] border border-gray-300 rounded shadow-xs select-none">
      {/* Candidate Profile Box */}
      <div className="bg-[#e2e8f0] border-b border-gray-300 p-2.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs">
          <UserIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-xs sm:text-sm">{candidateName}</div>
          <div className="text-[11px] text-gray-600 font-medium">Candidate Roll: 2026-JEE-01</div>
        </div>
      </div>

      {/* Official NTA Status Legend */}
      <div className="p-2.5 bg-white border-b border-gray-200">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
          <NtaLegendBadge
            status="answered"
            count={statusCounts.answered}
            label="Answered"
          />
          <NtaLegendBadge
            status="not_answered"
            count={statusCounts.not_answered}
            label="Not Answered"
          />
          <NtaLegendBadge
            status="not_visited"
            count={statusCounts.not_visited}
            label="Not Visited"
          />
          <NtaLegendBadge
            status="marked_for_review"
            count={statusCounts.marked_for_review}
            label="Marked for Review"
          />
        </div>
        <div className="mt-1 pt-1 border-t border-gray-100">
          <NtaLegendBadge
            status="answered_and_marked"
            count={statusCounts.answered_and_marked}
            label="Ans & Marked for Review"
          />
        </div>
      </div>

      {/* Subject Section Selection */}
      <div className="bg-[#e9ecef] px-2 py-1.5 border-b border-gray-300 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectSubject(sub.id)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all ${
                sub.id === activeSubjectId
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-600 font-medium hidden sm:inline">
          Q. {currentSubject?.startQuestion} - {currentSubject?.endQuestion}
        </span>
      </div>

      {/* Question Number Palette Grid */}
      <div className="flex-1 p-3 overflow-y-auto max-h-[360px] sm:max-h-[440px] bg-white">
        <div className="grid grid-cols-5 gap-2">
          {subjectQuestions.map((qNum) => {
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

      {/* Palette Footer Submit Button */}
      <div className="p-2.5 bg-[#e2e8f0] border-t border-gray-300">
        <button
          type="button"
          onClick={onSubmitTest}
          className="w-full py-2 px-4 bg-[#2ea44f] hover:bg-[#2c974b] active:bg-[#22863a] text-white font-bold text-sm rounded shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Submit Test</span>
        </button>
      </div>
    </div>
  );
}
