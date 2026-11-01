import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { Test, PublicTest, TestResult } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), 'jee-portal-data')
  : path.join(process.cwd(), 'data');

const TESTS_FILE = path.join(DATA_DIR, 'tests.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// In-memory cache for fast reads during active test sessions
let submissionsCache: Record<string, TestResult> | null = null;

async function ensureDataFiles(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Ignore read-only or existing dir
  }

  try {
    await fs.access(TESTS_FILE);
  } catch {
    try {
      // Seed from bundled data if available
      const bundledPath = path.join(process.cwd(), 'data', 'tests.json');
      let initialData = '[]';
      try {
        initialData = await fs.readFile(bundledPath, 'utf-8');
      } catch {
        // Ignore
      }
      await fs.writeFile(TESTS_FILE, initialData, 'utf-8');
    } catch {
      // Read-only filesystem
    }
  }

  try {
    await fs.access(SUBMISSIONS_FILE);
  } catch {
    try {
      await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    } catch {
      // Read-only filesystem
    }
  }
}

async function getLocalTests(includeDrafts: boolean = false): Promise<Test[]> {
  try {
    await ensureDataFiles();
  } catch {
    // Ignore
  }

  try {
    const raw = await fs.readFile(TESTS_FILE, 'utf-8');
    const tests: Test[] = JSON.parse(raw);
    if (includeDrafts) return tests;
    return tests.filter((t) => t.status === 'published');
  } catch {
    // Fallback: try reading bundled tests.json
    try {
      const bundledPath = path.join(process.cwd(), 'data', 'tests.json');
      const raw = await fs.readFile(bundledPath, 'utf-8');
      const tests: Test[] = JSON.parse(raw);
      if (includeDrafts) return tests;
      return tests.filter((t) => t.status === 'published');
    } catch {
      return [];
    }
  }
}

async function saveTestLocally(test: Test): Promise<void> {
  try {
    await ensureDataFiles();
    const tests = await getLocalTests(true);
    const index = tests.findIndex((t) => t.id === test.id);
    if (index >= 0) {
      tests[index] = test;
    } else {
      tests.unshift(test);
    }
    await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local test cache save skipped (non-fatal):', err);
  }
}

type DbRow = Record<string, unknown>;

/**
 * Normalizes test row from Supabase or local storage.
 * Reads integerQuestions, pdfStartPage, and pdfEndPage from top-level columns
 * OR falls back to embedded markingScheme properties if the columns don't exist in Supabase schema.
 */
function hydrateTest(row: DbRow | Test): Test {
  const r = row as Record<string, unknown>;
  const markingScheme = (r.markingScheme as Record<string, unknown>) || {};
  return {
    ...(r as unknown as Test),
    id: (r.id as string) || crypto.randomUUID(),
    title: (r.title as string) || 'Untitled Test',
    duration: typeof r.duration === 'number' ? r.duration : 180,
    totalMarks: typeof r.totalMarks === 'number' ? r.totalMarks : 300,
    pdfUrl: (r.pdfUrl as string) || '',
    pdfFileName: (r.pdfFileName as string) || '',
    subjects: Array.isArray(r.subjects) ? (r.subjects as Test['subjects']) : [],
    markingScheme: (r.markingScheme as Test['markingScheme']) || { correct: 4, incorrect: -1, unattempted: 0 },
    answerKey: (r.answerKey as Test['answerKey']) || {},
    status: (r.status as Test['status']) || 'draft',
    createdAt: (r.createdAt as string) || new Date().toISOString(),
    updatedAt: (r.updatedAt as string) || new Date().toISOString(),
    integerQuestions:
      Array.isArray(r.integerQuestions) && r.integerQuestions.length > 0
        ? (r.integerQuestions as number[])
        : Array.isArray(markingScheme._integerQuestions)
        ? (markingScheme._integerQuestions as number[])
        : undefined,
    questions:
      Array.isArray(r.questions) && r.questions.length > 0
        ? (r.questions as Test['questions'])
        : Array.isArray(markingScheme._questions)
        ? (markingScheme._questions as Test['questions'])
        : undefined,
    pdfStartPage:
      r.pdfStartPage !== undefined && r.pdfStartPage !== null
        ? Number(r.pdfStartPage)
        : markingScheme._pdfStartPage !== undefined && markingScheme._pdfStartPage !== null
        ? Number(markingScheme._pdfStartPage)
        : 1,
    pdfEndPage:
      r.pdfEndPage !== undefined && r.pdfEndPage !== null
        ? Number(r.pdfEndPage)
        : markingScheme._pdfEndPage !== undefined && markingScheme._pdfEndPage !== null
        ? Number(markingScheme._pdfEndPage)
        : undefined,
  };
}

