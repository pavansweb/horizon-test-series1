import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for AI paper analysis

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

export async function POST(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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
Analyze this JEE question paper PDF thoroughly and extract its complete structure and answer key.
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
1. SUBJECT SEQUENCE & ORDER:
   Examine which subject appears FIRST in the question paper!
   - If Chemistry is the first section (e.g. Q1-25 or Q1-30), list Chemistry as the FIRST item in the "subjects" array!
   - If Physics is first, list Physics first.
   - If Mathematics is first, list Mathematics first.
   - Ensure startQuestion, endQuestion, and totalQuestions are contiguous and accurate (e.g. 1-25, 26-50, 51-75).

2. INTEGER QUESTIONS:
   Identify which questions are Numerical Value / Integer type (typically the last 5 questions of each section, e.g. 21-25, 46-50, 71-75, or 21-30, 51-60, 81-90). List all their question numbers in the "integerQuestions" array.

3. ANSWER KEY:
   - Search the entire PDF (especially the last few pages or question end) for any Answer Key, Solutions, or Key table.
   - For Multiple Choice Questions: convert numeric options (1, 2, 3, 4) or ((1), (2), (3), (4)) to letters A, B, C, D.
   - For Numerical/Integer Questions: preserve the numerical answer (e.g. "4", "15", "0.5").
   - If no answer key is found in the PDF, return an empty object {} for "answerKey".

4. PAGE RANGES:
   - pdfStartPage: The page where Section 1 / Question 1 actually starts (skip cover/instructions page if present).
   - pdfEndPage: The last page containing questions or answers.

5. Return ONLY clean, raw JSON matching the schema above.`;

    let lastError = null;

    // Try available Gemini models with fallback
    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        });

        const data = await response.json();

        if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(cleanedText);

          return NextResponse.json({
            success: true,
            modelUsed: model,
            data: parsed,
          });
        } else {
          lastError = data.error?.message || `Model ${model} returned status ${response.status}`;
          console.warn(`Gemini model ${model} failed, trying next:`, lastError);
        }
      } catch (err: unknown) {
        lastError = (err as Error)?.message;
        console.warn(`Error with ${model}:`, err);
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

async function resolvePdfBase64(pdfUrl: string): Promise<string> {
  // If it's a local path like /uploads/...
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

  // Otherwise fetch via HTTP
  const fetchRes = await fetch(pdfUrl);
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch PDF from URL: ${pdfUrl}`);
  }
  const arrayBuf = await fetchRes.arrayBuffer();
  return Buffer.from(arrayBuf).toString('base64');
}
