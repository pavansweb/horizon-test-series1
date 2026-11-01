import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getTestById, updateTest } from '@/lib/db';
import { savePdf, deletePdf } from '@/lib/storage';

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

    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File | null;

    if (!pdfFile) {
      return NextResponse.json(
        { success: false, error: 'Question paper PDF file is required' },
        { status: 400 }
      );
    }

    // Save new PDF
    const fileBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const newPdfUrl = await savePdf(fileBuffer, pdfFile.name, pdfFile.type || 'application/pdf');

    // Remove old PDF if it was stored locally
    if (test.pdfUrl && test.pdfUrl !== newPdfUrl) {
      await deletePdf(test.pdfUrl);
    }

    const updated = await updateTest(id, {
      pdfUrl: newPdfUrl,
      pdfFileName: pdfFile.name,
    });

    return NextResponse.json({ success: true, test: updated });
  } catch (error) {
    console.error('Error replacing PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to replace PDF' },
      { status: 500 }
    );
  }
}