/**
 * Prepares payload for Supabase.
 * If fallbackMode is true, strips top-level columns that might not exist in older schemas
 * (integerQuestions, pdfStartPage, pdfEndPage) and embeds them safely in markingScheme JSONB.
 */
function prepareSupabasePayload(test: Test, fallbackMode: boolean = false): DbRow {
  if (!fallbackMode) {
    return { ...test } as unknown as DbRow;
  }
  const { integerQuestions, pdfStartPage, pdfEndPage, questions, ...base } = test;
  return {
    ...base,
    markingScheme: {
      ...test.markingScheme,
      _integerQuestions: integerQuestions || [],
      _pdfStartPage: pdfStartPage || 1,
      _pdfEndPage: pdfEndPage || null,
      _questions: questions || [],
    },
  } as unknown as DbRow;
}

/**
 * Reads all tests from storage (Supabase or Local JSON)
 */
export async function getAllTests(includeDrafts: boolean = false): Promise<Test[]> {
  // If Supabase configured:
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('jee_tests').select('*').order('createdAt', { ascending: false });
      if (!includeDrafts) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return (data as unknown as DbRow[]).map(hydrateTest);
      }
      if (error) {
        console.warn('Supabase DB fetch error, falling back to local file:', error.message);
      }
    } catch (err) {
      console.warn('Supabase DB fetch error, falling back to local file:', err);
    }
  }

  // Local file storage fallback
  return (await getLocalTests(includeDrafts)).map(hydrateTest);
}

/**
 * Gets a test by ID (including full answer key for grading & admin)
 */
export async function getTestById(id: string): Promise<Test | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('jee_tests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return hydrateTest(data as unknown as DbRow);
      }
      if (error) {
        console.warn('Supabase DB error fetching test:', error.message);
      }
    } catch (err) {
      console.warn('Supabase DB error fetching test:', err);
    }
  }

  const tests = await getLocalTests(true);
  const found = tests.find((t) => t.id === id);
  return found ? hydrateTest(found) : null;
}

/**
 * Gets a public test object for student CBT - STRICTLY EXCLUDES answerKey!
 */
export async function getPublicTestById(id: string): Promise<PublicTest | null> {
  const test = await getTestById(id);
  if (!test || test.status !== 'published') {
    return null;
  }

  const totalQuestions = test.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  // Return public representation - strictly omitting answerKey and question solutions!
  const publicQuestions = test.questions?.map((q) => ({
    questionNumber: q.questionNumber,
    subjectId: q.subjectId,
    type: q.type,
    questionText: q.questionText,
    options: q.options,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
  }));

  const publicTest: PublicTest = {
    id: test.id,
    title: test.title,
    duration: test.duration,
    totalMarks: test.totalMarks,
    pdfUrl: test.pdfUrl,
    pdfFileName: test.pdfFileName,
    pdfStartPage: test.pdfStartPage,
    pdfEndPage: test.pdfEndPage,
    integerQuestions: test.integerQuestions,
    subjects: test.subjects,
    questions: publicQuestions,
    markingScheme: test.markingScheme,
    totalQuestions: totalQuestions || 75,
    status: test.status,
    createdAt: test.createdAt,
  };

  return publicTest;
}

/**
 * Creates a new test
 */
