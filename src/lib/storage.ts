import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { supabase, isSupabaseConfigured } from './supabase';

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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(finalFilename, buffer, {
          contentType,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(finalFilename);

        if (publicData?.publicUrl) {
          return publicData.publicUrl;
        }
      }
      if (error) {
        console.warn('Supabase storage upload error, falling back:', error.message);
      }
    } catch (err) {
      console.warn('Supabase storage error, falling back:', err);
    }
  }

  // 3. Fallback: Local filesystem or serverless temp storage
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
  const uploadsDir = isServerless
    ? path.join(os.tmpdir(), 'jee-portal-uploads')
    : path.join(process.cwd(), 'public', 'uploads');

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, finalFilename);
    await fs.writeFile(filePath, buffer);
    return isServerless ? `/api/pdf/${finalFilename}` : `/uploads/${finalFilename}`;
  } catch (localErr) {
    console.error('Local PDF storage fallback failed:', localErr);
    throw new Error('Failed to save PDF to cloud storage or temporary storage.');
  }
}

/**
 * Removes a PDF if it was stored locally or via cloud
 */
export async function deletePdf(pdfUrl: string): Promise<void> {
  if (!pdfUrl) return;

  // Supabase storage file
  if (isSupabaseConfigured && supabase && pdfUrl.includes(SUPABASE_BUCKET)) {
    try {
      const parts = pdfUrl.split(`${SUPABASE_BUCKET}/`);
      if (parts[1]) {
        await supabase.storage.from(SUPABASE_BUCKET).remove([parts[1]]);
      }
    } catch (err) {
      console.warn('Supabase storage delete error:', err);
    }
    return;
  }

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

  // If Vercel Blob
  if (VERCEL_BLOB_TOKEN && pdfUrl.includes('blob.vercel-storage.com')) {
    try {
      await fetch(pdfUrl, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${VERCEL_BLOB_TOKEN}`,
        },
      });
    } catch (err) {
      console.warn('Vercel Blob delete error:', err);
    }
  }
}
