'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PublicTest, CandidateResponseMap, QuestionStatus, isIntegerQuestion } from '@/lib/types';
import { NtaHeader } from '@/components/nta/NtaHeader';
import { NtaSubjectBar } from '@/components/nta/NtaSubjectBar';
import { NtaPdfViewer } from '@/components/nta/NtaPdfViewer';
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
      <div
        className="w-screen h-screen flex flex-col items-center justify-center"
        style={{ background: '#f8fafc' }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #1e4273',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '14px',
          }}
        />
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
          Loading Examination...
        </h2>
        <p style={{ fontSize: '12px', color: '#64748b' }}>
          Preparing HORIZON TEST SERIES environment
        </p>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center p-4"
        style={{ background: '#f8fafc' }}
      >
        <div
          style={{
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            padding: '24px 32px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>⚠️</div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Unable to Open Test
          </h2>
          <p style={{ fontSize: '12px', color: '#475569', marginBottom: '18px' }}>
            {error || 'The requested test could not be loaded.'}
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px 20px',
              fontSize: '12px',
              fontWeight: 700,
              background: '#1e4273',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="nta-exam-ui w-screen h-screen flex flex-col overflow-hidden"
      style={{
        background: '#f8fafc',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, Arial, sans-serif',
      }}
    >
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

      {/* 3. Outer Canvas with padding on left, right, and bottom (Generous left padding reveals plain page background behind) */}
      <div
        className="outer-canvas-wrap"
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
          padding: '12px 20px 16px 90px',
          background: '#e9edf2',
        }}
      >
        {/* The Big Brighter Box (Container fitting Question, Palette, 4 Options, Bottomline & Action Buttons) */}
        <div
          className="big-box-wrap"
          style={{
            flex: '1 1 0',
            display: 'flex',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.07)',
            overflow: 'hidden',
            minHeight: 0,
            position: 'relative',
            maxWidth: '1600px',
            width: '100%',
          }}
        >
          {/* Left Column: Question Area, PDF Embed, Options, Bottomline, Action Buttons */}
          <div
            className="left-col-wrap flex flex-col h-full overflow-y-auto"
            style={{
              flex: isPaletteCollapsed ? '1 1 100%' : '1 1 68%',
              minWidth: 0,
              background: '#ffffff',
            }}
          >
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

            {/* The Bottomline Divider */}
            <div style={{ borderTop: '1.5px solid #cbd5e1', width: '100%', margin: 0, flexShrink: 0 }} />

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
          <div
            style={{
              position: 'relative',
              width: '0px',
              zIndex: 20,
            }}
          >
            <button
              type="button"
              onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
              title={isPaletteCollapsed ? 'Show Question Palette' : 'Hide Question Palette'}
              style={{
                position: 'absolute',
                top: '50%',
                left: '-10px',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '34px',
                background: '#374151',
                color: '#ffffff',
                border: '1px solid #1f2937',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                zIndex: 30,
              }}
            >
              {isPaletteCollapsed ? '<' : '>'}
            </button>
          </div>

          {/* Right Column: Question Palette & Legend */}
          {!isPaletteCollapsed && (
            <div
              className="palette-wrap"
              style={{
                width: '380px',
                maxWidth: '390px',
                flexShrink: 0,
                height: '100%',
                overflow: 'hidden',
                background: '#ffffff',
                borderLeft: '1.5px solid #cbd5e1',
              }}
            >
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
