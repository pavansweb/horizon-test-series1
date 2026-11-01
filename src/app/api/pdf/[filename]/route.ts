import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

    try {
      const fileBuffer = await fs.readFile(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${safeFilename}"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return NextResponse.json({ error: 'PDF file not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
