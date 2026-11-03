import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getTestById, updateTest } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const test = await getTestById(id);
    if (!test) {
      return NextResponse.json({ success: false, error: 'Test not found' }, { status: 404 });
    }

    const newProofreadStatus = !test.isProofread;
    const updated = await updateTest(id, { isProofread: newProofreadStatus });

    return NextResponse.json({ success: true, test: updated });
  } catch (error) {
    console.error('Error toggling proofread status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle proofreading status' },
      { status: 500 }
    );
  }
}
