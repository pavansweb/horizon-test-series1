import crypto from 'crypto';
import { Test, TestResult, SubjectResult, QuestionReviewItem, TestSubmissionRequest } from './types';

export function calculateTestResult(
  test: Test,
  submission: TestSubmissionRequest
): TestResult {
  const { candidateResponses, timeTakenSeconds, candidateName = 'JEE Aspirant' } = submission;
  const { markingScheme, subjects, answerKey } = test;

  const subjectResultsMap = new Map<string, {
    subjectId: string;
    subjectName: string;
    score: number;
    maxScore: number;
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
  }>();

  // Initialize subjects
  for (const subject of subjects) {
    subjectResultsMap.set(subject.id, {
      subjectId: subject.id,
      subjectName: subject.name,
      score: 0,
      maxScore: subject.totalQuestions * markingScheme.correct,
      totalQuestions: subject.totalQuestions,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unattempted: 0,
    });
  }

  const questionReviews: QuestionReviewItem[] = [];
  let totalScore = 0;
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalUnattempted = 0;

  // Total questions count across all subjects
  const allQuestionsTotal = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  for (let qNum = 1; qNum <= allQuestionsTotal; qNum++) {
    // Find which subject this question belongs to
    const subject = subjects.find(
      (s) => qNum >= s.startQuestion && qNum <= s.endQuestion
    ) || subjects[0];

    const selectedOption = candidateResponses[qNum]?.trim().toUpperCase() || null;
    const correctOption = (answerKey[qNum] || '').trim().toUpperCase();

    const isAttempted = !!selectedOption;
    const isCorrect = isAttempted && selectedOption === correctOption;
    let marksAwarded = 0;

    const subStat = subjectResultsMap.get(subject.id)!;

    if (isAttempted) {
      totalAttempted++;
      subStat.attempted++;
      if (isCorrect) {
        marksAwarded = markingScheme.correct;
        totalCorrect++;
        subStat.correct++;
      } else {
        marksAwarded = markingScheme.incorrect;
        totalIncorrect++;
        subStat.incorrect++;
      }
    } else {
      totalUnattempted++;
      subStat.unattempted++;
      marksAwarded = markingScheme.unattempted;
    }

    subStat.score += marksAwarded;
    totalScore += marksAwarded;

    questionReviews.push({
      questionNumber: qNum,
      subjectId: subject.id,
      subjectName: subject.name,
      selectedOption,
      correctOption,
      isCorrect,
      isAttempted,
      marksAwarded,
      status: !isAttempted ? 'unattempted' : isCorrect ? 'correct' : 'incorrect',
    });
  }

  const subjectResults: SubjectResult[] = Array.from(subjectResultsMap.values()).map(
    (s) => ({
      ...s,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    })
  );

  const overallAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const maxScore = allQuestionsTotal * markingScheme.correct;

  return {
    submissionId: crypto.randomUUID(),
    testId: test.id,
    testTitle: test.title,
    pdfUrl: test.pdfUrl,
    candidateName,
    submittedAt: new Date().toISOString(),
    totalScore,
    maxScore,
    totalQuestions: allQuestionsTotal,
    totalAttempted,
    totalCorrect,
    totalIncorrect,
    totalUnattempted,
    overallAccuracy,
    timeTakenSeconds,
    durationMinutes: test.duration,
    subjectResults,
    questionReviews,
  };
}
