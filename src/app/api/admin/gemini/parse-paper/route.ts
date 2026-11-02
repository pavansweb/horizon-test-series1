import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { SubjectConfig, TestQuestion } from '@/lib/types';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Up to 60 seconds for AI paper analysis

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

// Active Google Gemini models in priority order
const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

export async function POST(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Load primary and backup Gemini API keys for seamless failover & rate limit mitigation
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
    let pdfBase64 = '';
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('pdf') as File | null;
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        pdfBase64 = buffer.toString('base64');
      } else {
        const pdfUrl = formData.get('pdfUrl') as string | null;
        if (pdfUrl) {
          pdfBase64 = await resolvePdfBase64(pdfUrl);
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.pdfBase64) {
        pdfBase64 = body.pdfBase64;
      } else if (body.pdfUrl) {
        pdfBase64 = await resolvePdfBase64(body.pdfUrl);
      }
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, error: 'No PDF file or URL provided to analyze.' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert exam analyzer for JEE Main examination papers.
Analyze this JEE question paper PDF thoroughly. Extract the complete structure, answer key, and questions.
Keep solutions empty "" to conserve tokens and ensure speed and full question extraction.

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
  "detectedSummary": string,
  "questions": [
    {
      "questionNumber": number,
      "subjectId": "physics" | "chemistry" | "mathematics",
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
}

Critical Instructions:
1. SUBJECT SEQUENCE & ORDER:
   Examine which subject appears FIRST in the question paper!
   - If Mathematics is first (e.g. Q1-25), list Mathematics as first subject.
   - If Physics is first (e.g. Q1-25), list Physics first.
   - If Chemistry is first, list Chemistry first.
   - Ensure startQuestion and endQuestion cover all questions (e.g. 1-25, 26-50, 51-75).

2. INTEGER QUESTIONS:
   Identify which questions are Numerical Value / Section B type (e.g. 21-25, 46-50, 71-75).
   List them in the "integerQuestions" array.

3. ANSWER KEY EXTRACTION:
   - Search the entire PDF (especially the last few pages) for the official Answer Key or Solutions.
   - For MCQs: convert options (1, 2, 3, 4) to uppercase letters ('A', 'B', 'C', 'D').
   - For Numerical questions: preserve the numerical answer string (e.g. "5", "12").
   - Populate EVERY question in "answerKey" (e.g. "1": "C", "2": "D", ...).

4. PAGE RANGES FOR CBT STUDENT EXAM:
   - pdfStartPage: 1-based page number where Question 1 starts.
   - pdfEndPage: 1-based page number where the LAST QUESTION ends, BEFORE solutions begin.

5. QUESTIONS ARRAY:
   - Extract questions into "questions". For MCQs, provide all 4 options. For numerical, empty options [].
   - Use standard LaTeX $...$ for formulas.
   - Return ONLY clean, valid JSON matching the schema.`;

    let lastError: string | null = null;

    // Loop through available API keys and models with automatic rotation on rate limits / quota exhaustion
    for (let keyIdx = 0; keyIdx < uniqueKeys.length; keyIdx++) {
      const activeKey = uniqueKeys[keyIdx];
      let keyHitRateLimit = false;

      for (const model of GEMINI_MODELS) {
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), 45000);

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: 'application/pdf',
                        data: pdfBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.1,
              },
            }),
            signal: controller.signal,
          });

          const data = await response.json();

          if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const rawText = data.candidates[0].content.parts[0].text;
            const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(cleanedText);

            // Ensure complete exam structure and synthesize any missing questions
            const enriched = ensureFullExamQuestions(parsed);

            return NextResponse.json({
              success: true,
              modelUsed: model,
              keyIndexUsed: keyIdx + 1,
              totalKeysConfigured: uniqueKeys.length,
              data: enriched,
            });
          } else {
            const errMsg = data.error?.message || `Model ${model} returned status ${response.status}`;
            lastError = errMsg;
            const isRateLimit = response.status === 429 || /quota|rate\s*limit|resource_exhausted/i.test(errMsg);
            console.warn(`Horizon AI (${model}, Key #${keyIdx + 1}) failed: ${errMsg}`);

            if (isRateLimit) {
              keyHitRateLimit = true;
              console.warn(`Key #${keyIdx + 1} hit rate limit / quota, rotating to backup key if available...`);
              break; // Switch to the next API key immediately
            }
          }
        } catch (err: unknown) {
          lastError = (err as Error)?.message || 'Network error';
          console.warn(`Error with ${model} on Key #${keyIdx + 1}:`, err);
        } finally {
          clearTimeout(timeoutTimer);
        }
      }

      if (keyHitRateLimit && keyIdx < uniqueKeys.length - 1) {
        continue;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: `Gemini parsing failed across all models. Last error: ${lastError}`,
      },
      { status: 502 }
    );
  } catch (error: unknown) {
    console.error('Unhandled error in Gemini parse route:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Ensures that all questions (1 to totalQuestions, e.g. 75) are present.
 * Uses extracted questions where available, and fills in missing questions with
 * their subject section, question type, and correct answer key from Gemini.
 */
function ensureFullExamQuestions(parsed: ParsedExamData) {
  // Normalize subjects
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

  // Normalize integer questions
  const integerQuestions: number[] = Array.isArray(parsed.integerQuestions)
    ? parsed.integerQuestions.map(Number)
    : [21, 22, 23, 24, 25, 46, 47, 48, 49, 50, 71, 72, 73, 74, 75];

  // Normalize answer key
  const answerKey: Record<string, string> = {};
  if (parsed.answerKey && typeof parsed.answerKey === 'object') {
    Object.entries(parsed.answerKey).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        answerKey[String(k)] = String(v).toUpperCase().trim();
      }
    });
  }

  // Index existing parsed questions
  const existingQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questionMap = new Map<number, Partial<TestQuestion>>();
  for (const q of existingQuestions) {
    if (q && typeof q.questionNumber === 'number') {
      questionMap.set(q.questionNumber, q);
      // Merge answer into answer key if present
      if (q.correctAnswer && !answerKey[String(q.questionNumber)]) {
        answerKey[String(q.questionNumber)] = String(q.correctAnswer).toUpperCase().trim();
      }
    }
  }

  // Compute total questions
  const totalFromSubjects = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
  const totalFromKeys = Object.keys(answerKey).length;
  const maxKeyNum = Object.keys(answerKey).reduce((max, k) => Math.max(max, Number(k) || 0), 0);
  const totalQuestions = Math.max(totalFromSubjects, totalFromKeys, maxKeyNum, 75);

  const fullQuestions: TestQuestion[] = [];

  for (let qNum = 1; qNum <= totalQuestions; qNum++) {
    // Determine subject
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
      fullQuestions.push({
        questionNumber: qNum,
        subjectId: q.subjectId || subject.id,
        type: isInteger ? 'numerical' : (q.type || 'mcq'),
        questionText:
          q.questionText && q.questionText.trim().length > 5
            ? q.questionText
            : `Question ${qNum} (refer to original question paper PDF)`,
        options: isInteger
          ? []
          : (Array.isArray(q.options) && q.options.length === 4
              ? q.options
              : [
                  { id: 'A', text: 'Option A' },
                  { id: 'B', text: 'Option B' },
                  { id: 'C', text: 'Option C' },
                  { id: 'D', text: 'Option D' },
                ]),
        correctAnswer: q.correctAnswer || correct,
        solution: q.solution || '',
      });
    } else {
      fullQuestions.push({
        questionNumber: qNum,
        subjectId: subject.id,
        type: isInteger ? 'numerical' : 'mcq',
        questionText: `Question ${qNum} (refer to original question paper PDF)`,
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
  if (pdfUrl.startsWith('/uploads/') || pdfUrl.startsWith('/')) {
    const filename = pdfUrl.replace(/^\/uploads\//, '').replace(/^\//, '');
    const localUploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(localUploadPath)) {
      return fs.readFileSync(localUploadPath).toString('base64');
    }
    const publicPath = path.join(process.cwd(), 'public', filename);
    if (fs.existsSync(publicPath)) {
      return fs.readFileSync(publicPath).toString('base64');
    }
  }

  const fetchRes = await fetch(pdfUrl);
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`);
  }
  const arrayBuf = await fetchRes.arrayBuffer();
  return Buffer.from(arrayBuf).toString('base64');
}
