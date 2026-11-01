import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  try {
    const { submissionId } = params;
    const result = await getSubmissionById(submissionId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Submission result not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error fetching result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve result' },
      { status: 500 }
    );
  }
}
