-- ========================================================
-- HORIZON TEST SERIES - SUPABASE DATABASE & STORAGE SCHEMA
-- ========================================================
-- Run this script in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/xdfpixytkjneiedexhfk
-- 2. Click "SQL Editor" on the left menu
-- 3. Paste this entire script and click "Run"
-- ========================================================

-- 1. Create jee_tests table
CREATE TABLE IF NOT EXISTS public.jee_tests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 180,
  "totalMarks" INTEGER NOT NULL DEFAULT 300,
  "pdfUrl" TEXT NOT NULL,
  "pdfFileName" TEXT,
  "pdfStartPage" INTEGER DEFAULT 1,
  "pdfEndPage" INTEGER,
  "integerQuestions" JSONB DEFAULT '[]'::jsonb,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  "markingScheme" JSONB NOT NULL DEFAULT '{"correct": 4, "incorrect": -1, "unattempted": 0}'::jsonb,
  "answerKey" JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quick migration for existing tables:
ALTER TABLE public.jee_tests 
  ADD COLUMN IF NOT EXISTS "integerQuestions" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "pdfStartPage" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "pdfEndPage" INTEGER;

-- 2. Create jee_submissions table
CREATE TABLE IF NOT EXISTS public.jee_submissions (
  "submissionId" TEXT PRIMARY KEY,
  "testId" TEXT NOT NULL,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.jee_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jee_submissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Allow read & write access
CREATE POLICY "Allow public read access to tests" 
  ON public.jee_tests FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert and update on tests" 
  ON public.jee_tests FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public read and write on submissions" 
  ON public.jee_submissions FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 5. Create Storage Bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('jee-question-papers', 'jee-question-papers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
CREATE POLICY "Public Access to Question Papers" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'jee-question-papers');

CREATE POLICY "Allow uploads to Question Papers" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'jee-question-papers');

-- 6. Initial Seed Data: JEE Main 2026 75-Question Test Paper
INSERT INTO public.jee_tests (
  id,
  title,
  duration,
  "totalMarks",
  "pdfUrl",
  "pdfFileName",
  subjects,
  "markingScheme",
  "answerKey",
  status,
  "createdAt",
  "updatedAt"
) VALUES (
  'jee-2026-sample-01',
  'JEE (Main) 2026 Full Syllabus Mock Test - Paper 1',
  180,
  300,
  '/uploads/jee_main_2026_sample_paper_1.pdf',
  'jee_main_2026_sample_paper_1.pdf',
  '[
    {"id": "physics", "name": "Physics", "startQuestion": 1, "endQuestion": 25, "totalQuestions": 25},
    {"id": "chemistry", "name": "Chemistry", "startQuestion": 26, "endQuestion": 50, "totalQuestions": 25},
    {"id": "mathematics", "name": "Mathematics", "startQuestion": 51, "endQuestion": 75, "totalQuestions": 25}
  ]'::jsonb,
  '{"correct": 4, "incorrect": -1, "unattempted": 0}'::jsonb,
  '{"1": "A", "2": "B", "3": "C", "4": "A", "5": "A", "6": "B", "7": "A", "8": "B", "9": "B", "10": "A", "11": "A", "12": "B", "13": "B", "14": "A", "15": "A", "16": "A", "17": "A", "18": "A", "19": "A", "20": "A", "21": "A", "22": "C", "23": "A", "24": "A", "25": "B", "26": "A", "27": "A", "28": "B", "29": "A", "30": "B", "31": "C", "32": "B", "33": "B", "34": "C", "35": "A", "36": "A", "37": "C", "38": "A", "39": "B", "40": "A", "41": "A", "42": "A", "43": "A", "44": "A", "45": "A", "46": "A", "47": "A", "48": "A", "49": "A", "50": "A", "51": "A", "52": "A", "53": "A", "54": "A", "55": "A", "56": "A", "57": "A", "58": "A", "59": "A", "60": "A", "61": "A", "62": "A", "63": "A", "64": "A", "65": "A", "66": "A", "67": "A", "68": "A", "69": "A", "70": "A", "71": "A", "72": "A", "73": "A", "74": "A", "75": "A"}'::jsonb,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subjects = EXCLUDED.subjects,
  "answerKey" = EXCLUDED."answerKey",
  status = EXCLUDED.status,
  "updatedAt" = NOW();
