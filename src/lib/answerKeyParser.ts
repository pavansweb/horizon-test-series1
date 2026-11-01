import { isIntegerQuestion } from './types';

export interface ParseResult {
  answerKey: Record<number, string>;
  filledCount: number;
  totalQuestions: number;
  missingQuestions: number[];
  warnings: string[];
  detectedFormat: string;
}

/**
 * Normalizes an answer option based on question type:
 * - If MCQ: converts '1', '(1)', '[1]' -> 'A', '2' -> 'B', '3' -> 'C', '4' -> 'D'.
 * - If Integer/Numerical: preserves numerical strings (e.g. '5', '-2.5', '140').
 */
export function normalizeAnswerToken(
  rawVal: string,
  qNum: number,
  integerQuestions?: number[]
): string {
  if (!rawVal) return '';
  const trimmed = rawVal.trim();
  const isInt = isIntegerQuestion(qNum, integerQuestions);

  if (isInt) {
    // Preserve numerical value (strip outer parens/brackets if present)
    const cleanNum = trimmed.replace(/^[([{<]+|[)\]}>]+$/g, '').trim();
    return cleanNum;
  }

  // MCQ Question: Extract option letter or option number
  const upper = trimmed.toUpperCase();

  // Strip wrapping characters like (A), [B], 1), etc.
  const match = upper.match(/^[([{<]?\s*([A-D]|1|2|3|4)\s*[)\]}>.]?$/i);
  if (match) {
    const val = match[1];
    if (val === '1') return 'A';
    if (val === '2') return 'B';
    if (val === '3') return 'C';
    if (val === '4') return 'D';
    return val;
  }

  // Check if option starts with A-D
  if (/^[A-D]/i.test(upper)) {
    return upper[0];
  }

  return upper;
}

/**
 * Universal Smart Answer Key Parser.
 * Handles:
 * 1. Multi-column PDF table copies (e.g. '1 A 26 B 51 C \n 2 B 27 C 52 D')
 * 2. Explicit numbered formats ('1: A, 2: B', '1. (2)', 'Q.1 - C', '21: 45')
 * 3. Excel / Google Sheets tab-separated rows
 * 4. Plain sequential tokens ('A B C D A ...')
 * 5. CSV formats ('1,A \n 2,B')
 */
export function parseUniversalAnswerKey(
  input: string,
  totalQuestions: number = 75,
  integerQuestions?: number[]
): ParseResult {
  const resultKey: Record<number, string> = {};
  const warnings: string[] = [];
  let detectedFormat = 'Unknown';

  if (!input || !input.trim()) {
    return {
      answerKey: {},
      filledCount: 0,
      totalQuestions,
      missingQuestions: Array.from({ length: totalQuestions }, (_, i) => i + 1),
      warnings: ['No input text provided.'],
      detectedFormat: 'Empty',
    };
  }

  const cleanText = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

  // Pattern A: Multi-Column Table / Tabular Copy (e.g. '1 A 26 B 51 C' or '1\tA\t26\tB\t51\tC')
  // Look for pairs of (QNum Answer) repeated on lines
  const multiColRegex = /(\b\d{1,3}\b)\s*[:.\-)\t]?\s*([A-D]|[-+]?\d*\.?\d+|[(][A-D0-9.\-]+[)])/gi;
  const explicitPairs: Array<{ qNum: number; val: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = multiColRegex.exec(cleanText)) !== null) {
    const q = parseInt(match[1], 10);
    const v = match[2].trim();
    if (q >= 1 && q <= totalQuestions) {
      explicitPairs.push({ qNum: q, val: v });
    }
  }

  // If we found explicit numbered pairs (e.g. at least 3 pairs)
  if (explicitPairs.length >= 3) {
    detectedFormat = 'Explicit Numbered / Tabular';
    for (const pair of explicitPairs) {
      const norm = normalizeAnswerToken(pair.val, pair.qNum, integerQuestions);
      if (norm) {
        resultKey[pair.qNum] = norm;
      }
    }
  } else {
    // Pattern B: CSV or Tab-separated line by line ('1, A' or '1 \t A')
    let linePairCount = 0;
    for (const line of lines) {
      const parts = line.split(/[,\t]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const q = parseInt(parts[0], 10);
        if (!isNaN(q) && q >= 1 && q <= totalQuestions) {
          const norm = normalizeAnswerToken(parts[1], q, integerQuestions);
          if (norm) {
            resultKey[q] = norm;
            linePairCount++;
          }
        }
      }
    }

    if (linePairCount >= 3) {
      detectedFormat = 'CSV / Excel Line Pairs';
    } else {
      // Pattern C: Plain sequential tokens (e.g. 'A B C D A B C ...' or lines with 1 option each)
      detectedFormat = 'Sequential Tokens';
      const tokens = cleanText
        .replace(/[,;]/g, ' ')
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      let currentQ = 1;
      for (const tok of tokens) {
        if (currentQ > totalQuestions) break;

        // Skip standalone question number headers like 'Physics' or section labels
        if (/^(physics|chemistry|mathematics|maths|section|part|paper|questions?|ans|key)$/i.test(tok)) {
          continue;
        }

        // Check if token is a bare question number followed by answer on next token
        const asNum = parseInt(tok, 10);
        if (asNum === currentQ && tokens.length > currentQ) {
          // It's the question index, answer is likely next token
          continue;
        }

        const norm = normalizeAnswerToken(tok, currentQ, integerQuestions);
        if (norm) {
          resultKey[currentQ] = norm;
          currentQ++;
        }
      }
    }
  }

  const filledCount = Object.keys(resultKey).length;
  const missingQuestions: number[] = [];
  for (let q = 1; q <= totalQuestions; q++) {
    if (!resultKey[q]) {
      missingQuestions.push(q);
    }
  }

  if (filledCount === 0) {
    warnings.push('Could not detect any valid answers from the input.');
  } else if (filledCount < totalQuestions) {
    warnings.push(`Loaded ${filledCount} of ${totalQuestions} answers (${missingQuestions.length} remaining).`);
  }

  return {
    answerKey: resultKey,
    filledCount,
    totalQuestions,
    missingQuestions,
    warnings,
    detectedFormat,
  };
}

/**
 * Generates a pre-filled CSV template string for answers.
 */
export function generateAnswerKeyCsv(
  totalQuestions: number = 75,
  currentKey: Record<number, string> = {},
  integerQuestions?: number[]
): string {
  const lines = ['Question,Type,Answer'];
  for (let q = 1; q <= totalQuestions; q++) {
    const isInt = isIntegerQuestion(q, integerQuestions);
    const type = isInt ? 'Numerical' : 'MCQ';
    const ans = currentKey[q] || '';
    lines.push(`${q},${type},${ans}`);
  }
  return lines.join('\n');
}
