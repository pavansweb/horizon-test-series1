import { NextRequest, NextResponse } from 'next/server';
import { getTestById, saveSubmission } from '@/lib/db';
import { calculateTestResult } from '@/lib/scoring';
import { TestSubmissionRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: TestSubmissionRequest = await request.json();

    const test = await getTestById(id);
    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      );
    }

    // Calculate score, subject results, and detailed review
    const result = calculateTestResult(test, {
      testId: id,
      candidateResponses: body.candidateResponses || {},
      timeTakenSeconds: body.timeTakenSeconds || 0,
      candidateName: body.candidateName || 'JEE Aspirant',
    });

    // Save to persistent storage
    await saveSubmission(result);

    return NextResponse.json({
      success: true,
      submissionId: result.submissionId,
      result,
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process test submission' },
      { status: 500 }
    );
  }
}
