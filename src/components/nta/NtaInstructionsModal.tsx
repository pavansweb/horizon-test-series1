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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  markingScheme,
}: NtaInstructionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border-2 border-[#1e4273] dark:border-blue-600 rounded-md max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl transition-colors">
        {/* Header */}
        <div className="bg-[#1e4273] dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <span>📖</span>
            <span>EXAMINATION INSTRUCTIONS</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-red-200 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1 space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-center text-slate-900 dark:text-slate-100">
            Please read the Instructions carefully
          </h2>

          {/* Section 1: General Instructions */}
          <div className="space-y-2">
            <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-xs">
              General Instructions:
            </h3>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>
                Total duration of the examination is <strong>{durationMinutes} minutes</strong>.
              </li>
              <li>
                The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.
              </li>
              <li>
                The Questions Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                <div className="space-y-1.5 mt-2 pl-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 text-xs font-semibold text-slate-400">1.</span>
                    <NtaPaletteBadge number={1} status="not_visited" size="sm" />
                    <span>You have not visited the question yet.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 text-xs font-semibold text-slate-400">2.</span>
                    <NtaPaletteBadge number={2} status="not_answered" size="sm" />
                    <span>You have not answered the question.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 text-xs font-semibold text-slate-400">3.</span>
                    <NtaPaletteBadge number={3} status="answered" size="sm" />
                    <span>You have answered the question.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 text-xs font-semibold text-slate-400">4.</span>
                    <NtaPaletteBadge number={4} status="marked_for_review" size="sm" />
                    <span>You have NOT answered the question, but have marked the question for review.</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 text-xs font-semibold text-slate-400">5.</span>
                    <NtaPaletteBadge number={5} status="answered_and_marked" size="sm" />
                    <span>The question(s) &quot;Answered and Marked for Review&quot; will be considered for evaluation.</span>
                  </div>
                </div>
              </li>
              <li>
                You can click on the &quot;&gt;&quot; arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on &quot;&lt;&quot; which appears on the right side of question window.
              </li>
              <li>
                You can click on your &quot;Profile&quot; image on top right corner of your screen to change the language during the exam for entire question paper.
              </li>
              <li>
                You can click on{' '}
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  ↓
                </span>{' '}
                to navigate to the bottom and{' '}
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  ↑
                </span>{' '}
                to navigate to top of the question area, without scrolling.
              </li>
            </ol>
          </div>

          {/* Section 2: Navigating to a Question */}
          <div className="space-y-2">
            <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-xs">
              Navigating to a Question:
            </h3>
            <ol start={7} className="list-decimal pl-5 space-y-1.5">
              <li>
                To answer a question, do the following:
                <ol className="list-[lower-alpha] pl-4 space-y-1 mt-1">
                  <li>Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                  <li>Click on <strong>Save &amp; Next</strong> to save your answer for the current question and then go to the next question.</li>
                  <li>Click on <strong>Mark for Review &amp; Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                </ol>
              </li>
            </ol>
          </div>

          {/* Section 3: Answering a Question */}
          <div className="space-y-2">
            <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-xs">
              Answering a Question:
            </h3>
            <ol start={8} className="list-decimal pl-5 space-y-1.5">
              <li>
                Procedure for answering a multiple choice type question:
                <ol className="list-[lower-alpha] pl-4 space-y-1 mt-1">
                  <li>To select your answer, click on the button of one of the options.</li>
                  <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                  <li>To change your chosen answer, click on the button of another option.</li>
                  <li>To save your answer, you MUST click on the <strong>Save &amp; Next</strong> button.</li>
                  <li>To mark the question for review, click on the <strong>Mark for Review &amp; Next</strong> button.</li>
                </ol>
              </li>
              <li>
                To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.
              </li>
            </ol>
          </div>

          {/* Section 4: Navigating through sections */}
          <div className="space-y-2">
            <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-xs">
              Navigating through sections:
            </h3>
            <ol start={10} className="list-decimal pl-5 space-y-1.5">
              <li>
                Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by clicking on the section name. The section you are currently viewing is highlighted.
              </li>
              <li>
                After clicking the Save &amp; Next button on the last question for a section, you will automatically be taken to the first question of the next section.
              </li>
              <li>
                You can shuffle between sections and questions anytime during the examination as per your convenience only during the time stipulated.
              </li>
              <li>
                Candidate can view the corresponding section summary as part of the legend that appears in every section above the question palette.
              </li>
            </ol>
          </div>

          <p className="text-red-600 dark:text-red-400 text-[11px] font-medium pt-1">
            Please note all questions will appear in your default language. This language can be changed for a particular question later on.
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer transition-colors"
          >
            Close Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
