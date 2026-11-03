import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export { DEFAULT_FOLDERS, getTestDefaultFolder } from './folder-constants';

const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), 'jee-portal-data')
  : path.join(process.cwd(), 'data');

const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');

export async function getCustomFolders(): Promise<string[]> {
  try {
    const raw = await fs.readFile(FOLDERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const bundled = path.join(process.cwd(), 'data', 'folders.json');
      const raw = await fs.readFile(bundled, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

export async function addCustomFolder(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (!trimmed) return await getCustomFolders();
  const current = await getCustomFolders();
  if (!current.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
    current.push(trimmed);
    const serialized = JSON.stringify(current, null, 2);
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(FOLDERS_FILE, serialized, 'utf-8');
      const bundled = path.join(process.cwd(), 'data', 'folders.json');
      if (bundled !== FOLDERS_FILE) {
        await fs.writeFile(bundled, serialized, 'utf-8').catch(() => {});
      }
    } catch {}
  }
  return current;
}

export async function removeCustomFolder(name: string): Promise<string[]> {
  let current = await getCustomFolders();
  current = current.filter((f) => f.toLowerCase() !== name.toLowerCase());
  const serialized = JSON.stringify(current, null, 2);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FOLDERS_FILE, serialized, 'utf-8');
    const bundled = path.join(process.cwd(), 'data', 'folders.json');
    if (bundled !== FOLDERS_FILE) {
      await fs.writeFile(bundled, serialized, 'utf-8').catch(() => {});
    }
  } catch {}
  return current;
}
