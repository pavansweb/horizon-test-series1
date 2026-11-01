'use client';

import React from 'react';
import { SubjectConfig, CandidateResponseMap, QuestionStatus } from '@/lib/types';
import { AlertCircleIcon } from '@/components/icons/Icons';

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

  // Calculate totals
  const totalQuestions = breakdown.reduce((sum, b) => sum + b.total, 0);
  const totalAnswered = breakdown.reduce((sum, b) => sum + b.answered, 0);
  const totalNotAnswered = breakdown.reduce((sum, b) => sum + b.notAnswered, 0);
  const totalMarkedForReview = breakdown.reduce((sum, b) => sum + b.markedForReview, 0);
  const totalAnsweredAndMarked = breakdown.reduce((sum, b) => sum + b.answeredAndMarked, 0);
  const totalNotVisited = breakdown.reduce((sum, b) => sum + b.notVisited, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-gray-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white px-5 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base sm:text-lg">Examination Summary</h2>
          <span className="text-xs bg-blue-800 text-blue-100 px-2 py-0.5 rounded font-mono">
            NTA CBT
          </span>
        </div>

        {/* Content Table */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <p className="text-xs sm:text-sm text-gray-700 mb-3 font-medium">
            Please verify your test attempt summary before final submission:
          </p>

          <table className="w-full text-xs sm:text-sm text-left border-collapse border border-gray-300">
            <thead>
              <tr className="bg-[#f1f5f9] text-gray-800 font-bold border-b border-gray-300">
                <th className="p-2 border-r border-gray-300">Subject</th>
                <th className="p-2 text-center border-r border-gray-300">Total</th>
                <th className="p-2 text-center border-r border-gray-300 text-green-700">Answered</th>
                <th className="p-2 text-center border-r border-gray-300 text-red-600">Not Answered</th>
                <th className="p-2 text-center border-r border-gray-300 text-purple-700">Marked Review</th>
                <th className="p-2 text-center border-r border-gray-300 text-purple-800">Ans & Marked</th>
                <th className="p-2 text-center text-gray-500">Not Visited</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.name} className="border-b border-gray-200 hover:bg-gray-50 font-medium">
                  <td className="p-2 font-bold text-gray-900 border-r border-gray-300">{row.name}</td>
                  <td className="p-2 text-center border-r border-gray-300">{row.total}</td>
                  <td className="p-2 text-center border-r border-gray-300 text-green-700 font-bold">{row.answered}</td>
                  <td className="p-2 text-center border-r border-gray-300 text-red-600">{row.notAnswered}</td>
                  <td className="p-2 text-center border-r border-gray-300 text-purple-700">{row.markedForReview}</td>
                  <td className="p-2 text-center border-r border-gray-300 text-purple-800 font-bold">{row.answeredAndMarked}</td>
                  <td className="p-2 text-center text-gray-500">{row.notVisited}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-[#f8fafc] font-bold border-t-2 border-gray-300 text-gray-900">
                <td className="p-2 border-r border-gray-300">TOTAL</td>
                <td className="p-2 text-center border-r border-gray-300">{totalQuestions}</td>
                <td className="p-2 text-center border-r border-gray-300 text-green-700">{totalAnswered}</td>
                <td className="p-2 text-center border-r border-gray-300 text-red-600">{totalNotAnswered}</td>
                <td className="p-2 text-center border-r border-gray-300 text-purple-700">{totalMarkedForReview}</td>
                <td className="p-2 text-center border-r border-gray-300 text-purple-800">{totalAnsweredAndMarked}</td>
                <td className="p-2 text-center text-gray-500">{totalNotVisited}</td>
              </tr>
            </tbody>
          </table>

          {/* Warning box */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 flex items-start gap-2 text-xs sm:text-sm">
            <AlertCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Important Notice:</span> Are you sure you want to submit
              the test? Once submitted, you will not be able to change any answers. Your score and
              detailed analysis will be evaluated immediately.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-[#f1f5f9] px-5 py-3 border-t border-gray-300 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-all cursor-pointer shadow-2xs"
          >
            No, Resume Test
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#2ea44f] hover:bg-[#2c974b] active:bg-[#22863a] rounded transition-all cursor-pointer shadow-xs flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <span>Yes, Submit Examination</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
