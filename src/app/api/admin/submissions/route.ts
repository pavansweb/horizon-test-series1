import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getAllSubmissions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId') || undefined;

    const submissions = await getAllSubmissions(testId);

    // Calculate aggregated statistics across submissions
    const totalSubmissions = submissions.length;
    let avgScore = 0;
    let avgAccuracy = 0;
    let topScore = 0;

    if (totalSubmissions > 0) {
      const sumScore = submissions.reduce((sum, s) => sum + s.totalScore, 0);
      const sumAccuracy = submissions.reduce((sum, s) => sum + (s.overallAccuracy || 0), 0);
      avgScore = Math.round((sumScore / totalSubmissions) * 10) / 10;
      avgAccuracy = Math.round(sumAccuracy / totalSubmissions);
      topScore = Math.max(...submissions.map((s) => s.totalScore));
    }

    return NextResponse.json({
      success: true,
      submissions,
      stats: {
        totalSubmissions,
        avgScore,
        avgAccuracy,
        topScore,
      },
    });
  } catch (error) {
    console.error('Error fetching admin submissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve student submissions' },
      { status: 500 }
    );
  }
}
