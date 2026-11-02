import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { SubjectConfig, TestQuestion } from '@/lib/types';
import { savePdf } from '@/lib/storage';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Up to 60 seconds where supported

interface ParsedExamData {
  title?: string;
  durationMinutes?: number;
  totalPages?: number;
  subjects?: Array<{
    id?: string;
    name?: string;
    startQuestion?: number;
    endQuestion?: number;
    totalQuestions?: number;
    startPage?: number;
    endPage?: number;
  }>;
  integerQuestions?: number[];
  answerKey?: Record<string, string>;
  pdfStartPage?: number;
  pdfEndPage?: number;
  detectedSummary?: string;
  questions?: Array<Partial<TestQuestion>>;
}

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

/**
 * Slices only the relevant page range from a full PDF using pdf-lib.
 * Reduces 5MB PDFs to 100-200KB, eliminating timeouts and focusing Gemini's vision.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getSlicedPdfForChunk(
  fullPdfBase64: string,
  subject?: SubjectConfig,
  startQ?: number,
  endQ?: number
): Promise<string> {
  if (!fullPdfBase64) return '';
  try {
    const srcDoc = await PDFDocument.load(Buffer.from(fullPdfBase64, 'base64'), {
      ignoreEncryption: true,
    });
    const totalPages = srcDoc.getPageCount();

    if (totalPages <= 3) {
      return fullPdfBase64;
    }

    let startPage = 1;
    let endPage = totalPages;

    if (subject && subject.startPage && subject.endPage && typeof startQ === 'number' && typeof endQ === 'number') {
      const totalSubjectQ = Math.max(1, subject.endQuestion - subject.startQuestion + 1);
      const totalSubjectP = Math.max(1, subject.endPage - subject.startPage + 1);
      const startRatio = (startQ - subject.startQuestion) / totalSubjectQ;
      const endRatio = (endQ - subject.startQuestion + 1) / totalSubjectQ;

      // 1-page safety padding on each side
      startPage = Math.max(subject.startPage, Math.floor(subject.startPage + startRatio * totalSubjectP) - 1);
      endPage = Math.min(subject.endPage, Math.ceil(subject.startPage + endRatio * totalSubjectP) + 1);
    } else if (typeof startQ === 'number' && typeof endQ === 'number') {
      const approxTotal = 75;
      const startRatio = Math.max(0, (startQ - 1) / approxTotal);
      const endRatio = Math.min(1, endQ / approxTotal);

      startPage = Math.max(1, Math.floor(startRatio * totalPages));
      endPage = Math.min(totalPages, Math.ceil(endRatio * totalPages) + 2);
    }

    startPage = Math.max(1, Math.min(startPage, totalPages));
    endPage = Math.max(startPage, Math.min(endPage, totalPages));

    if (endPage - startPage + 1 >= totalPages - 1) {
      return fullPdfBase64;
    }

    const newDoc = await PDFDocument.create();
    const pageIndices: number[] = [];
    for (let i = startPage - 1; i <= endPage - 1; i++) {
      pageIndices.push(i);
    }

    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));

    const newBytes = await newDoc.save();
    const sliced = Buffer.from(newBytes).toString('base64');
    console.log(`[PDF Slice] Sliced Pages ${startPage}–${endPage} of ${totalPages} for questions ${startQ}–${endQ} (${(fullPdfBase64.length / 1024).toFixed(0)}KB -> ${(sliced.length / 1024).toFixed(0)}KB)`);
    return sliced;
  } catch (err) {
    console.warn('[PDF Slice] Slicing failed, using full PDF fallback:', err);
    return fullPdfBase64;
  }
}

/**
 * Strips any Devanagari (Hindi) script characters and full Hindi paragraphs.
 * Protects against bilingual exam papers where Hindi and English are mixed or side-by-side.
 */
