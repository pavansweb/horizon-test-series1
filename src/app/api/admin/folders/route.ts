import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedAdmin } from '@/lib/auth';
import { DEFAULT_FOLDERS, getCustomFolders, addCustomFolder, removeCustomFolder } from '@/lib/folders';
import { getAllTests } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const custom = await getCustomFolders();
    const tests = await getAllTests(true);
    const testFolders = tests.map((t) => t.folder).filter(Boolean) as string[];
    const all = Array.from(new Set([...DEFAULT_FOLDERS, ...custom, ...testFolders]));

    return NextResponse.json({
      success: true,
      folders: all,
      customFolders: custom,
    });
  } catch (error) {
    console.error('Error fetching admin folders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const folderName = body.name?.trim();
    if (!folderName) {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    const updatedCustom = await addCustomFolder(folderName);
    const tests = await getAllTests(true);
    const testFolders = tests.map((t) => t.folder).filter(Boolean) as string[];
    const all = Array.from(new Set([...DEFAULT_FOLDERS, ...updatedCustom, ...testFolders]));

    return NextResponse.json({
      success: true,
      folders: all,
      customFolders: updatedCustom,
    });
  } catch (error) {
    console.error('Error adding folder:', error);
    return NextResponse.json({ success: false, error: 'Failed to add folder' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticatedAdmin(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const folderName = searchParams.get('name')?.trim();
    if (!folderName) {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    const updatedCustom = await removeCustomFolder(folderName);
    const tests = await getAllTests(true);
    const testFolders = tests.map((t) => t.folder).filter(Boolean) as string[];
    const all = Array.from(new Set([...DEFAULT_FOLDERS, ...updatedCustom, ...testFolders]));

    return NextResponse.json({
      success: true,
      folders: all,
      customFolders: updatedCustom,
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete folder' }, { status: 500 });
  }
}
