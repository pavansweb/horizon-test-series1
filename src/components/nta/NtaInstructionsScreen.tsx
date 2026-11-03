'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PublicTest } from '@/lib/types';
import { NtaPaletteBadge } from './NtaPaletteBadge';

interface NtaInstructionsScreenProps {
  test: PublicTest;
  isOpen: boolean;
  onClose: () => void;
  onProceed: (candidateName: string) => void;
}

export function NtaInstructionsScreen({
  test,
  isOpen,
  onClose,
  onProceed,
}: NtaInstructionsScreenProps) {
  const [candidateName, setCandidateName] = useState<string>('');
  const [isDeclared, setIsDeclared] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>('');
  const [declarationError, setDeclarationError] = useState<string>('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('cbt_candidate_name') || '';
        setCandidateName(saved);
      } catch {
        setCandidateName('');
      }
      setIsDeclared(false);
      setNameError('');
      setDeclarationError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProceedClick = () => {
    const trimmed = candidateName.trim();
    if (!trimmed) {
      setNameError('Please enter your candidate name before proceeding.');
      nameInputRef.current?.focus();
      return;
    }
    if (!isDeclared) {
      setDeclarationError('Please select the declaration checkbox to confirm you have read the instructions.');
      return;
    }

    try {
      localStorage.setItem('cbt_candidate_name', trimmed);
    } catch {}

    onProceed(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans select-none animate-fade-in">
      {/* Top Bar */}
      <header className="bg-[#1e3a8a] dark:bg-slate-950 text-white px-4 sm:px-6 py-3 border-b border-blue-900 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base sm:text-lg tracking-tight">Horizon-Test-series</span>
          <span className="text-xs bg-blue-900/60 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-200 border border-blue-700/40">
            CBT Examination Instructions
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white hover:text-red-200 text-sm font-bold px-2 py-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          title="Close instructions"
        >
          ✕ Cancel
        </button>
      </header>

      {/* Test Overview Sub-Header */}
      <div className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Selected Examination:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">{test.title}</span>
          </div>
          <div className="text-slate-600 dark:text-slate-400 flex items-center gap-3 shrink-0">
            <span>Duration: <strong className="text-slate-800 dark:text-slate-200">{test.duration} mins</strong></span>
            <span>•</span>
            <span>Total Marks: <strong className="text-slate-800 dark:text-slate-200">{test.totalMarks}</strong></span>
          </div>
        </div>
      </div>

      {/* Instructions Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 space-y-6 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
        {/* Main Title Centered */}
        <h2 className="text-base sm:text-lg font-bold text-center text-slate-900 dark:text-slate-100">
          Please read the Instructions carefully
        </h2>

        {/* Section 1: General Instructions */}
        <div className="space-y-3">
          <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-[14px]">
            General Instructions:
          </h3>
          <ol className="list-decimal pl-6 space-y-2.5">
            <li>
              Total duration of {test.title || 'JEE-Main Paper'} is {test.duration} min.
            </li>
            <li>
              The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You will not be required to end or submit your examination.
            </li>
            <li>
              The Questions Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
              <div className="space-y-2 mt-2 pl-2">
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-slate-500">1.</span>
                  <NtaPaletteBadge number={1} status="not_visited" size="sm" />
                  <span>You have not visited the question yet.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-slate-500">2.</span>
                  <NtaPaletteBadge number={2} status="not_answered" size="sm" />
                  <span>You have not answered the question.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-slate-500">3.</span>
                  <NtaPaletteBadge number={3} status="answered" size="sm" />
                  <span>You have answered the question.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-slate-500">4.</span>
                  <NtaPaletteBadge number={4} status="marked_for_review" size="sm" />
                  <span>You have NOT answered the question, but have marked the question for review.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-slate-500">5.</span>
                  <NtaPaletteBadge number={5} status="answered_and_marked" size="sm" />
                  <span>The question(s) &quot;Answered and Marked for Review&quot; will be considered for evaluation.</span>
                </div>
              </div>
            </li>
            <li>
              You can click on the &quot;&gt;&quot; arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on &quot;&lt;&quot; which appears on the right side of question window.
            </li>
            <li>
              You can click on your &quot;Profile&quot; image on top right corner of your screen to change the language during the exam for entire question paper. On clicking of Profile image you will get a drop-down to change the question content to the desired language.
            </li>
            <li>
              You can click on{' '}
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold mx-0.5">
                ↓
              </span>{' '}
              to navigate to the bottom and{' '}
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold mx-0.5">
                ↑
              </span>{' '}
              to navigate to top of the question area, without scrolling.
            </li>
          </ol>
        </div>

        {/* Section 2: Navigating to a Question */}
        <div className="space-y-3">
          <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-[14px]">
            Navigating to a Question:
          </h3>
          <ol start={7} className="list-decimal pl-6 space-y-2.5">
            <li>
              To answer a question, do the following:
              <ol className="list-[lower-alpha] pl-5 space-y-1.5 mt-1">
                <li>
                  Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.
                </li>
                <li>
                  Click on <strong>Save &amp; Next</strong> to save your answer for the current question and then go to the next question.
                </li>
                <li>
                  Click on <strong>Mark for Review &amp; Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.
                </li>
              </ol>
            </li>
          </ol>
        </div>

        {/* Section 3: Answering a Question */}
        <div className="space-y-3">
          <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-[14px]">
            Answering a Question:
          </h3>
          <ol start={8} className="list-decimal pl-6 space-y-2.5">
            <li>
              Procedure for answering a multiple choice type question:
              <ol className="list-[lower-alpha] pl-5 space-y-1.5 mt-1">
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
        <div className="space-y-3">
          <h3 className="font-bold underline text-slate-900 dark:text-slate-100 text-[14px]">
            Navigating through sections:
          </h3>
          <ol start={10} className="list-decimal pl-6 space-y-2.5">
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

        {/* Red notice text */}
        <p className="text-red-600 dark:text-red-400 text-xs font-medium pt-2">
          Please note all questions will appear in your default language. This language can be changed for a particular question later on.
        </p>

        <hr className="border-slate-300 dark:border-slate-700 my-4" />

        {/* Candidate Name Input Section - Prominently positioned just above Declaration Checkbox */}
        <section
          aria-labelledby="candidate-name-heading"
          className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${
            nameError
              ? 'bg-red-50/90 dark:bg-red-950/40 border-red-400 dark:border-red-700 shadow-sm'
              : 'bg-blue-50/70 dark:bg-slate-800/90 border-blue-200 dark:border-blue-900/60 shadow-sm'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <div className="flex-1">
              <label
                id="candidate-name-heading"
                htmlFor="inst-candidate-name"
                className="block text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Enter Candidate Name <span className="text-red-500 font-extrabold">*</span>
              </label>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 mb-2.5">
                This name will appear on your examination screen, question palette, and official score report.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  ref={nameInputRef}
                  id="inst-candidate-name"
                  type="text"
                  placeholder="Enter your name (e.g. Rahul Sharma)"
                  value={candidateName}
                  onChange={(e) => {
                    setCandidateName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProceedClick();
                    }
                  }}
                  className={`w-full sm:max-w-md px-3.5 py-2.5 text-sm sm:text-base rounded-lg border-2 font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    nameError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/40'
                      : 'border-slate-300 dark:border-slate-600 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-blue-100 dark:focus:ring-blue-900/40'
                  }`}
                />
              </div>
              {nameError && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1.5">
                  <span>⚠</span> {nameError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Declaration Checkbox */}
        <div className="space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isDeclared}
              onChange={(e) => {
                setIsDeclared(e.target.checked);
                if (declarationError) setDeclarationError('');
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
            />
            <span>
              I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. / any prohibited material with me into the Examination Hall. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations.
            </span>
          </label>
          {declarationError && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 pl-6.5">
              {declarationError}
            </p>
          )}
        </div>

        <hr className="border-slate-300 dark:border-slate-700 my-4" />

        {/* Bottom PROCEED Button */}
        <div className="flex flex-col items-center justify-center pb-8 pt-2">
          <button
            type="button"
            onClick={handleProceedClick}
            disabled={!isDeclared}
            className={`px-12 py-2.5 rounded text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
              isDeclared
                ? 'bg-[#4caf50] hover:bg-[#43a047] active:bg-[#388e3c] cursor-pointer'
                : 'bg-emerald-600/40 cursor-not-allowed opacity-60'
            }`}
          >
            PROCEED
          </button>
        </div>
      </main>
    </div>
  );
}
