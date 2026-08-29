'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';

export async function createPost(formData: FormData) {
  const { user, profile } = await requireSession();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { error: 'Write something first' };

  const supabase = createClient();
  const { error } = await supabase.from('posts').insert({
    chapter_id: profile.chapter_id, author_id: user.id, body: body.slice(0, 4000),
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Feed posts are report-only — no pre-moderation. */
export async function reportPost(postId: string, reason: string) {
  const { user } = await requireSession();
  const supabase = createClient();
  const { error } = await supabase.from('post_reports')
    .insert({ post_id: postId, reporter_id: user.id, reason: reason.slice(0, 500) });
  if (error) return { error: error.message };
  return { ok: true };
}
