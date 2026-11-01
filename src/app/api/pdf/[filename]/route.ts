import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const standardPath = path.join(process.cwd(), 'public', 'uploads', safeFilename);
    const tmpPath = path.join(os.tmpdir(), 'jee-portal-uploads', safeFilename);

    let fileBuffer: Buffer | null = null;
    try {
      fileBuffer = await fs.readFile(standardPath);
    } catch {
      try {
        fileBuffer = await fs.readFile(tmpPath);
      } catch {
        return NextResponse.json({ error: 'PDF file not found' }, { status: 404 });
      }
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
