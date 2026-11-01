import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Test, PublicTest, TestResult } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const TESTS_FILE = path.join(DATA_DIR, 'tests.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory cache for fast reads during active test sessions
let submissionsCache: Record<string, TestResult> | null = null;

async function ensureDataFiles(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(TESTS_FILE);
  } catch {
    await fs.writeFile(TESTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  try {
    await fs.access(SUBMISSIONS_FILE);
  } catch {
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
  }
}

/**
 * Reads all tests from storage (Supabase or Local JSON)
 */
export async function getAllTests(includeDrafts: boolean = false): Promise<Test[]> {
  // If Supabase configured:
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      let queryUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_tests?select=*`;
      if (!includeDrafts) {
        queryUrl += '&status=eq.published';
      }
      queryUrl += '&order=createdAt.desc';

      const res = await fetch(queryUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const rows = await res.json();
        return rows as Test[];
      }
    } catch (err) {
      console.warn('Supabase DB fetch error, falling back to local file:', err);
    }
  }

  // Local file storage
  await ensureDataFiles();
  try {
    const raw = await fs.readFile(TESTS_FILE, 'utf-8');
    const tests: Test[] = JSON.parse(raw);
    if (includeDrafts) {
      return tests;
    }
    return tests.filter((t) => t.status === 'published');
  } catch {
    return [];
  }
}

/**
 * Gets a test by ID (including full answer key for grading & admin)
 */
export async function getTestById(id: string): Promise<Test | null> {
  // If Supabase configured:
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const queryUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_tests?id=eq.${id}&select=*`;
      const res = await fetch(queryUrl, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) return rows[0] as Test;
      }
    } catch (err) {
      console.warn('Supabase DB error fetching test:', err);
    }
  }

  const tests = await getAllTests(true);
  return tests.find((t) => t.id === id) || null;
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

  // Return public representation - strictly omitting answerKey
  const publicTest: PublicTest = {
    id: test.id,
    title: test.title,
    duration: test.duration,
    totalMarks: test.totalMarks,
    pdfUrl: test.pdfUrl,
    pdfFileName: test.pdfFileName,
    subjects: test.subjects,
    markingScheme: test.markingScheme,
    totalQuestions: totalQuestions || 90,
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
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_tests`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(newTest),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved[0]) return saved[0] as Test;
      }
    } catch (err) {
      console.warn('Supabase DB insert error, saving to local file:', err);
    }
  }

  // Local JSON:
  await ensureDataFiles();
  const tests = await getAllTests(true);
  tests.unshift(newTest);
  await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2), 'utf-8');

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

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_tests?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(updatedTest),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved && saved[0]) return saved[0] as Test;
      }
    } catch (err) {
      console.warn('Supabase DB update error, saving to local file:', err);
    }
  }

  await ensureDataFiles();
  const tests = await getAllTests(true);
  const index = tests.findIndex((t) => t.id === id);
  if (index !== -1) {
    tests[index] = updatedTest;
    await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2), 'utf-8');
    return updatedTest;
  }

  return null;
}

/**
 * Deletes a test
 */
export async function deleteTest(id: string): Promise<boolean> {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_tests?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  await ensureDataFiles();
  const tests = await getAllTests(true);
  const filtered = tests.filter((t) => t.id !== id);
  await fs.writeFile(TESTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

/**
 * Saves candidate test submission & result
 */
export async function saveSubmission(result: TestResult): Promise<void> {
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_submissions`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: result.submissionId,
          testId: result.testId,
          data: result,
          createdAt: result.submittedAt,
        }),
      });
    } catch (err) {
      console.warn('Supabase saveSubmission error:', err);
    }
  }

  await ensureDataFiles();
  try {
    const raw = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    const submissions: Record<string, TestResult> = JSON.parse(raw);
    submissions[result.submissionId] = result;
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
    submissionsCache = submissions;
  } catch (err) {
    console.error('Failed to save submission locally:', err);
  }
}

/**
 * Gets submission result by submissionId
 */
export async function getSubmissionById(submissionId: string): Promise<TestResult | null> {
  if (submissionsCache && submissionsCache[submissionId]) {
    return submissionsCache[submissionId];
  }

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/jee_submissions?submissionId=eq.${submissionId}&select=*`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) return rows[0].data as TestResult;
      }
    } catch (err) {
      console.warn('Supabase getSubmissionById error:', err);
    }
  }

  await ensureDataFiles();
  try {
    const raw = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    const submissions: Record<string, TestResult> = JSON.parse(raw);
    submissionsCache = submissions;
    return submissions[submissionId] || null;
  } catch {
    return null;
  }
}
