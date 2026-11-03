import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { getTestById, updateTest, deleteTest } from '@/lib/db';
import { deletePdf } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();

    const existing = await getTestById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Test not found' }, { status: 404 });
    }

    const subjects = body.subjects !== undefined ? body.subjects : existing.subjects;
    const markingScheme = body.markingScheme !== undefined ? body.markingScheme : existing.markingScheme;
    const totalQuestions = subjects.reduce((sum: number, s: { totalQuestions: number }) => sum + s.totalQuestions, 0);
    const autoTotalMarks = totalQuestions * (markingScheme.correct ?? 4);

    const updated = await updateTest(id, {
      title: body.title !== undefined ? body.title : existing.title,
      folder: body.folder !== undefined ? body.folder : existing.folder,
      duration: body.duration !== undefined ? Number(body.duration) : existing.duration,
      totalMarks: autoTotalMarks,
      pdfStartPage: body.pdfStartPage !== undefined ? Number(body.pdfStartPage) : existing.pdfStartPage,
      pdfEndPage: body.pdfEndPage !== undefined ? Number(body.pdfEndPage) : existing.pdfEndPage,
      integerQuestions: body.integerQuestions !== undefined ? body.integerQuestions : existing.integerQuestions,
      subjects,
      questions: body.questions !== undefined ? body.questions : existing.questions,
      markingScheme,
      answerKey: body.answerKey !== undefined ? body.answerKey : existing.answerKey,
      status: body.status !== undefined ? body.status : existing.status,
      isProofread: body.isProofread !== undefined ? Boolean(body.isProofread) : existing.isProofread,
    });

    return NextResponse.json({ success: true, test: updated });
  } catch (error) {
    console.error('Error updating test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update test' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const existing = await getTestById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Test not found' }, { status: 404 });
    }

    // Attempt to remove associated PDF
    if (existing.pdfUrl) {
      await deletePdf(existing.pdfUrl);
    }

    await deleteTest(id);
    return NextResponse.json({ success: true, message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Error deleting test:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete test' },
      { status: 500 }
    );
  }
}
