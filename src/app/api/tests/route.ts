import { NextResponse } from 'next/server';
import { getAllTests } from '@/lib/db';
import { PublicTest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const publishedTests = await getAllTests(false);

    // Map to public view - strip private answer keys
    const publicList: PublicTest[] = publishedTests.map((t) => {
      const totalQuestions = t.subjects.reduce((sum, s) => sum + s.totalQuestions, 0);
      return {
        id: t.id,
        title: t.title,
        duration: t.duration,
        totalMarks: t.totalMarks,
        pdfUrl: t.pdfUrl,
        pdfFileName: t.pdfFileName,
        subjects: t.subjects,
        markingScheme: t.markingScheme,
        totalQuestions: totalQuestions || 90,
        status: 'published',
        createdAt: t.createdAt,
      };
    });

    return NextResponse.json({ success: true, tests: publicList });
  } catch (error) {
    console.error('Failed to get tests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve test list' },
      { status: 500 }
    );
  }
}