function stripHindiText(text: string): string {
  if (!text) return '';

  // 1. Filter out lines that are predominantly or purely Devanagari script
  const lines = text.split('\n');
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;

    const devanagariMatches = trimmed.match(/[\u0900-\u097F]/g);
    const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;
    const latinMatches = trimmed.match(/[a-zA-Z]/g);
    const latinCount = latinMatches ? latinMatches.length : 0;

    // If line has Devanagari and lacks substantial English, drop it
    if (devanagariCount > 0 && devanagariCount >= latinCount) {
      return false;
    }
    return true;
  });

  let result = filteredLines.join('\n');

  // 2. Strip any remaining inline Devanagari characters and Hindi punctuation (danda ।, ॥)
  result = result.replace(/[\u0900-\u097F\u0964\u0965]+/g, ' ');

  // 3. Clean up formatting artifacts, extra spaces, and excessive blank lines
  result = result
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

/**
 * Sanitizes a question by stripping any Hindi text from question statement and all options.
 */
function sanitizeQuestion<T extends Partial<TestQuestion>>(q: T): T {
  if (!q) return q;

  const questionText = stripHindiText(q.questionText || '');
  const options = (q.options || []).map((opt) => ({
    ...opt,
    text: stripHindiText(cleanOptionText(opt.text || '', opt.id)),
  }));

  return {
    ...q,
    questionText,
    options,
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKeys: string[] = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_BACKUP_API_KEY,
    ...(process.env.GEMINI_API_KEYS ? process.env.GEMINI_API_KEYS.split(',') : []),
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k && k.length > 0));

  const uniqueKeys = Array.from(new Set(apiKeys));

  if (uniqueKeys.length === 0) {
    return NextResponse.json(
      { success: false, error: 'GEMINI_API_KEY is not configured in environment variables.' },
      { status: 500 }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle JSON actions: format-single-question & extract-chunk
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));

      // Action 1: Format single question
      if (body.action === 'format-single-question') {
        const formatted = await formatSingleQuestionWithAi(uniqueKeys, body.question);
        return NextResponse.json({ success: true, question: formatted });
      }

      // Action 2: Extract specific question chunk (lightweight & fast for Vercel)
      if (body.action === 'extract-chunk') {
        let pdfBase64 = body.pdfBase64 || '';
        if (!pdfBase64 && body.pdfUrl) {
          pdfBase64 = await resolvePdfBase64(body.pdfUrl);
        }
        if (!pdfBase64) {
          return NextResponse.json({ success: false, error: 'No PDF provided for chunk extraction' }, { status: 400 });
        }
        const questions = await extractQuestionChunk(
          uniqueKeys,
          pdfBase64,
          body.subject,
          Number(body.startQuestion),
          Number(body.endQuestion),
          Number(body.chunkIndex || 0)
        );
        return NextResponse.json({ success: true, questions });
      }

      // Action 3: Extract single question from PDF on-demand
      if (body.action === 'extract-single-from-pdf') {
        let pdfBase64 = body.pdfBase64 || '';
        if (!pdfBase64 && body.pdfUrl) {
          pdfBase64 = await resolvePdfBase64(body.pdfUrl);
        }
        if (!pdfBase64) {
          return NextResponse.json({ success: false, error: 'No PDF provided for extraction' }, { status: 400 });
        }
        const question = await extractSingleQuestionFromPdf(
          uniqueKeys,
          pdfBase64,
          Number(body.questionNumber),
          body.subjectId || 'physics'
        );
        return NextResponse.json({ success: true, question });
      }
    }

    let pdfBase64 = '';
    let savedPdfUrl = '';
    let requestedAction = 'parse-structure';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      requestedAction = (formData.get('action') as string) || 'parse-structure';
      const file = formData.get('pdf') as File | null;

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        pdfBase64 = buffer.toString('base64');
        try {
          // Persist uploaded PDF so subsequent chunk queries don't need re-upload
          savedPdfUrl = await savePdf(buffer, file.name, file.type || 'application/pdf');
        } catch (saveErr) {
          console.warn('PDF persistence failed, continuing in memory:', saveErr);
        }
      } else {
        const pdfUrl = formData.get('pdfUrl') as string | null;
        if (pdfUrl) {
          savedPdfUrl = pdfUrl;
          pdfBase64 = await resolvePdfBase64(pdfUrl);
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      requestedAction = body.action || 'parse-structure';
      if (body.pdfBase64) {
        pdfBase64 = body.pdfBase64;
      } else if (body.pdfUrl) {
        savedPdfUrl = body.pdfUrl;
        pdfBase64 = await resolvePdfBase64(body.pdfUrl);
      }
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'No PDF file or URL provided to analyze.' },
        { status: 400 }
      );
    }

    // Step 1: Extract overall paper structure & full answer key
    const structurePrompt = `You are an expert exam analyzer for JEE Main examination papers.
Analyze this JEE question paper PDF thoroughly. Extract the overall exam structure and complete answer key.

CRITICAL INSTRUCTIONS FOR BILINGUAL & UNSTRUCTURED PAPERS:
1. STRICTLY ENGLISH ONLY: The question paper may contain Hindi translations (Devanagari script) side-by-side or stacked. Completely IGNORE all Hindi text! Extract ONLY English titles and numbers.
2. Subject Sequence: Preserve subject sequence as they appear in the question paper (e.g. Physics Q1-25, Chemistry Q26-50, Mathematics Q51-75).
3. Section Detection:
   - Section A: Multiple Choice Questions (MCQs) with 4 options (A, B, C, D).
   - Section B: Numerical/Integer value questions (no options).
4. Answer Key: Extract the complete answer key for every question (1 to 75 or 90). Search the final pages for the Answer Key / Solutions table. Convert MCQ numbers (1, 2, 3, 4) to uppercase letters (A, B, C, D).
5. Identify numerical/integer questions (e.g. Q21-25, Q46-50, Q71-75).
6. Page numbers: Detect startPage and endPage for each subject section in the PDF document.
7. Return a STRICTLY VALID JSON object with this exact schema:
{
  "title": string,
  "durationMinutes": number,
  "totalPages": number,
  "subjects": [
    {
      "id": "physics" | "chemistry" | "mathematics",
      "name": "Physics" | "Chemistry" | "Mathematics",
      "startQuestion": number,
      "endQuestion": number,
      "totalQuestions": number,
      "startPage": number,
      "endPage": number
    }
  ],
  "integerQuestions": number[],
  "answerKey": {
    "[questionNumber: string]": string
  },
  "pdfStartPage": number,
  "pdfEndPage": number,
  "detectedSummary": string
}`;

    let parsedStructure: ParsedExamData | null = null;
    let lastError: string | null = null;

    for (let keyIdx = 0; keyIdx < uniqueKeys.length; keyIdx++) {
      const activeKey = uniqueKeys[keyIdx];

      for (const model of GEMINI_MODELS) {
        try {
          const res = await callGemini(activeKey, model, structurePrompt, pdfBase64, 35000, 2);
          if (res) {
            parsedStructure = JSON.parse(res);
            break;
          }
        } catch (err: unknown) {
          lastError = (err as Error)?.message || 'Gemini structure call failed';
          console.warn(`Structure call with ${model} on key #${keyIdx + 1} failed:`, err);
        }
      }

      if (parsedStructure) break;
    }

    if (!parsedStructure) {
      return NextResponse.json(
        { success: false, error: `Failed to analyze paper structure: ${lastError}` },
        { status: 502 }
      );
    }

    // Normalize subjects
    const subjects: SubjectConfig[] =
      parsedStructure.subjects && Array.isArray(parsedStructure.subjects) && parsedStructure.subjects.length > 0
        ? parsedStructure.subjects.map((s) => ({
            id: String(s.id || '').toLowerCase() || 'physics',
            name: s.name || s.id || 'Physics',
            startQuestion: Number(s.startQuestion) || 1,
            endQuestion: Number(s.endQuestion) || 25,
            totalQuestions: Number(s.totalQuestions) || 25,
            startPage: s.startPage ? Number(s.startPage) : undefined,
            endPage: s.endPage ? Number(s.endPage) : undefined,
          }))
        : [
            { id: 'physics', name: 'Physics', startQuestion: 1, endQuestion: 25, totalQuestions: 25 },
            { id: 'chemistry', name: 'Chemistry', startQuestion: 26, endQuestion: 50, totalQuestions: 25 },
            { id: 'mathematics', name: 'Mathematics', startQuestion: 51, endQuestion: 75, totalQuestions: 25 },
          ];

    const answerKey = parsedStructure.answerKey || {};
    const integerQuestions = (parsedStructure.integerQuestions || []).map(Number);

    // If only structure was requested (or running under strict Vercel timeout), return structure immediately!
    // The client will extract question chunks in fast, separate 3-5s calls.
    if (requestedAction === 'parse-structure') {
      return NextResponse.json({
        success: true,
        pdfUrl: savedPdfUrl,
        data: {
          ...parsedStructure,
          subjects,
          integerQuestions,
          answerKey,
        },
      });
    }

    // Fallback: full extraction if requested in one go
    const chunks: Array<{
      subject: SubjectConfig;
      start: number;
      end: number;
      chunkIndex: number;
    }> = [];

    let overallChunkIndex = 0;
    for (const subj of subjects) {
      const total = subj.endQuestion - subj.startQuestion + 1;
      if (total > 15) {
        const mid = subj.startQuestion + Math.floor(total / 2) - 1;
        chunks.push({ subject: subj, start: subj.startQuestion, end: mid, chunkIndex: overallChunkIndex++ });
        chunks.push({ subject: subj, start: mid + 1, end: subj.endQuestion, chunkIndex: overallChunkIndex++ });
      } else {
        chunks.push({ subject: subj, start: subj.startQuestion, end: subj.endQuestion, chunkIndex: overallChunkIndex++ });
      }
    }

    const chunkPromises = chunks.map((c) =>
      extractQuestionChunk(uniqueKeys, pdfBase64, c.subject, c.start, c.end, c.chunkIndex)
    );

    const chunkResults = await Promise.all(chunkPromises);
    const extractedQuestions: TestQuestion[] = chunkResults.flat();

    const enriched = ensureFullExamQuestions({
      ...parsedStructure,
      subjects,
      integerQuestions,
      answerKey,
      questions: extractedQuestions,
    });

    return NextResponse.json({
      success: true,
      pdfUrl: savedPdfUrl,
      data: enriched,
    });
  } catch (error: unknown) {
    console.error('Unhandled error in Gemini parse route:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extracts a specific range of questions (startQ to endQ) using multi-key and multi-model rotation.
 */
async function extractQuestionChunk(
  uniqueKeys: string[],
  pdfBase64: string,
  subject: SubjectConfig,
  startQ: number,
  endQ: number,
  chunkIndex: number
): Promise<TestQuestion[]> {
  // Page-slicing with pdf-lib: Slice only the 2-4 relevant pages to avoid timeouts/503s!
  const targetPdfBase64 = await getSlicedPdfForChunk(pdfBase64, subject, startQ, endQ);

  const prompt = `You are an expert exam analyzer for JEE Main examination papers.
Analyze this JEE question paper PDF. Extract ALL questions from Question ${startQ} to Question ${endQ} (${subject.name}).

CRITICAL REQUIREMENTS FOR BILINGUAL & UNSTRUCTURED PAPERS:
1. STRICTLY ENGLISH ONLY:
   - This paper is bilingual (English + Hindi).
   - COMPLETELY DISCARD any Hindi/Devanagari script text (e.g. अ, आ, क, ख, etc.).
   - If a page has 2 columns: The Hindi version is in one column and English in the other. Extract ONLY from the English column!
   - If questions are stacked (Hindi paragraph followed by English, or vice versa), extract ONLY the English statement and English options!
   - NEVER output text containing Devanagari characters.
2. NO PLACEHOLDERS: Extract the real question statement and real option text for EVERY question from ${startQ} to ${endQ}.
3. MCQs must have 4 options (A, B, C, D) with their exact text. Strip redundant "(A)", "(1)", or option markers from the option text.
4. Numerical/Integer questions must have empty options [].
5. LATEX MATH & FORMULAS: Convert all math, units, and chemistry formulas to standard KaTeX LaTeX ($...$).
   - Examples: $E = mc^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\text{m/s}^2$, $10^{-8}\\text{ T}$, $\\vec{A}$, $\\mathrm{H_2SO_4}$.
6. DIAGRAM / FIGURE DETECTION:
   - If a question references a diagram, circuit, graph, apparatus, or chemical structure (e.g. "in the figure shown", "given graph", "as shown below", "refer to diagram"), set "hasDiagram": true. Otherwise set false.
7. Keep solution empty "" to preserve tokens and response speed.

FEW-SHOT EXAMPLES:
Example 1 (Bilingual MCQ with Math & Diagram Reference):
Input: "प्र. 4. चित्र में दिखाए अनुसार एक संधारित्र... Q. 4. A capacitor of capacitance $C = 10\\,\\mu\\text{F}$ is connected in the circuit shown in the figure. Find the charge on the capacitor. (A) $20\\,\\mu\\text{C}$ (B) $40\\,\\mu\\text{C}$ (C) $60\\,\\mu\\text{C}$ (D) $80\\,\\mu\\text{C}$"
Output JSON:
{
  "questionNumber": 4,
  "subjectId": "physics",
  "type": "mcq",
  "questionText": "A capacitor of capacitance $C = 10\\,\\mu\\text{F}$ is connected in the circuit shown in the figure. Find the charge on the capacitor.",
  "options": [
    { "id": "A", "text": "$20\\,\\mu\\text{C}$" },
    { "id": "B", "text": "$40\\,\\mu\\text{C}$" },
    { "id": "C", "text": "$60\\,\\mu\\text{C}$" },
    { "id": "D", "text": "$80\\,\\mu\\text{C}$" }
  ],
  "correctAnswer": "B",
  "hasDiagram": true
}

Example 2 (Numerical / Section B):
Input: "Q. 22. An ideal gas undergoes an adiabatic expansion where $P V^{5/3} = \\text{constant}$. If initial temperature is $300\\,\\text{K}$ and volume doubles, the final temperature is $T_f$. The value of $T_f$ rounded to nearest integer is:"
Output JSON:
{
  "questionNumber": 22,
  "subjectId": "physics",
  "type": "numerical",
  "questionText": "An ideal gas undergoes an adiabatic expansion where $P V^{5/3} = \\text{constant}$. If initial temperature is $300\\,\\text{K}$ and volume doubles, the final temperature is $T_f$. The value of $T_f$ rounded to nearest integer is:",
  "options": [],
  "correctAnswer": "189",
  "hasDiagram": false
}

Return STRICTLY VALID JSON:
{
  "questions": [
    {
      "questionNumber": number,
      "subjectId": "${subject.id.toLowerCase()}",
      "type": "mcq" | "numerical",
      "questionText": string,
      "options": [
        { "id": "A", "text": string },
        { "id": "B", "text": string },
        { "id": "C", "text": string },
        { "id": "D", "text": string }
      ],
      "correctAnswer": string,
      "hasDiagram": boolean
    }
  ]
}`;

  for (let k = 0; k < uniqueKeys.length; k++) {
    const key = uniqueKeys[(chunkIndex + k) % uniqueKeys.length];

    for (const model of GEMINI_MODELS) {
      try {
        const res = await callGemini(key, model, prompt, targetPdfBase64, 25000, 2);
        if (res) {
          const parsed = JSON.parse(res);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return (parsed.questions as TestQuestion[]).map((q) => sanitizeQuestion(q));
          }
        }
      } catch (err) {
        console.warn(`Extraction chunk ${startQ}-${endQ} with ${model} on key #${k + 1} failed:`, err);
      }
    }
  }

  return [];
}

/**
 * Extracts a single question from PDF on-demand with KaTeX math.
 */
async function extractSingleQuestionFromPdf(
  uniqueKeys: string[],
  pdfBase64: string,
  questionNumber: number,
  subjectId: string
): Promise<Partial<TestQuestion> | null> {
  const targetPdfBase64 = await getSlicedPdfForChunk(pdfBase64, undefined, questionNumber, questionNumber);

  const prompt = `You are an expert exam analyzer for JEE Main examination papers.
Analyze this JEE question paper PDF. Extract ONLY Question ${questionNumber}.

CRITICAL REQUIREMENTS:
1. STRICTLY ENGLISH ONLY: Extract ONLY the English question statement and English options. Completely IGNORE all Hindi / Devanagari text!
2. Extract the complete, exact English question statement and option text.
3. If MCQ, return 4 options (A, B, C, D) with their exact text. Strip redundant prefixes like "(A)" or "1.".
4. If numerical/integer, options must be empty [].
5. LATEX FORMULAS: Convert all math, units, and chemistry formulas to standard LaTeX ($...$).
   - Examples: $E = mc^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\text{m/s}^2$, $10^{-8}\\text{ T}$, $\\vec{A}$, $\\mathrm{H_2SO_4}$.
6. DIAGRAM DETECTION: Set "hasDiagram": true if the question references an image, diagram, circuit, or graph; otherwise false.

Return STRICTLY VALID JSON:
{
  "questionNumber": ${questionNumber},
  "subjectId": "${(subjectId || 'physics').toLowerCase()}",
  "type": "mcq",
  "questionText": string,
  "options": [
    { "id": "A", "text": string },
    { "id": "B", "text": string },
    { "id": "C", "text": string },
    { "id": "D", "text": string }
  ],
  "correctAnswer": string,
  "hasDiagram": boolean
}`;

  for (let k = 0; k < uniqueKeys.length; k++) {
    const key = uniqueKeys[k];
    for (const model of GEMINI_MODELS) {
      try {
        const res = await callGemini(key, model, prompt, targetPdfBase64, 20000, 2);
        if (res) {
          const parsed = JSON.parse(res);
          if (parsed && parsed.questionText) {
            return sanitizeQuestion(parsed as Partial<TestQuestion>);
          }
        }
      } catch (err) {
        console.warn(`Single Q${questionNumber} extraction with ${model} on key #${k + 1} failed:`, err);
      }
    }
  }

  return null;
}

/**
 * AI Formatter for a single question statement & options.
 */
async function formatSingleQuestionWithAi(
  uniqueKeys: string[],
  q: Partial<TestQuestion>
): Promise<Partial<TestQuestion>> {
  const isNumerical = q.type === 'numerical';
  const prompt = `You are an expert exam question formatter for JEE Main.
Format this question into clean English with standard KaTeX LaTeX math ($...$).
CRITICAL: Completely IGNORE and REMOVE any Hindi translation or Devanagari text.
Ensure equations, exponents, square roots, fractions, vectors, and units use standard LaTeX ($...$).
Also check if the question text references a figure, diagram, circuit, or graph (e.g. "shown in figure"). Set "hasDiagram": true or false.

Raw Question Statement:
${q.questionText || ''}

${!isNumerical && q.options && q.options.length > 0
  ? `Options:
${q.options.map((o) => `${o.id}: ${o.text}`).join('\n')}`
  : ''}

Return STRICTLY VALID JSON:
{
  "questionText": string,
  "options": [
    { "id": "A", "text": string },
    { "id": "B", "text": string },
    { "id": "C", "text": string },
    { "id": "D", "text": string }
  ],
  "hasDiagram": boolean
}`;

  for (const key of uniqueKeys) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await callGemini(key, model, prompt, '', 18000, 2);
        if (res) {
          const parsed = JSON.parse(res);
          const formatted = {
            ...q,
            questionText: parsed.questionText || q.questionText,
            options: isNumerical ? [] : (parsed.options || q.options),
            hasDiagram: typeof parsed.hasDiagram === 'boolean' ? parsed.hasDiagram : q.hasDiagram,
          };
          return sanitizeQuestion(formatted);
        }
      } catch {
        // try next
      }
    }
  }

  return sanitizeQuestion(q);
}

