/**
 * Client-side direct upload to Supabase Storage.
 *
 * Used by PostComposer + ProfilePage. Bypasses the /api/upload proxy so
 * Capacitor iOS WebView's FormData quirks don't block uploads, and so we
 * don't hit Next.js body size limits for large media.
 *
 * Requires storage_upload_policy.sql to be applied (RLS lets authenticated
 * users write into their own `<folder>/<userId>/` path).
 */

import { createClient } from '@/lib/supabase/client';

export interface UploadResult {
  url: string;
  path: string;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime', 'video/mov', 'video/mpeg', 'video/webm',
];

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function uploadToStorage(opts: {
  file: Blob;
  fileName: string;
  folder: 'posts' | 'avatars' | 'resources' | 'messages' | 'courses';
  userId: string;
}): Promise<UploadResult> {
  const { file, fileName, folder, userId } = opts;

  if (file.size > MAX_SIZE) {
    throw new Error('File too large (max 50MB)');
  }
  const mimeType = file.type || 'application/octet-stream';
  if (mimeType !== 'application/octet-stream' && !ALLOWED_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
      cacheControl: '31536000',
    });

  if (error || !data) {
    throw new Error(error?.message || 'Upload failed');
  }

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}
