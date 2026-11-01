'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PublicTest, CandidateResponseMap, QuestionStatus } from '@/lib/types';
import { NtaHeader } from '@/components/nta/NtaHeader';
import { NtaSubjectBar } from '@/components/nta/NtaSubjectBar';
import { NtaPdfViewer } from '@/components/nta/NtaPdfViewer';
import { NtaOptionSelector } from '@/components/nta/NtaOptionSelector';
import { NtaActionBar } from '@/components/nta/NtaActionBar';
import { NtaQuestionPalette } from '@/components/nta/NtaQuestionPalette';
import { NtaSubmitModal } from '@/components/nta/NtaSubmitModal';
import { NtaInstructionsModal } from '@/components/nta/NtaInstructionsModal';

export default function TestAttemptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const testId = params.id;

  const [test, setTest] = useState<PublicTest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active question and subject state
  const [activeSubjectId, setActiveSubjectId] = useState<string>('physics');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Responses map: questionNumber -> { selectedOption, status, visited }
  const [candidateResponses, setCandidateResponses] = useState<CandidateResponseMap>({});

  // Timer
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(180 * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

            // Set current selected option from restored state
            const currentResp = parsed.candidateResponses?.[parsed.currentQuestionNumber || 1];
            if (currentResp) setSelectedOption(currentResp.selectedOption || null);
          } catch (e) {
            console.warn('Failed to restore saved session:', e);
          }
        } else {
          // Initialize timer from test duration
          setTimeRemainingSeconds(loadedTest.duration * 60);

          // Mark first question as visited
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
        // Mark as not_answered if just visiting
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

  // Auto-save to localStorage whenever candidate responses or active question changes
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
      // Ignore quota exceeded
    }
  }, [candidateResponses, timeRemainingSeconds, currentQuestionNumber, activeSubjectId, testId, storageKey, test]);

  // Submit test handler
  const handleFinalSubmit = useCallback(async () => {
    if (!test || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Build simplified answers map for submission
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
          candidateName: 'JEE Aspirant',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit test');
        setIsSubmitting(false);
        return;
      }

      // Submission successful - clear auto-save and redirect to results
      localStorage.removeItem(storageKey);
      router.push(`/result/${data.submissionId}`);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Network error while submitting. Please check connection and try again.');
      setIsSubmitting(false);
    }
  }, [test, isSubmitting, candidateResponses, timeRemainingSeconds, testId, storageKey, router]);

  // Countdown timer effect
  useEffect(() => {
    if (loading || !test) return;

    timerRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto submit when time runs out
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

  // Actions
  const totalQuestionsCount = test
    ? test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0)
    : 90;

  const navigateToQuestion = (qNum: number) => {
    if (qNum < 1 || qNum > totalQuestionsCount) return;
    setCurrentQuestionNumber(qNum);
  };

  const handleSaveAndNext = () => {
    // If option is selected, mark as 'answered', otherwise keep as 'not_answered'
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
    // If an option was selected, it becomes 'answered_and_marked'
    // If no option was selected, it becomes 'marked_for_review'
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

  const handleSubjectChange = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    if (!test) return;
    const targetSub = test.subjects.find((s) => s.id === subjectId);
    if (targetSub) {
      navigateToQuestion(targetSub.startQuestion);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-gray-800">Loading JEE Main Examination...</h2>
        <p className="text-sm text-gray-500">Preparing question paper and CBT interface</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center border border-gray-200">
          <div className="text-red-500 text-5xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Test Unavailable</h2>
          <p className="text-sm text-gray-600 mb-4">{error || 'Could not find requested test paper.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 transition-all cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const currentSubject =
    test.subjects.find((s) => s.id === activeSubjectId) || test.subjects[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#eef2f6] text-gray-900 font-sans select-none overflow-x-hidden">
      {/* 1. Official NTA Header with Timer & Candidate Info */}
      <NtaHeader
        testTitle={test.title}
        candidateName="JEE Aspirant"
        timeRemainingSeconds={timeRemainingSeconds}
      />

      {/* 2. NTA Subject Bar (Sections & Quick Tools) */}
      <NtaSubjectBar
        subjects={test.subjects}
        activeSubjectId={activeSubjectId}
        onSelectSubject={handleSubjectChange}
        candidateResponses={candidateResponses}
        onOpenInstructions={() => setIsInstructionsOpen(true)}
        onOpenQuestionPaper={() => setIsInstructionsOpen(true)}
      />

      {/* 3. Main Examination CBT Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Left Side: Question Paper PDF & Options & Action Bar (approx 75%) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3">
          {/* Scrollable PDF Viewer */}
          <NtaPdfViewer
            pdfUrl={test.pdfUrl}
            currentQuestionNumber={currentQuestionNumber}
            subjectName={currentSubject.name}
            markingScheme={test.markingScheme}
          />

          {/* Selectable Options Area (A, B, C, D) */}
          <NtaOptionSelector
            currentQuestionNumber={currentQuestionNumber}
            selectedOption={selectedOption}
            onSelectOption={(opt) => setSelectedOption(opt)}
            onClearResponse={handleClearResponse}
          />

          {/* Bottom Action Bar (Save & Next, Review, Previous, Next) */}
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

        {/* Right Side: Candidate Card & Question Palette (approx 25%) */}
        <aside className="lg:col-span-4 xl:col-span-3 sticky top-2">
          <NtaQuestionPalette
            subjects={test.subjects}
            activeSubjectId={activeSubjectId}
            onSelectSubject={handleSubjectChange}
            currentQuestionNumber={currentQuestionNumber}
            onSelectQuestion={navigateToQuestion}
            candidateResponses={candidateResponses}
            onSubmitTest={() => setIsSubmitModalOpen(true)}
            candidateName="JEE Aspirant"
          />
        </aside>
      </main>

      {/* 4. Submission Confirmation Modal */}
      <NtaSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
        subjects={test.subjects}
        candidateResponses={candidateResponses}
      />

      {/* 5. Instructions Modal */}
      <NtaInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        durationMinutes={test.duration}
        markingScheme={test.markingScheme}
      />
    </div>
  );
}
