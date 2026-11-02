'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PublicTest, CandidateResponseMap, QuestionStatus, isIntegerQuestion } from '@/lib/types';
import { NtaHeader } from '@/components/nta/NtaHeader';
import { NtaSubjectBar } from '@/components/nta/NtaSubjectBar';
import { NtaPdfViewer } from '@/components/nta/NtaPdfViewer';
import { NtaQuestionDisplay } from '@/components/nta/NtaQuestionDisplay';
import { NtaOptionSelector } from '@/components/nta/NtaOptionSelector';
import { NtaActionBar } from '@/components/nta/NtaActionBar';
import { NtaQuestionPalette } from '@/components/nta/NtaQuestionPalette';
import { NtaSubmitModal } from '@/components/nta/NtaSubmitModal';
import { NtaInstructionsModal } from '@/components/nta/NtaInstructionsModal';

export default function TestAttemptPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { name?: string };
}) {
  const router = useRouter();
  const testId = params.id;

  const candidateName = searchParams?.name?.trim() || 'JEE Aspirant';

  const [test, setTest] = useState<PublicTest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active question and subject state
  const [activeSubjectId, setActiveSubjectId] = useState<string>('physics');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Responses map: questionNumber -> { selectedOption, status, visited }
  const [candidateResponses, setCandidateResponses] = useState<CandidateResponseMap>({});

  // Timer
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(180 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Palette collapse toggle (for the '>' toggle button on divider)
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState<boolean>(false);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-save storage key
  const storageKey = `jee_cbt_attempt_${testId}`;

  // Fetch test details
  useEffect(() => {
    async function loadTest() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tests/${testId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load test paper');
          return;
        }

        const loadedTest: PublicTest = data.test;
        setTest(loadedTest);

        // Check if there's a saved progress session in localStorage
        const savedSession = localStorage.getItem(storageKey);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed.candidateResponses) setCandidateResponses(parsed.candidateResponses);
            if (parsed.timeRemainingSeconds !== undefined) {
              setTimeRemainingSeconds(Math.max(parsed.timeRemainingSeconds, 10));
            }
            if (parsed.currentQuestionNumber) setCurrentQuestionNumber(parsed.currentQuestionNumber);
            if (parsed.activeSubjectId) setActiveSubjectId(parsed.activeSubjectId);

            const currentResp = parsed.candidateResponses?.[parsed.currentQuestionNumber || 1];
            if (currentResp) setSelectedOption(currentResp.selectedOption || null);
          } catch (e) {
            console.warn('Failed to restore saved session:', e);
          }
        } else {
          setTimeRemainingSeconds(loadedTest.duration * 60);
          setCandidateResponses({
            1: { selectedOption: null, status: 'not_answered', visited: true },
          });
          if (loadedTest.subjects && loadedTest.subjects[0]) {
            setActiveSubjectId(loadedTest.subjects[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching test:', err);
        setError('Failed to connect to the test server');
      } finally {
        setLoading(false);
      }
    }

    loadTest();
  }, [testId, storageKey]);

  // Sync selectedOption whenever currentQuestionNumber changes
  useEffect(() => {
    setCandidateResponses((prev) => {
      const existing = prev[currentQuestionNumber];
      if (existing) {
        setSelectedOption(existing.selectedOption);
        return prev;
      } else {
        setSelectedOption(null);
        return {
          ...prev,
          [currentQuestionNumber]: {
            selectedOption: null,
            status: 'not_answered',
            visited: true,
          },
        };
      }
    });
  }, [currentQuestionNumber]);

  // Update active subject when current question changes
  useEffect(() => {
    if (!test || !test.subjects) return;
    const sub = test.subjects.find(
      (s) => currentQuestionNumber >= s.startQuestion && currentQuestionNumber <= s.endQuestion
    );
    if (sub && sub.id !== activeSubjectId) {
      setActiveSubjectId(sub.id);
    }
  }, [currentQuestionNumber, test, activeSubjectId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!test) return;
    const sessionData = {
      testId,
      candidateResponses,
      timeRemainingSeconds,
      currentQuestionNumber,
      activeSubjectId,
      lastSaved: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessionData));
    } catch {
      // Ignore
    }
  }, [candidateResponses, timeRemainingSeconds, currentQuestionNumber, activeSubjectId, testId, storageKey, test]);

  // Submit test handler
  const handleFinalSubmit = useCallback(async () => {
    if (!test || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const answers: Record<number, string | null> = {};
      const totalQ = test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

      for (let q = 1; q <= totalQ; q++) {
        const resp = candidateResponses[q];
        answers[q] = resp?.selectedOption || null;
      }

      const timeTaken = test.duration * 60 - timeRemainingSeconds;

      const res = await fetch(`/api/tests/${testId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          candidateResponses: answers,
          timeTakenSeconds: Math.max(timeTaken, 0),
          candidateName: candidateName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit test');
        setIsSubmitting(false);
        return;
      }

      localStorage.removeItem(storageKey);
      router.push(`/result/${data.submissionId}`);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Network error while submitting. Please check connection and try again.');
      setIsSubmitting(false);
    }
  }, [test, isSubmitting, candidateResponses, timeRemainingSeconds, testId, storageKey, candidateName, router]);

  // Timer countdown
  useEffect(() => {
    if (loading || !test) return;

    timerRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, test, handleFinalSubmit]);

  const totalQuestionsCount = test
    ? test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0)
    : 90;

  const navigateToQuestion = (qNum: number) => {
    if (qNum < 1 || qNum > totalQuestionsCount) return;
    setCurrentQuestionNumber(qNum);

    if (test) {
      for (const sub of test.subjects) {
        if (qNum >= sub.startQuestion && qNum <= sub.endQuestion) {
          setActiveSubjectId(sub.id);
          if (activeFilter !== 'all' && activeFilter !== sub.id) {
            setActiveFilter(sub.id);
          }
          break;
        }
      }
    }
  };

  const handleSaveAndNext = () => {
    const newStatus: QuestionStatus = selectedOption ? 'answered' : 'not_answered';

    setCandidateResponses((prev) => ({
      ...prev,
      [currentQuestionNumber]: {
        selectedOption: selectedOption,
        status: newStatus,
        visited: true,
      },
    }));

    if (currentQuestionNumber < totalQuestionsCount) {
      navigateToQuestion(currentQuestionNumber + 1);
    }
  };

  const handleSaveAndMarkForReview = () => {
    if (!selectedOption) return;

    setCandidateResponses((prev) => ({
      ...prev,
      [currentQuestionNumber]: {
        selectedOption: selectedOption,
        status: 'answered_and_marked',
        visited: true,
      },
    }));

    if (currentQuestionNumber < totalQuestionsCount) {
      navigateToQuestion(currentQuestionNumber + 1);
    }
  };

  const handleClearResponse = () => {
    setSelectedOption(null);
    setCandidateResponses((prev) => ({
      ...prev,
      [currentQuestionNumber]: {
        selectedOption: null,
        status: 'not_answered',
        visited: true,
      },
    }));
  };

  const handleMarkForReviewAndNext = () => {
    const newStatus: QuestionStatus = selectedOption
      ? 'answered_and_marked'
      : 'marked_for_review';

    setCandidateResponses((prev) => ({
      ...prev,
      [currentQuestionNumber]: {
        selectedOption: selectedOption,
        status: newStatus,
        visited: true,
      },
    }));

    if (currentQuestionNumber < totalQuestionsCount) {
      navigateToQuestion(currentQuestionNumber + 1);
    }
  };

  const handleSelectFilter = (filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'all') {
      setActiveSubjectId(filter);
      if (!test) return;
      const targetSub = test.subjects.find((s) => s.id === filter);
      if (targetSub && (currentQuestionNumber < targetSub.startQuestion || currentQuestionNumber > targetSub.endQuestion)) {
        navigateToQuestion(targetSub.startQuestion);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <h2 className="text-base font-bold mb-1">Loading Examination...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Preparing HORIZON TEST SERIES environment
        </p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-6 max-w-md w-full text-center shadow-lg">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Unable to Open Test
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
            {error || 'The requested test could not be loaded.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="nta-exam-ui w-screen h-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Header with HORIZON TEST SERIES branding & Pill Timer */}
      <NtaHeader
        candidateName={candidateName}
        timeRemainingSeconds={timeRemainingSeconds}
        onSubmitTest={() => setIsSubmitModalOpen(true)}
      />

      {/* 2. Dark Navy Subject Navigation Bar */}
      <NtaSubjectBar
        subjects={test.subjects}
        activeSubjectId={activeSubjectId}
        activeFilter={activeFilter}
        onSelectFilter={handleSelectFilter}
      />

      {/* 3. Outer Canvas */}
      <div className="outer-canvas-wrap flex-1 flex flex-col overflow-hidden min-h-0 p-2 sm:p-3 md:p-4 bg-slate-200 dark:bg-slate-950 transition-colors">
        {/* The Big Container fitting Question, Palette, Options, Action Buttons */}
        <div className="big-box-wrap flex-1 flex bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded shadow-md overflow-hidden min-h-0 relative max-w-[1600px] w-full mx-auto transition-colors">
          {/* Left Column: Question Area, Options, Bottomline, Action Buttons */}
          <div
            className="left-col-wrap flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900 transition-colors"
            style={{
              flex: isPaletteCollapsed ? '1 1 100%' : '1 1 68%',
              minWidth: 0,
            }}
          >
            {/* Render actual structured question if available, otherwise fallback to PDF viewer */}
            {test.questions && test.questions.length > 0 && test.questions.find((q) => q.questionNumber === currentQuestionNumber) ? (
              <NtaQuestionDisplay
                question={test.questions.find((q) => q.questionNumber === currentQuestionNumber)!}
                currentQuestionNumber={currentQuestionNumber}
                totalQuestions={totalQuestionsCount}
                selectedOption={selectedOption}
                onSelectOption={(opt) => setSelectedOption(opt)}
                onClearResponse={handleClearResponse}
                pdfUrl={test.pdfUrl}
                pdfStartPage={test.pdfStartPage}
                pdfEndPage={test.pdfEndPage}
              />
            ) : (
              <>
                {/* Scrollable Compact PDF Question Embed */}
                <NtaPdfViewer
                  pdfUrl={test.pdfUrl}
                  currentQuestionNumber={currentQuestionNumber}
                  startPage={test.pdfStartPage}
                  endPage={test.pdfEndPage}
                />

                {/* Vertical Options 1), 2), 3), 4) or Numerical Value Keypad */}
                <NtaOptionSelector
                  currentQuestionNumber={currentQuestionNumber}
                  selectedOption={selectedOption}
                  onSelectOption={(opt) => setSelectedOption(opt)}
                  onClearResponse={handleClearResponse}
                  isInteger={isIntegerQuestion(currentQuestionNumber, test.integerQuestions)}
                />
              </>
            )}

            <div className="flex-1" />

            {/* Action Buttons Bar: Save & Next, Save & Mark, Mark for Review, Back, Next, Submit */}
            <NtaActionBar
              onSaveAndNext={handleSaveAndNext}
              onSaveAndMarkForReview={handleSaveAndMarkForReview}
              onClearResponse={handleClearResponse}
              onMarkForReviewAndNext={handleMarkForReviewAndNext}
              onPrevious={() => navigateToQuestion(currentQuestionNumber - 1)}
              onNext={() => navigateToQuestion(currentQuestionNumber + 1)}
              onSubmitTest={() => setIsSubmitModalOpen(true)}
              isFirstQuestion={currentQuestionNumber <= 1}
              isLastQuestion={currentQuestionNumber >= totalQuestionsCount}
              hasSelectedOption={!!selectedOption}
            />
          </div>

          {/* Center Splitter with Collapse/Expand Arrow Button ('>') */}
          <div className="relative w-0 z-20">
            <button
              type="button"
              onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
              title={isPaletteCollapsed ? 'Show Question Palette' : 'Hide Question Palette'}
              className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-9 bg-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xs flex items-center justify-center cursor-pointer text-xs font-bold shadow-md z-30"
            >
              {isPaletteCollapsed ? '‹' : '›'}
            </button>
          </div>

          {/* Right Column: Question Palette & Legend */}
          {!isPaletteCollapsed && (
            <div className="palette-wrap w-[340px] sm:w-[380px] max-w-[400px] shrink-0 h-full overflow-hidden bg-white dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 transition-colors">
              <NtaQuestionPalette
                subjects={test.subjects}
                activeSubjectId={activeSubjectId}
                activeFilter={activeFilter}
                currentQuestionNumber={currentQuestionNumber}
                onSelectQuestion={navigateToQuestion}
                candidateResponses={candidateResponses}
              />
            </div>
          )}
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      <NtaSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
        subjects={test.subjects}
        candidateResponses={candidateResponses}
      />

      {/* Instructions Modal */}
      <NtaInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        durationMinutes={test.duration}
        markingScheme={test.markingScheme}
      />
    </div>
  );
}
