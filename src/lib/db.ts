import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { Test, PublicTest, TestResult } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const TESTS_FILE = path.join(DATA_DIR, 'tests.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

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

async function getLocalTests(includeDrafts: boolean = false): Promise<Test[]> {
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

async function saveTestLocally(test: Test): Promise<void> {
  await ensureDataFiles();
  const tests = await getLocalTests(true);
  const index = tests.findIndex((t) => t.id === test.id);
  if (index >= 0) {
    tests[index] = test;
  } else {
    tests.unshift(test);
  }
  await fs.writeFile(TESTS_FILE, JSON.stringify(tests, null, 2), 'utf-8');
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
        return data as Test[];
      }
      if (error) {
        console.warn('Supabase DB fetch error, falling back to local file:', error.message);
      }
    } catch (err) {
      console.warn('Supabase DB fetch error, falling back to local file:', err);
    }
  }

  // Local file storage fallback
  return getLocalTests(includeDrafts);
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
        return data as Test;
      }
      if (error) {
        console.warn('Supabase DB error fetching test:', error.message);
      }
    } catch (err) {
      console.warn('Supabase DB error fetching test:', err);
    }
  }

  const tests = await getLocalTests(true);
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
    pdfStartPage: test.pdfStartPage,
    pdfEndPage: test.pdfEndPage,
    integerQuestions: test.integerQuestions,
    subjects: test.subjects,
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
      const { data: saved, error } = await supabase
        .from('jee_tests')
        .insert(newTest)
        .select()
        .maybeSingle();

      if (!error && saved) {
        await saveTestLocally(saved as Test);
        return saved as Test;
      }
      if (error) {
        console.warn('Supabase DB insert error, saving to local file:', error.message);
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
      const { data: saved, error } = await supabase
        .from('jee_tests')
        .update(updatedTest)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && saved) {
        await saveTestLocally(saved as Test);
        return saved as Test;
      }
      if (error) {
        console.warn('Supabase DB update error, saving to local file:', error.message);
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

  await ensureDataFiles();
  const tests = await getLocalTests(true);
  const filtered = tests.filter((t) => t.id !== id);
  await fs.writeFile(TESTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
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
