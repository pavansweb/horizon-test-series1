import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'jee-question-papers';

const VERCEL_BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Saves a question paper PDF to external storage or local storage.
 * Returns the public accessible URL for the PDF.
 */
export async function savePdf(
  buffer: Buffer,
  originalFilename: string,
  contentType: string = 'application/pdf'
): Promise<string> {
  const sanitizedName = originalFilename
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-');
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const finalFilename = `${uniquePrefix}-${sanitizedName}`;

  // 1. Try Vercel Blob if token is configured
  if (VERCEL_BLOB_TOKEN) {
    try {
      const response = await fetch(`https://blob.vercel-storage.com/${finalFilename}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${VERCEL_BLOB_TOKEN}`,
          'x-content-type': contentType,
          'x-add-random-suffix': 'true',
        },
        body: new Uint8Array(buffer),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) return data.url;
      }
      console.warn('Vercel Blob upload failed, falling back:', await response.text());
    } catch (err) {
      console.warn('Vercel Blob error, falling back:', err);
    }
  }

  // 2. Try Supabase Storage if configured
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const uploadUrl = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${SUPABASE_BUCKET}/${finalFilename}`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(buffer),
      });

      if (response.ok) {
        // Return the public URL
        return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${SUPABASE_BUCKET}/${finalFilename}`;
      }
      console.warn('Supabase storage upload returned non-200:', await response.text());
    } catch (err) {
      console.warn('Supabase storage error, falling back:', err);
    }
  }

  // 3. Fallback: Local filesystem (for local development or self-hosted)
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, finalFilename);
  await fs.writeFile(filePath, buffer);

  return `/uploads/${finalFilename}`;
}

/**
 * Removes a PDF if it was stored locally or via cloud
 */
export async function deletePdf(pdfUrl: string): Promise<void> {
  if (!pdfUrl) return;

  // If local upload:
  if (pdfUrl.startsWith('/uploads/')) {
    const filename = pdfUrl.replace('/uploads/', '');
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if already deleted
    }
    return;
  }

  // Cloud deletion can be added here if needed
}
