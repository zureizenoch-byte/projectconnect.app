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

export async function deletePost(postId: string) {
  const { user, profile } = await requireSession();
  const supabase = createClient();
  const query = supabase.from('posts').delete().eq('id', postId);
  const { error } = profile.role === 'admin' ? await query : await query.eq('author_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function toggleLike(postId: string) {
  const { user } = await requireSession();
  const supabase = createClient();
  const { data: existing } = await supabase.from('post_likes')
    .select('post_id').eq('post_id', postId).eq('profile_id', user.id).maybeSingle();

  const { error } = existing
    ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('profile_id', user.id)
    : await supabase.from('post_likes').insert({ post_id: postId, profile_id: user.id });
  if (error) return { error: error.message };
  return { ok: true, liked: !existing };
}

export async function addComment(postId: string, body: string) {
  const { user } = await requireSession();
  const text = body.trim();
  if (!text) return { error: 'Write something first' };
  const supabase = createClient();
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, author_id: user.id, body: text.slice(0, 2000) })
    .select('id,body,created_at,author_id').single();
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { ok: true, comment: data };
}

export async function deleteComment(commentId: string) {
  const { user, profile } = await requireSession();
  const supabase = createClient();
  const q = supabase.from('post_comments').delete().eq('id', commentId);
  const { error } = profile.role === 'admin' ? await q : await q.eq('author_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { ok: true };
}
