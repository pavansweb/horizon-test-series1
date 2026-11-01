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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-gray-300 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#1e3a8a] text-white px-5 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base sm:text-lg">Examination Instructions</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-gray-800 leading-relaxed">
          <div>
            <h3 className="font-bold text-blue-900 mb-1">General Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-gray-700">
              <li>
                Total duration of the examination is <strong>{durationMinutes} minutes</strong> (3 hours).
              </li>
              <li>
                The countdown clock in the top right corner displays the remaining time available to you.
                When the timer reaches zero, the examination will end automatically.
              </li>
              <li>
                The Question Palette displayed on the right side of screen will show the status of each
                question using one of the following symbols:
              </li>
            </ol>
          </div>

          {/* Palette Legend Table */}
          <div className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-3">
              <NtaPaletteBadge number={1} status="not_visited" size="sm" />
              <span>You have not visited the question yet.</span>
            </div>
            <div className="flex items-center gap-3">
              <NtaPaletteBadge number={2} status="not_answered" size="sm" />
              <span>You have not answered the question.</span>
            </div>
            <div className="flex items-center gap-3">
              <NtaPaletteBadge number={3} status="answered" size="sm" />
              <span>You have answered the question.</span>
            </div>
            <div className="flex items-center gap-3">
              <NtaPaletteBadge number={4} status="marked_for_review" size="sm" />
              <span>You have NOT answered the question, but have marked the question for review.</span>
            </div>
            <div className="flex items-center gap-3">
              <NtaPaletteBadge number={5} status="answered_and_marked" size="sm" />
              <span>The question is answered and marked for review (will be considered for evaluation).</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-blue-900 mb-1">Marking Scheme:</h3>
            <ul className="list-disc list-inside space-y-1 pl-1 text-gray-700">
              <li>
                For each correct answer: <strong className="text-green-700">+{markingScheme.correct} marks</strong>
              </li>
              <li>
                For each incorrect answer: <strong className="text-red-600">{markingScheme.incorrect} mark</strong>
              </li>
              <li>
                For unattempted questions: <strong>{markingScheme.unattempted} marks</strong>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-blue-900 mb-1">Navigating to a Question:</h3>
            <p className="text-gray-700">
              To answer a question, you may click on the question number in the Question Palette directly,
              or use the Previous and Next controls. Click <strong>Save & Next</strong> to save your answer.
              Click <strong>Clear Response</strong> to deselect an answered option.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-5 py-3 border-t border-gray-300 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-[#1e3a8a] text-white font-bold text-xs sm:text-sm rounded hover:bg-blue-900 transition-all cursor-pointer"
          >
            Close Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
