import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { SubjectConfig, TestQuestion } from '@/lib/types';
import { savePdf } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Up to 60 seconds where supported

interface ParsedExamData {
  title?: string;
  durationMinutes?: number;
  subjects?: Array<{
    id?: string;
    name?: string;
    startQuestion?: number;
    endQuestion?: number;
    totalQuestions?: number;
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
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

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
Return a STRICTLY VALID JSON object with this exact schema:
{
  "title": string,
  "durationMinutes": number,
  "subjects": [
    {
      "id": "physics" | "chemistry" | "mathematics",
      "name": "Physics" | "Chemistry" | "Mathematics",
      "startQuestion": number,
      "endQuestion": number,
      "totalQuestions": number
    }
  ],
  "integerQuestions": number[],
  "answerKey": {
    "[questionNumber: string]": string
  },
  "pdfStartPage": number,
  "pdfEndPage": number,
  "detectedSummary": string
}

Critical Instructions:
1. Preserve subject sequence as they appear in the question paper (e.g. Mathematics Q1-25 first, or Physics Q1-25 first).
2. Extract the complete answer key for every question (1 to 75 or 90). Search the final pages for the Answer Key / Solutions table. Convert MCQ numbers (1, 2, 3, 4) to uppercase letters (A, B, C, D).
3. Identify numerical/integer questions (e.g. Q21-25, Q46-50, Q71-75).
4. Return ONLY valid JSON.`;

    let parsedStructure: ParsedExamData | null = null;
    let lastError: string | null = null;

    for (let keyIdx = 0; keyIdx < uniqueKeys.length; keyIdx++) {
      const activeKey = uniqueKeys[keyIdx];

      for (const model of GEMINI_MODELS) {
        try {
          const res = await callGemini(activeKey, model, structurePrompt, pdfBase64, 8000, 0);
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
  const prompt = `You are an expert exam analyzer for JEE Main examination papers.
Analyze this JEE question paper PDF. Extract ALL questions from Question ${startQ} to Question ${endQ} (${subject.name}).

CRITICAL REQUIREMENTS:
1. ONLY ENGLISH: Extract ONLY the English question statement and English options. Completely IGNORE Hindi translation!
2. NO PLACEHOLDERS: Extract the real question statement and real option text for EVERY question from ${startQ} to ${endQ}.
3. MCQs must have 4 options (A, B, C, D) with their exact text. Strip redundant "(A)" or "1." prefixes from option text.
4. Numerical/Integer questions must have empty options [].
5. LATEX FORMULAS: Convert all math, units, and chemistry formulas to standard LaTeX ($...$).
   - Examples: $E = mc^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\text{m/s}^2$, $10^{-8}\\text{ T}$, $\\vec{A}$, $\\mathrm{H_2SO_4}$.
6. Keep solution empty "" to preserve tokens and response speed.

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
      "correctAnswer": string
    }
  ]
}`;

  for (let k = 0; k < uniqueKeys.length; k++) {
    const key = uniqueKeys[(chunkIndex + k) % uniqueKeys.length];

    for (const model of GEMINI_MODELS) {
      try {
        const res = await callGemini(key, model, prompt, pdfBase64, 14000, 0);
        if (res) {
          const parsed = JSON.parse(res);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions as TestQuestion[];
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
  const prompt = `You are an expert exam analyzer for JEE Main examination papers.
Analyze this JEE question paper PDF. Extract ONLY Question ${questionNumber}.

CRITICAL REQUIREMENTS:
1. ONLY ENGLISH: Extract ONLY the English question statement and English options. Completely IGNORE Hindi translation!
2. Extract the complete, exact question statement and option text.
3. If MCQ, return 4 options (A, B, C, D) with their exact text. Strip redundant prefixes like "(A)" or "1.".
4. If numerical/integer, options must be empty [].
5. LATEX FORMULAS: Convert all math, units, and chemistry formulas to standard LaTeX ($...$).
   - Examples: $E = mc^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $\\text{m/s}^2$, $10^{-8}\\text{ T}$, $\\vec{A}$, $\\mathrm{H_2SO_4}$.

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
  "correctAnswer": string
}`;

  for (let k = 0; k < uniqueKeys.length; k++) {
    const key = uniqueKeys[k];
    for (const model of GEMINI_MODELS) {
      try {
        const res = await callGemini(key, model, prompt, pdfBase64, 13000, 0);
        if (res) {
          const parsed = JSON.parse(res);
          if (parsed && parsed.questionText) {
            return parsed as Partial<TestQuestion>;
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
Ensure equations, exponents, square roots, fractions, vectors, and units use standard LaTeX ($...$).
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
  ]
}`;

  for (const key of uniqueKeys) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await callGemini(key, model, prompt, '', 15000, 0);
        if (res) {
          const parsed = JSON.parse(res);
          return {
            ...q,
            questionText: parsed.questionText || q.questionText,
            options: isNumerical ? [] : (parsed.options || q.options),
          };
        }
      } catch {
        // try next
      }
    }
  }

  return q;
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
  retries: number = 1
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

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return cleanJsonString(data.candidates[0].content.parts[0].text);
      }

      const status = response.status;
      const errorMsg = data.error?.message || `Status ${status}`;

      if ((status === 503 || status === 429) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));
        continue;
      }

      throw new Error(errorMsg);
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
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

      fullQuestions.push({
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
      });
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
