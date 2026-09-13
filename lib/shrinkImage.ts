'use client';

/**
 * Shrink an image in the browser before it is uploaded.
 *
 * A photo straight off a phone is often 4–8MB. Sending that to a server action,
 * which then forwards it to storage, is the slowest thing in posting by a wide
 * margin — and nothing in a feed needs more than about 1600px. Resizing here
 * turns a multi-second upload into a fraction of one, and the visible result is
 * identical.
 *
 * Falls back to the original file if anything goes wrong: a slow post is better
 * than a lost one.
 */
export async function shrinkImage(
  file: File,
  { maxEdge = 1600, quality = 0.82, skipUnder = 400_000 } = {},
): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // GIFs may be animated — re-encoding would flatten them to one frame
  if (file.type === 'image/gif') return file;
  if (file.size <= skipUnder) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

    // already small enough in dimensions, and re-encoding would not help much
    if (scale === 1 && file.size < 1_200_000) {
      bitmap.close?.();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], base + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
