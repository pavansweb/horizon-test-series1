import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionById } from '@/lib/db';
import { generateAiMarkdownPrompt, generateRawJsonExport } from '@/lib/exportResult';

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

    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export');

    if (exportFormat === 'json') {
      const jsonContent = generateRawJsonExport(result);
      const safeTitle = (result.testTitle || 'jee-mock').replace(/[^a-zA-Z0-9_-]/g, '_');
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeTitle}_raw_data.json"`,
        },
      });
    }

    if (exportFormat === 'markdown' || exportFormat === 'md') {
      const mdContent = generateAiMarkdownPrompt(result);
      const safeTitle = (result.testTitle || 'jee-mock').replace(/[^a-zA-Z0-9_-]/g, '_');
      return new NextResponse(mdContent, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeTitle}_ai_analysis.md"`,
        },
      });
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
