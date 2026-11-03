import { TestResult } from './types';

export interface FormattedAiExport {
  markdown: string;
  json: string;
}

/**
 * Format duration in seconds to human readable hours, minutes, seconds.
 */
function formatSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours > 0) {
    return `${hours}h ${remMins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/**
 * Generates a comprehensive, LLM-optimized Markdown prompt for AI analysis.
 * Designed to be copied into ChatGPT, Claude, Gemini, or Antigravity for in-depth mock diagnosis.
 */
export function generateAiMarkdownPrompt(result: TestResult): string {
  const scorePercent = ((result.totalScore / result.maxScore) * 100).toFixed(1);
  const submittedDate = result.submittedAt ? new Date(result.submittedAt).toLocaleString() : 'Recent';

  const wrongQuestions = result.questionReviews.filter((q) => q.status === 'incorrect');
  const unattemptedQuestions = result.questionReviews.filter((q) => q.status === 'unattempted');
  const correctQuestions = result.questionReviews.filter((q) => q.status === 'correct');

  // Group by subjects
  const subjectsMap: Record<string, { total: number; correct: number; incorrect: number; unattempted: number }> = {};
  for (const s of result.subjectResults) {
    subjectsMap[s.subjectId.toLowerCase()] = {
      total: s.totalQuestions,
      correct: s.correct,
      incorrect: s.incorrect,
      unattempted: s.unattempted,
    };
  }

  let md = `# 🎯 JEE Mock Test Performance Analysis

### 📋 Exam & Candidate Metadata
- **Exam / Test Paper**: ${result.testTitle}
- **Candidate Name**: ${result.candidateName || 'JEE Aspirant'}
- **Submission ID**: \`${result.submissionId}\`
- **Submitted On**: ${submittedDate}
- **Total Score**: **${result.totalScore} / ${result.maxScore}** (${scorePercent}%)
- **Overall Accuracy**: **${result.overallAccuracy}%** (${result.totalCorrect} correct out of ${result.totalAttempted} attempted)
- **Time Taken**: **${formatSeconds(result.timeTakenSeconds)}** (Allotted: ${result.durationMinutes} minutes)

---

### 📊 Subject-Wise Performance Summary
| Subject | Score | Max Marks | Attempted | Correct (✓) | Incorrect (✗) | Left (○) | Accuracy |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  for (const sub of result.subjectResults) {
    md += `| **${sub.subjectName}** | **${sub.score}** | ${sub.maxScore} | ${sub.attempted}/${sub.totalQuestions} | ${sub.correct} | ${sub.incorrect} | ${sub.unattempted} | **${sub.accuracy}%** |\n`;
  }

  md += `\n---\n\n`;

  // 1. INCORRECT QUESTIONS (DIAGNOSTIC FOCUS)
  md += `### ❌ Incorrect Questions (${wrongQuestions.length} Questions — Penalty: -${wrongQuestions.length} marks)\n`;
  md += `> These questions resulted in negative marks (-1 each) and represent conceptual gaps, misinterpretations, or calculation slips.\n\n`;

  if (wrongQuestions.length === 0) {
    md += `*None! Excellent work — 0 negative marks incurred!*\n\n`;
  } else {
    wrongQuestions.forEach((q, idx) => {
      const typeStr = q.type === 'numerical' ? 'Section B (Numerical)' : 'Section A (MCQ)';
      const studentAns = q.selectedOption
        ? /^[A-D]$/i.test(q.selectedOption)
          ? `Option (${q.selectedOption.toUpperCase()})`
          : `"${q.selectedOption}"`
        : 'None';
      const correctAns = q.correctOption
        ? /^[A-D]$/i.test(q.correctOption)
          ? `Option (${q.correctOption.toUpperCase()})`
          : `"${q.correctOption}"`
        : 'Pending';

      md += `#### ${idx + 1}. Question ${q.questionNumber} [${q.subjectName}] • ${typeStr}\n`;
      md += `- **Student's Response**: ❌ \`${studentAns}\`\n`;
      md += `- **Correct Answer Key**: ✅ \`${correctAns}\`\n`;
      md += `- **Marks Awarded**: \`${q.marksAwarded}\`\n`;

      if (q.questionText && q.questionText.trim()) {
        md += `\n**Question Statement:**\n${q.questionText.trim()}\n`;
      }

      if (q.options && q.options.length > 0 && q.type !== 'numerical') {
        md += `\n**Options:**\n`;
        q.options.forEach((opt) => {
          const isStudent = q.selectedOption?.toUpperCase() === opt.id.toUpperCase();
          const isCorrect = q.correctOption?.toUpperCase() === opt.id.toUpperCase();
          let flag = '';
          if (isCorrect) flag = '  *(✅ Correct Key)*';
          if (isStudent && !isCorrect) flag = '  *(❌ Marked by Student)*';
          md += `- **(${opt.id})**: ${opt.text}${flag}\n`;
        });
      }

      if (q.solution && q.solution.trim()) {
        md += `\n**Official Explanation / Solution:**\n${q.solution.trim()}\n`;
      }

      md += `\n---\n\n`;
    });
  }

  // 2. UNATTEMPTED QUESTIONS
  md += `### ⚠️ Unattempted Questions (${unattemptedQuestions.length} Questions — Missed Opportunities)\n`;
  md += `> Questions skipped during the test. Analyze whether these were due to time exhaustion or unfamiliarity with the concept.\n\n`;

  if (unattemptedQuestions.length === 0) {
    md += `*All questions were attempted!*\n\n`;
  } else {
    // Group unattempted question numbers by subject
    const unattemptedBySub: Record<string, number[]> = {};
    for (const q of unattemptedQuestions) {
      if (!unattemptedBySub[q.subjectName]) unattemptedBySub[q.subjectName] = [];
      unattemptedBySub[q.subjectName].push(q.questionNumber);
    }

    for (const [subName, qNums] of Object.entries(unattemptedBySub)) {
      md += `- **${subName} (${qNums.length} skipped)**: ${qNums.map((n) => `Q${n}`).join(', ')}\n`;
    }
    md += `\n`;
  }

  // 3. CORRECT QUESTIONS
  md += `### ✅ Correct Questions (${correctQuestions.length} Questions — Strengths)\n`;
  const correctBySub: Record<string, number[]> = {};
  for (const q of correctQuestions) {
    if (!correctBySub[q.subjectName]) correctBySub[q.subjectName] = [];
    correctBySub[q.subjectName].push(q.questionNumber);
  }
  for (const [subName, qNums] of Object.entries(correctBySub)) {
    md += `- **${subName} (${qNums.length} correct)**: ${qNums.map((n) => `Q${n}`).join(', ')}\n`;
  }
  md += `\n---\n\n`;

  // 4. TAILORED INSTRUCTIONS FOR AI
  md += `### 🤖 Prompt & Instructions for AI Analyzer:
Please provide an in-depth coaching and diagnostic analysis based on my test data above:

1. **Root Cause Analysis of Wrong Answers**:
   - Categorize the incorrect questions into:
     (a) Conceptual gaps (did not know the theory/formula)
     (b) Calculation / numerical errors
     (c) Silly mistakes or misreading question constraints
     (d) Trap questions / negative marking traps
2. **Subject-Wise Balance & Time Strategy**:
   - Compare my accuracy and score across Physics, Chemistry, and Mathematics.
   - Was my time allocation (${formatSeconds(result.timeTakenSeconds)}) balanced?
3. **Weak Chapter / Topic Identification**:
   - Based on the questions I answered wrong and the ones I left unattempted, identify the specific sub-topics/chapters that need immediate revision.
4. **Actionable 7-Day Plan**:
   - Give me a prioritized 3-step action plan before my next mock test to push my score from ${result.totalScore} to higher marks.
`;

  return md;
}