function cleanJsonString(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = 0;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  let end = cleaned.length;
  if (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) {
    end = lastBrace + 1;
  } else if (lastBracket !== -1) {
    end = lastBracket + 1;
  }

  cleaned = cleaned.substring(start, end).trim();
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned;
}

async function callGemini(
  apiKey: string,
  model: string,
  promptText: string,
  pdfBase64: string,
  timeoutMs: number,
  retries: number = 2
): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
        { text: promptText },
      ];

      if (pdfBase64 && pdfBase64.length > 0) {
        parts.push({
          inline_data: { mime_type: 'application/pdf', data: pdfBase64 },
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      const rawText = await response.text();
      interface GeminiResponse {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        error?: { message?: string };
      }
      let data: GeminiResponse = {};
      try {
        data = JSON.parse(rawText) as GeminiResponse;
      } catch {
        // Non-JSON response (e.g. gateway timeout or proxy error)
        data = { error: { message: rawText.slice(0, 200) || `Status ${response.status}` } };
      }

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return cleanJsonString(data.candidates[0].content.parts[0].text);
      }

      const status = response.status;
      const errorMsg = data.error?.message || `Status ${status}`;

      // 503 (High demand) or 429 (Rate limit) or 500: Wait with exponential backoff and retry
      if ((status === 503 || status === 429 || status === 500) && attempt < retries) {
        const backoffMs = 1500 * (attempt + 1) + Math.floor(Math.random() * 1000);
        console.warn(`[Gemini ${model}] ${status} ${errorMsg}. Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${retries})...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      throw new Error(errorMsg);
    } catch (err: unknown) {
      const isAbort = (err as Error)?.name === 'AbortError';
      const msg = isAbort ? `Request timed out after ${timeoutMs}ms` : (err as Error)?.message || 'Gemini error';

      if (attempt < retries && !isAbort) {
        const backoffMs = 1500 * (attempt + 1) + Math.floor(Math.random() * 500);
        console.warn(`[Gemini ${model}] Attempt ${attempt + 1} failed: ${msg}. Retrying in ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw new Error(msg);
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

function cleanOptionText(raw: string, optId: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(new RegExp(`^\\s*[(]?(?:${optId}|[1-4])[).:-]\\s*`, 'i'), '').trim();
  return cleaned || raw;
}

function ensureFullExamQuestions(parsed: ParsedExamData) {
  let subjects: SubjectConfig[] = [];

  if (Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
    subjects = parsed.subjects.map((s) => ({
      id: String(s.id || '').toLowerCase() || 'physics',
      name: s.name || s.id || 'Physics',
      startQuestion: Number(s.startQuestion) || 1,
      endQuestion: Number(s.endQuestion) || 25,
      totalQuestions: Number(s.totalQuestions) || 25,
      startPage: s.startPage ? Number(s.startPage) : undefined,
      endPage: s.endPage ? Number(s.endPage) : undefined,
    }));
  } else {
    subjects = [
      { id: 'physics', name: 'Physics', startQuestion: 1, endQuestion: 25, totalQuestions: 25 },
      { id: 'chemistry', name: 'Chemistry', startQuestion: 26, endQuestion: 50, totalQuestions: 25 },
      { id: 'mathematics', name: 'Mathematics', startQuestion: 51, endQuestion: 75, totalQuestions: 25 },
    ];
  }

  const integerQuestions: number[] = Array.isArray(parsed.integerQuestions)
    ? parsed.integerQuestions.map(Number)
    : [21, 22, 23, 24, 25, 46, 47, 48, 49, 50, 71, 72, 73, 74, 75];

  const answerKey: Record<string, string> = {};
  if (parsed.answerKey && typeof parsed.answerKey === 'object') {
    Object.entries(parsed.answerKey).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        answerKey[String(k)] = String(v).toUpperCase().trim();
      }
    });
  }

  const existingQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questionMap = new Map<number, Partial<TestQuestion>>();
  for (const q of existingQuestions) {
    if (q && typeof q.questionNumber === 'number') {
      questionMap.set(q.questionNumber, q);
      if (q.correctAnswer && !answerKey[String(q.questionNumber)]) {
        answerKey[String(q.questionNumber)] = String(q.correctAnswer).toUpperCase().trim();
      }
    }
  }

  const totalFromSubjects = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalFromKeys = Object.keys(answerKey).length;
  const maxKeyNum = Object.keys(answerKey).reduce((max, k) => Math.max(max, Number(k) || 0), 0);
  const totalQuestions = Math.max(totalFromSubjects, totalFromKeys, maxKeyNum, 75);

  const fullQuestions: TestQuestion[] = [];

  for (let qNum = 1; qNum <= totalQuestions; qNum++) {
    const subject =
      subjects.find((s) => qNum >= s.startQuestion && qNum <= s.endQuestion) ||
      subjects[0];

    const isInteger =
      integerQuestions.includes(qNum) ||
      qNum % 25 > 20 ||
      qNum % 25 === 0;

    const correct = answerKey[String(qNum)] || (isInteger ? '0' : 'A');

    if (questionMap.has(qNum)) {
      const q = questionMap.get(qNum)!;
      const opts = isInteger
        ? []
        : (Array.isArray(q.options) && q.options.length === 4
            ? q.options.map((o) => ({ ...o, text: cleanOptionText(o.text, o.id) }))
            : [
                { id: 'A', text: 'Option A' },
                { id: 'B', text: 'Option B' },
                { id: 'C', text: 'Option C' },
                { id: 'D', text: 'Option D' },
              ]);

      fullQuestions.push(sanitizeQuestion({
        questionNumber: qNum,
        subjectId: q.subjectId || subject.id,
        type: isInteger ? 'numerical' : (q.type || 'mcq'),
        questionText:
          q.questionText && q.questionText.trim().length > 3
            ? q.questionText
            : `Question ${qNum}`,
        options: opts,
        correctAnswer: q.correctAnswer || correct,
        solution: q.solution || '',
        imageUrl: q.imageUrl,
        hasDiagram: q.hasDiagram,
      }));
    } else {
      fullQuestions.push({
        questionNumber: qNum,
        subjectId: subject.id,
        type: isInteger ? 'numerical' : 'mcq',
        questionText: `Question ${qNum}`,
        options: isInteger
          ? []
          : [
              { id: 'A', text: 'Option A' },
              { id: 'B', text: 'Option B' },
              { id: 'C', text: 'Option C' },
              { id: 'D', text: 'Option D' },
            ],
        correctAnswer: correct,
        solution: '',
      });
    }

    if (!answerKey[String(qNum)]) {
      answerKey[String(qNum)] = correct;
    }
  }

  return {
    ...parsed,
    subjects,
    integerQuestions,
    answerKey,
    questions: fullQuestions,
    pdfStartPage: parsed.pdfStartPage || 1,
    pdfEndPage: parsed.pdfEndPage || 24,
  };
}

async function resolvePdfBase64(pdfUrl: string): Promise<string> {
  const filename = path.basename(pdfUrl.split('?')[0]);

  // 1. Check local public/uploads
  const localUploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
  if (fs.existsSync(localUploadPath)) {
    return fs.readFileSync(localUploadPath).toString('base64');
  }

  // 2. Check public root
  const publicPath = path.join(process.cwd(), 'public', filename);
  if (fs.existsSync(publicPath)) {
    return fs.readFileSync(publicPath).toString('base64');
  }

  // 3. Check os.tmpdir() for serverless Vercel
  const tmpPath = path.join(os.tmpdir(), 'jee-portal-uploads', filename);
  if (fs.existsSync(tmpPath)) {
    return fs.readFileSync(tmpPath).toString('base64');
  }

  // 4. If remote URL (Supabase storage or Vercel Blob)
  let resolvedUrl = pdfUrl;
  if (pdfUrl.startsWith('/')) {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    const base = host ? `https://${host}` : 'http://localhost:3000';
    resolvedUrl = `${base}${pdfUrl}`;
  }

  const fetchRes = await fetch(resolvedUrl);
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch PDF from URL: ${pdfUrl} (status ${fetchRes.status})`);
  }
  const arrayBuf = await fetchRes.arrayBuffer();
  return Buffer.from(arrayBuf).toString('base64');
}
