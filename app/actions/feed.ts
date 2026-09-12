'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireSession } from '@/lib/auth';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 8_000_000;

export async function createPost(formData: FormData) {
  const { user, profile } = await requireSession();
  const body = String(formData.get('body') ?? '').trim();
  const photo = formData.get('photo') as File | null;
  const hasPhoto = !!photo && photo.size > 0;

  // a photograph can carry a post on its own
  if (!body && !hasPhoto) return { error: 'Write something, or add a photo.' };

  let imageUrl: string | null = null;

  if (hasPhoto) {
    if (!IMAGE_TYPES.includes(photo!.type)) {
      return { error: 'Photos must be a JPEG, PNG, WebP or GIF.' };
    }
    if (photo!.size > MAX_IMAGE_BYTES) {
      return { error: 'Photos must be under 8MB.' };
    }

    const ext = (photo!.name.split('.').pop() ?? 'jpg').toLowerCase().slice(0, 5);
    const path = user.id + '/' + Date.now() + '.' + ext;

    // service role, so a storage policy gap cannot silently drop the upload
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from('post-images')
      .upload(path, photo!, { upsert: false, contentType: photo!.type });

    if (uploadError) {
      return {
        error: uploadError.message.toLowerCase().includes('not found')
          ? 'Photo storage is not set up yet — create a public "post-images" bucket.'
          : 'Could not upload that photo: ' + uploadError.message,
      };
    }

    const { data } = admin.storage.from('post-images').getPublicUrl(path);
    imageUrl = data.publicUrl;
  }

  const supabase = createClient();
  const { error } = await supabase.from('posts').insert({
    chapter_id: profile.chapter_id,
    author_id: user.id,
    body: body.slice(0, 4000),
    image_url: imageUrl,
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
  const { user, profile } = await requireSession();
  const text = body.trim();
  if (!text) return { error: 'Write something first' };
  const supabase = createClient();
  const { data, error } = await supabase.from('post_comments')
    .insert({ post_id: postId, author_id: user.id, body: text.slice(0, 2000) })
    .select('id,body,created_at,author_id').single();
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return {
    ok: true,
    comment: { ...data, commenter: { full_name: profile.full_name, photo_url: profile.photo_url } },
  };
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
