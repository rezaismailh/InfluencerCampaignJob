import 'server-only';
import type { Viewer } from './auth';

/** Signed URLs (1 hour) for files in the private "uploads" bucket. */
export async function signedUrls(viewer: Viewer, paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await viewer.supabase.storage.from('uploads').createSignedUrls(unique, 3600);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
