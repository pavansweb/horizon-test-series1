import React from 'react';
import { SubjectConfig, CandidateResponseMap } from '@/lib/types';
import { FileTextIcon, InfoIcon } from '@/components/icons/Icons';

interface NtaSubjectBarProps {
  subjects: SubjectConfig[];
  activeSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  candidateResponses: CandidateResponseMap;
  onOpenInstructions: () => void;
  onOpenQuestionPaper: () => void;
}

export function NtaSubjectBar({
  subjects,
  activeSubjectId,
  onSelectSubject,
  candidateResponses,
  onOpenInstructions,
  onOpenQuestionPaper,
}: NtaSubjectBarProps) {
  // Count answered questions per subject
  const getSubjectStats = (subject: SubjectConfig) => {
    let answered = 0;
    for (let q = subject.startQuestion; q <= subject.endQuestion; q++) {
      const resp = candidateResponses[q];
      if (resp && (resp.status === 'answered' || resp.status === 'answered_and_marked')) {
        answered++;
      }
    }
    return { answered, total: subject.totalQuestions };
  };

  return (
    <div className="bg-[#f0f4f8] border-b border-gray-300 px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none">
      {/* Subject Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1 hidden sm:inline">
          Sections:
        </span>
        {subjects.map((subject) => {
          const isActive = subject.id === activeSubjectId;
          const stats = getSubjectStats(subject);

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject.id)}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-t transition-all flex items-center gap-1.5 border-t border-x ${
                isActive
                  ? 'bg-white text-blue-900 border-gray-300 shadow-sm relative -mb-2 pb-2.5 z-10'
                  : 'bg-gray-200 text-gray-700 border-transparent hover:bg-gray-300'
              }`}
            >
              <span className="uppercase">{subject.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-300 text-gray-800'
                }`}
              >
                {stats.answered}/{stats.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Auxiliary CBT Buttons: Instructions & Question Paper */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenQuestionPaper}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-2xs"
          title="View entire Question Paper overview"
        >
          <FileTextIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>Question Paper</span>
        </button>

        <button
          type="button"
          onClick={onOpenInstructions}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-2xs"
          title="View Exam Instructions"
        >
          <InfoIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>Instructions</span>
        </button>
      </div>
    </div>
  );
}
