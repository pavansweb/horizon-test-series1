import { NextRequest, NextResponse } from 'next/server';
import { getPublicTestById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const test = await getPublicTestById(id);

    if (!test) {
      return NextResponse.json(
        { success: false, error: 'Test not found or not published' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, test });
  } catch (error) {
    console.error('Error fetching test:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
