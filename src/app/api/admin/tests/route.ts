import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getAllTests, createTest } from '@/lib/db';
import { savePdf } from '@/lib/storage';
import { SubjectConfig, MarkingScheme } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tests = await getAllTests(true); // include drafts
    return NextResponse.json({ success: true, tests });
  } catch (error) {
    console.error('Error fetching admin tests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve tests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    let title: string = '';
    let duration: number = 180;
    let totalMarks: number = 300;
    let pdfUrl: string = '';
    let pdfFileName: string = '';
    let pdfStartPage: number | undefined = undefined;
    let pdfEndPage: number | undefined = undefined;
    let integerQuestions: number[] | undefined = undefined;
    let subjects: SubjectConfig[] = [];
    let markingScheme: MarkingScheme = { correct: 4, incorrect: -1, unattempted: 0 };
    let answerKey: Record<number, string> = {};
    let status: 'draft' | 'published' = 'published';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const pdfFile = formData.get('pdf') as File | null;

      if (!pdfFile) {
        return NextResponse.json(
          { success: false, error: 'Question paper PDF file is required' },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await pdfFile.arrayBuffer());
      pdfFileName = pdfFile.name;
      pdfUrl = await savePdf(fileBuffer, pdfFile.name, pdfFile.type || 'application/pdf');

      title = (formData.get('title') as string) || 'JEE Main Mock Test';
      duration = parseInt((formData.get('duration') as string) || '180', 10);
      status = ((formData.get('status') as string) === 'draft') ? 'draft' : 'published';

      if (formData.get('pdfStartPage')) {
        pdfStartPage = parseInt(formData.get('pdfStartPage') as string, 10) || 1;
      }
      if (formData.get('pdfEndPage')) {
        pdfEndPage = parseInt(formData.get('pdfEndPage') as string, 10) || undefined;
      }
      if (formData.get('integerQuestions')) {
        try {
          integerQuestions = JSON.parse(formData.get('integerQuestions') as string);
        } catch {
          // ignore
        }
      }

      try {
        const rawSubjects = formData.get('subjects') as string;
        if (rawSubjects) subjects = JSON.parse(rawSubjects);
      } catch {
        subjects = [];
      }

      try {
        const rawMarkingScheme = formData.get('markingScheme') as string;
        if (rawMarkingScheme) markingScheme = JSON.parse(rawMarkingScheme);
      } catch {
        markingScheme = { correct: 4, incorrect: -1, unattempted: 0 };
      }

      try {
        const rawAnswerKey = formData.get('answerKey') as string;
        if (rawAnswerKey) answerKey = JSON.parse(rawAnswerKey);
      } catch {
        answerKey = {};
      }
    } else {
      const body = await request.json();
      title = body.title || 'JEE Main Mock Test';
      duration = body.duration || 180;
      pdfUrl = body.pdfUrl || '';
      pdfFileName = body.pdfFileName || 'question_paper.pdf';
      pdfStartPage = body.pdfStartPage ? Number(body.pdfStartPage) : undefined;
      pdfEndPage = body.pdfEndPage ? Number(body.pdfEndPage) : undefined;
      integerQuestions = body.integerQuestions || undefined;
      subjects = body.subjects || [];
      markingScheme = body.markingScheme || { correct: 4, incorrect: -1, unattempted: 0 };
      answerKey = body.answerKey || {};
      status = body.status === 'draft' ? 'draft' : 'published';
    }

    // Default subjects if not provided
    if (!subjects || subjects.length === 0) {
      subjects = [
        { id: 'physics', name: 'Physics', startQuestion: 1, endQuestion: 30, totalQuestions: 30 },
        { id: 'chemistry', name: 'Chemistry', startQuestion: 31, endQuestion: 60, totalQuestions: 30 },
        { id: 'mathematics', name: 'Mathematics', startQuestion: 61, endQuestion: 90, totalQuestions: 30 },
      ];
    }

    if (!pdfUrl) {
      return NextResponse.json(
        { success: false, error: 'Question paper PDF is required' },
        { status: 400 }
      );
    }

    // Auto-compute total marks based on number of questions and marking scheme
    const totalQuestions = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
    totalMarks = totalQuestions * (markingScheme.correct ?? 4);

    const newTest = await createTest({
      title,
      duration,
      totalMarks,
      pdfUrl,
      pdfFileName,
      pdfStartPage,
      pdfEndPage,
      integerQuestions,
      subjects,
      markingScheme,
      answerKey,
      status,
    });

    return NextResponse.json({ success: true, test: newTest });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create test' },
      { status: 500 }
    );
  }
}
