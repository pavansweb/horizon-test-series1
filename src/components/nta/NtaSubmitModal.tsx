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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border-2 border-[#1e4273] dark:border-blue-600 rounded-md max-w-2xl w-full overflow-hidden shadow-2xl transition-colors">
        {/* Header */}
        <div className="bg-[#1e4273] dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
            <span>📋</span>
            <span>EXAMINATION SUBMISSION SUMMARY</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-white hover:text-red-200 text-sm font-bold cursor-pointer disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
            Please verify your test attempt summary before final submission. Once submitted, answers cannot be modified:
          </p>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-blue-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                  <th className="p-2 text-left border-r border-slate-300 dark:border-slate-700">Subject</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700">Total Qs</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400">Answered</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-red-600 dark:text-red-400">Not Answered</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-purple-700 dark:text-purple-300">Marked Review</th>
                  <th className="p-2 border-r border-slate-300 dark:border-slate-700 text-indigo-700 dark:text-indigo-300">Ans &amp; Marked</th>
                  <th className="p-2 text-slate-600 dark:text-slate-400">Not Visited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {breakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2 text-left font-bold border-r border-slate-300 dark:border-slate-700">{row.name}</td>
                    <td className="p-2 border-r border-slate-300 dark:border-slate-700">{row.total}</td>
                    <td className="p-2 font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-700">{row.answered}</td>
                    <td className="p-2 font-bold text-red-600 dark:text-red-400 border-r border-slate-300 dark:border-slate-700">{row.notAnswered}</td>
                    <td className="p-2 font-bold text-purple-700 dark:text-purple-300 border-r border-slate-300 dark:border-slate-700">{row.markedForReview}</td>
                    <td className="p-2 font-bold text-indigo-700 dark:text-indigo-300 border-r border-slate-300 dark:border-slate-700">{row.answeredAndMarked}</td>
                    <td className="p-2 text-slate-500 dark:text-slate-400">{row.notVisited}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-300 dark:border-slate-700">
                  <td className="p-2 text-left border-r border-slate-300 dark:border-slate-700">Total</td>
                  <td className="p-2 border-r border-slate-300 dark:border-slate-700">{totalQuestions}</td>
                  <td className="p-2 text-emerald-700 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-700">{totalAnswered}</td>
                  <td className="p-2 text-red-600 dark:text-red-400 border-r border-slate-300 dark:border-slate-700">{totalNotAnswered}</td>
                  <td className="p-2 text-purple-700 dark:text-purple-300 border-r border-slate-300 dark:border-slate-700">{totalMarkedForReview}</td>
                  <td className="p-2 text-indigo-700 dark:text-indigo-300 border-r border-slate-300 dark:border-slate-700">{totalAnsweredAndMarked}</td>
                  <td className="p-2 text-slate-500 dark:text-slate-400">{totalNotVisited}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3 rounded text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <span className="font-bold block">⚠️ Important Reminder:</span>
            <p>
              Questions marked &quot;Answered &amp; Marked for Review&quot; WILL be evaluated in your final score.
              Once submitted, you will receive your immediate score analysis and solution report.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs rounded uppercase tracking-wider cursor-pointer disabled:opacity-40"
          >
            Return to Test
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <span>Confirm &amp; Submit Test</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
