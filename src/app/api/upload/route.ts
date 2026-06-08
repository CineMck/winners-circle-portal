import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Service-role client — bypasses RLS, runs server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime', 'video/mov', 'video/mpeg', 'video/webm',
  'application/pdf',
];
// This service-role proxy is only used by admin tooling (e.g. Resources).
// Member media goes direct-to-storage / Mux, never here.
const ALLOWED_FOLDERS = ['resources', 'courses', 'posts', 'avatars'];

export async function POST(req: NextRequest) {
  try {
    // Require an authenticated admin/moderator. The service-role key below
    // bypasses RLS, so this endpoint must never trust a client-supplied identity.
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: me } = await auth.from('profiles').select('role').eq('id', user.id).single();
    if (!me || !['admin', 'moderator'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'resources';
    // Identity is derived from the verified session — never from the request body.
    const userId = user.id;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large (max 50MB)` }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase();
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabaseAdmin.storage
      .from('media')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '31536000',
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl, path: data.path });
  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
