export type SubjectId = 'physics' | 'chemistry' | 'mathematics' | string;

export interface SubjectConfig {
  id: SubjectId;
  name: string;
  startQuestion: number;
  endQuestion: number;
  totalQuestions: number;
}

export interface MarkingScheme {
  correct: number;      // e.g. +4
  incorrect: number;    // e.g. -1
  unattempted: number;  // e.g. 0
}

export interface Test {
  id: string;
  title: string;
  duration: number; // in minutes
  totalMarks: number;
  pdfUrl: string;
  pdfFileName: string;
  pdfStartPage?: number;
  pdfEndPage?: number;
  integerQuestions?: number[];
  subjects: SubjectConfig[];
  markingScheme: MarkingScheme;
  answerKey: Record<number, string>; // questionNumber (1..N) -> 'A' | 'B' | 'C' | 'D' or integer e.g. '5'
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

// Public view of test sent to the student CBT interface - STRICTLY NO answerKey!
export interface PublicTest {
  id: string;
  title: string;
  duration: number;
  totalMarks: number;
  pdfUrl: string;
  pdfFileName: string;
  pdfStartPage?: number;
  pdfEndPage?: number;
  integerQuestions?: number[];
  subjects: SubjectConfig[];
  markingScheme: MarkingScheme;
  totalQuestions: number;
  status: 'published';
  createdAt: string;
}

export function isIntegerQuestion(qNum: number, integerQuestions?: number[]): boolean {
  if (integerQuestions && integerQuestions.length > 0) {
    return integerQuestions.includes(qNum);
  }
  return (
    (qNum >= 21 && qNum <= 25) ||
    (qNum >= 45 && qNum <= 50) ||
    (qNum >= 70 && qNum <= 75)
  );
}

export type QuestionStatus = 
  | 'not_visited'
  | 'not_answered'
  | 'answered'
  | 'marked_for_review'
  | 'answered_and_marked';

export interface QuestionState {
  selectedOption: string | null;
  status: QuestionStatus;
  visited: boolean;
}

export interface CandidateResponseMap {
  [questionNumber: number]: QuestionState;
}

export interface TestSubmissionRequest {
  testId: string;
  candidateResponses: Record<number, string | null>;
  timeTakenSeconds: number;
  candidateName?: string;
}

export interface SubjectResult {
  subjectId: SubjectId;
  subjectName: string;
  score: number;
  maxScore: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
}

export interface QuestionReviewItem {
  questionNumber: number;
  subjectId: SubjectId;
  subjectName: string;
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
  isAttempted: boolean;
  marksAwarded: number;
  status: 'correct' | 'incorrect' | 'unattempted';
}

export interface TestResult {
  submissionId: string;
  testId: string;
  testTitle: string;
  pdfUrl: string;
  candidateName: string;
  submittedAt: string;
  totalScore: number;
  maxScore: number;
  totalQuestions: number;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalUnattempted: number;
  overallAccuracy: number;
  timeTakenSeconds: number;
  durationMinutes: number;
  subjectResults: SubjectResult[];
  questionReviews: QuestionReviewItem[];
}
