import { NextResponse } from 'next/server';
import { DEFAULT_FOLDERS, getCustomFolders } from '@/lib/folders';
import { getAllTests } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const custom = await getCustomFolders();
    const tests = await getAllTests(false);
    const testFolders = tests.map((t) => t.folder).filter(Boolean) as string[];

    const allFolders = Array.from(new Set([...DEFAULT_FOLDERS, ...custom, ...testFolders]));

    return NextResponse.json(
      { success: true, folders: allFolders },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { success: false, folders: DEFAULT_FOLDERS },
      { status: 500 }
    );
  }
}