/**
 * Generates structured Raw JSON export containing full question statements,
 * response choices, answer keys, solutions, and categorized performance metrics.
 */
export function generateRawJsonExport(result: TestResult): string {
  const wrongQuestions = result.questionReviews
    .filter((q) => q.status === 'incorrect')
    .map((q) => ({
      questionNumber: q.questionNumber,
      subject: q.subjectName,
      type: q.type || 'mcq',
      candidateAnswer: q.selectedOption,
      correctAnswer: q.correctOption,
      marksAwarded: q.marksAwarded,
      questionText: q.questionText || '',
      options: q.options || [],
      solution: q.solution || '',
    }));

  const correctQuestions = result.questionReviews
    .filter((q) => q.status === 'correct')
    .map((q) => ({
      questionNumber: q.questionNumber,
      subject: q.subjectName,
      type: q.type || 'mcq',
      candidateAnswer: q.selectedOption,
      correctAnswer: q.correctOption,
      marksAwarded: q.marksAwarded,
    }));

  const unattemptedQuestions = result.questionReviews
    .filter((q) => q.status === 'unattempted')
    .map((q) => ({
      questionNumber: q.questionNumber,
      subject: q.subjectName,
      type: q.type || 'mcq',
      correctAnswer: q.correctOption,
    }));

  const exportPayload = {
    exportVersion: '1.0',
    exportFormat: 'jee-mock-portal-analysis',
    exportedAt: new Date().toISOString(),
    candidate: {
      name: result.candidateName || 'Candidate',
      submissionId: result.submissionId,
      submittedAt: result.submittedAt,
    },
    examination: {
      testId: result.testId,
      title: result.testTitle,
      pdfUrl: result.pdfUrl,
      durationMinutes: result.durationMinutes,
      timeTakenSeconds: result.timeTakenSeconds,
      timeTakenFormatted: formatSeconds(result.timeTakenSeconds),
    },
    performanceSummary: {
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      percentage: Number(((result.totalScore / result.maxScore) * 100).toFixed(2)),
      overallAccuracy: result.overallAccuracy,
      totalQuestions: result.totalQuestions,
      attemptedCount: result.totalAttempted,
      correctCount: result.totalCorrect,
      incorrectCount: result.totalIncorrect,
      unattemptedCount: result.totalUnattempted,
      negativeMarksPenalty: result.totalIncorrect,
    },
    subjectBreakdown: result.subjectResults.map((sub) => ({
      subjectId: sub.subjectId,
      subjectName: sub.subjectName,
      score: sub.score,
      maxScore: sub.maxScore,
      accuracy: sub.accuracy,
      totalQuestions: sub.totalQuestions,
      attempted: sub.attempted,
      correct: sub.correct,
      incorrect: sub.incorrect,
      unattempted: sub.unattempted,
    })),
    questionStatusSummary: {
      incorrectQuestionNumbers: wrongQuestions.map((q) => q.questionNumber),
      correctQuestionNumbers: correctQuestions.map((q) => q.questionNumber),
      unattemptedQuestionNumbers: unattemptedQuestions.map((q) => q.questionNumber),
    },
    diagnostics: {
      incorrectQuestions: wrongQuestions,
      correctQuestions: correctQuestions,
      unattemptedQuestions: unattemptedQuestions,
    },
    allQuestionReviews: result.questionReviews,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Triggers a client-side file download.
 */
export function triggerFileDownload(filename: string, content: string, mimeType: string = 'text/plain') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies text content to user's clipboard.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err);
    return false;
  }
}
