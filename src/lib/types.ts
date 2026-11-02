export type SubjectId = 'physics' | 'chemistry' | 'mathematics' | string;

export interface SubjectConfig {
  id: SubjectId;
  name: string;
  startQuestion: number;
  endQuestion: number;
  totalQuestions: number;
  startPage?: number;
  endPage?: number;
}

export interface MarkingScheme {
  correct: number;      // e.g. +4
  incorrect: number;    // e.g. -1
  unattempted: number;  // e.g. 0
}

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D' | string;
  text: string;
}

export interface TestQuestion {
  questionNumber: number;
  subjectId: SubjectId;
  type: 'mcq' | 'numerical';
  questionText: string;
  options?: QuestionOption[];
  correctAnswer: string;       // 'A', 'B', 'C', 'D' or numerical string e.g. '15'
  solution?: string;          // Step-by-step solution / explanation
  imageUrl?: string;          // Diagram, circuit, reaction, or graph image (URL or data URL)
  hasDiagram?: boolean;       // True if question references an image/diagram/figure
  marks?: number;             // Defaults to test markingScheme.correct (e.g. 4)
  negativeMarks?: number;     // Defaults to test markingScheme.incorrect (e.g. -1)
}

// Public question representation sent to student CBT - STRICTLY EXCLUDES correctAnswer and solution!
export interface PublicQuestion {
  questionNumber: number;
  subjectId: SubjectId;
  type: 'mcq' | 'numerical';
  questionText: string;
  options?: QuestionOption[];
  imageUrl?: string;          // Diagram, circuit, reaction, or graph image (URL or data URL)
  hasDiagram?: boolean;
  marks?: number;
  negativeMarks?: number;
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
  questions?: TestQuestion[];
  markingScheme: MarkingScheme;
  answerKey: Record<number, string>; // questionNumber (1..N) -> 'A' | 'B' | 'C' | 'D' or integer e.g. '5'
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

// Public view of test sent to the student CBT interface - STRICTLY NO answerKey or solutions!
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
  questions?: PublicQuestion[];
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

/**
 * Checks whether a question is an unformatted placeholder or missing real content.
 */
export function isQuestionUnformatted(q?: Partial<TestQuestion> | null): boolean {
  if (!q) return true;
  const text = (q.questionText || '').trim();
  if (!text || text.length <= 3) return true;
  const lower = text.toLowerCase();
  if (
    lower.includes('refer to') ||
    lower.includes('refer question paper') ||
    lower.includes('refer pdf') ||
    lower.includes('question paper pdf')
  ) {
    return true;
  }
  if (/^question\s+\d+(\s+statement)?$/i.test(text)) {
    return true;
  }
  if (q.type === 'mcq') {
    if (!q.options || q.options.length < 2) return true;
    const isPlaceholderOptions = q.options.every((o) => /^option\s+[a-d]$/i.test((o.text || '').trim()));
    if (isPlaceholderOptions) return true;
  }
  return false;
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
  questionText?: string;
  options?: QuestionOption[];
  solution?: string;
  imageUrl?: string;
  type?: 'mcq' | 'numerical';
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
