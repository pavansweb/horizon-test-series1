export const DEFAULT_FOLDERS = ['Physics Wallah', 'Allen', 'Oswaal'];

export function getTestDefaultFolder(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes('physicswallah') || lower.includes('physics wallah') || /\bpw\b/.test(lower)) {
    return 'Physics Wallah';
  }
  if (lower.includes('allen')) {
    return 'Allen';
  }
  if (lower.includes('oswaal')) {
    return 'Oswaal';
  }
  return null;
}