export async function createTest(
  data: Omit<Test, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Test> {
  const now = new Date().toISOString();
  const newTest: Test = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  // Supabase:
  if (isSupabaseConfigured && supabase) {
    try {
      let savedRow: DbRow | null = null;

      // 1. Try standard insert with all dedicated columns
      const firstAttempt = await supabase
        .from('jee_tests')
        .insert(prepareSupabasePayload(newTest, false))
        .select()
        .maybeSingle();

      if (!firstAttempt.error && firstAttempt.data) {
        savedRow = firstAttempt.data as unknown as DbRow;
      } else if (firstAttempt.error) {
        // If error is due to missing columns in Supabase schema cache:
        const isMissingCol =
          firstAttempt.error.message.includes('column') ||
          firstAttempt.error.message.includes('schema cache');

        if (isMissingCol) {
          console.warn(
            'Supabase schema missing new columns (e.g. integerQuestions). Retrying insert with embedded JSON attributes...'
          );
          const fallbackAttempt = await supabase
            .from('jee_tests')
            .insert(prepareSupabasePayload(newTest, true))
            .select()
            .maybeSingle();

          if (!fallbackAttempt.error && fallbackAttempt.data) {
            savedRow = fallbackAttempt.data as unknown as DbRow;
          } else if (fallbackAttempt.error) {
            console.warn('Supabase DB fallback insert error, saving to local file:', fallbackAttempt.error.message);
          }
        } else {
          console.warn('Supabase DB insert error, saving to local file:', firstAttempt.error.message);
        }
      }

      if (savedRow) {
        const hydrated = hydrateTest(savedRow);
        await saveTestLocally(hydrated);
        return hydrated;
      }
    } catch (err) {
      console.warn('Supabase DB insert error, saving to local file:', err);
    }
  }

  // Local JSON fallback:
  await saveTestLocally(newTest);
  return newTest;
}

/**
 * Updates an existing test
 */
export async function updateTest(id: string, updates: Partial<Test>): Promise<Test | null> {
  const existing = await getTestById(id);
  if (!existing) return null;

  const updatedTest: Test = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      let savedRow: DbRow | null = null;

      const firstAttempt = await supabase
        .from('jee_tests')
        .update(prepareSupabasePayload(updatedTest, false))
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!firstAttempt.error && firstAttempt.data) {
        savedRow = firstAttempt.data as unknown as DbRow;
      } else if (firstAttempt.error) {
        const isMissingCol =
          firstAttempt.error.message.includes('column') ||
          firstAttempt.error.message.includes('schema cache');

        if (isMissingCol) {
          console.warn(
            'Supabase schema missing new columns (e.g. integerQuestions). Retrying update with embedded JSON attributes...'
          );
          const fallbackAttempt = await supabase
            .from('jee_tests')
            .update(prepareSupabasePayload(updatedTest, true))
            .eq('id', id)
            .select()
            .maybeSingle();

          if (!fallbackAttempt.error && fallbackAttempt.data) {
            savedRow = fallbackAttempt.data as unknown as DbRow;
          } else if (fallbackAttempt.error) {
            console.warn('Supabase DB fallback update error, saving to local file:', fallbackAttempt.error.message);
          }
        } else {
          console.warn('Supabase DB update error, saving to local file:', firstAttempt.error.message);
        }
      }

      if (savedRow) {
        const hydrated = hydrateTest(savedRow);
        await saveTestLocally(hydrated);
        return hydrated;
      }
    } catch (err) {
      console.warn('Supabase DB update error, saving to local file:', err);
    }
  }

  await saveTestLocally(updatedTest);
  return updatedTest;
}

/**
 * Deletes a test
 */
export async function deleteTest(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('jee_tests').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  try {
    await ensureDataFiles();
    const tests = await getLocalTests(true);
    const filtered = tests.filter((t) => t.id !== id);
    await fs.writeFile(TESTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local delete cache skipped (non-fatal):', err);
  }
  return true;
}

/**
 * Saves candidate test submission & result
 */
export async function saveSubmission(result: TestResult): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('jee_submissions').upsert({
        submissionId: result.submissionId,
        testId: result.testId,
        data: result,
        createdAt: result.submittedAt,
      });

      if (error) {
        console.warn('Supabase saveSubmission error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase saveSubmission error:', err);
    }
  }

  if (!submissionsCache) submissionsCache = {};
  submissionsCache[result.submissionId] = result;

  try {
    await ensureDataFiles();
    let submissions: Record<string, TestResult> = {};
    try {
      const raw = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
      submissions = JSON.parse(raw);
    } catch {
      submissions = {};
    }
    submissions[result.submissionId] = result;
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
    submissionsCache = submissions;
  } catch (err) {
    console.warn('Local submission cache save skipped (non-fatal):', err);
  }
}

/**
 * Gets submission result by submissionId
 */
export async function getSubmissionById(submissionId: string): Promise<TestResult | null> {
  if (submissionsCache && submissionsCache[submissionId]) {
    return submissionsCache[submissionId];
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('jee_submissions')
        .select('data')
        .eq('submissionId', submissionId)
        .maybeSingle();

      if (!error && data?.data) {
        const res = data.data as TestResult;
        if (!submissionsCache) submissionsCache = {};
        submissionsCache[submissionId] = res;
        return res;
      }
    } catch (err) {
      console.warn('Supabase getSubmissionById error:', err);
    }
  }

  try {
    await ensureDataFiles();
    const raw = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    const submissions: Record<string, TestResult> = JSON.parse(raw);
    submissionsCache = submissions;
    return submissions[submissionId] || null;
  } catch {
    return null;
  }
}
