'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const MAX = 5 * 1024 * 1024;

/**
 * Uploads photos straight to the private "uploads" bucket under "<user id>/<folder>/"
 * (storage RLS only allows the user's own folder) and keeps the paths in a hidden
 * input named "photos" as JSON.
 */
export function PhotoUpload({ userId, folder, max = 6, label }: { userId: string; folder: string; max?: number; label: string }) {
  const t = useTranslations('errors');
  const [paths, setPaths] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - paths.length);
    e.target.value = '';
    if (!files.length) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    for (const file of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError(t('upload_failed')); continue; }
      if (file.size > MAX) { setError(t('file_too_large')); continue; }
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type });
      if (error) { setError(t('upload_failed')); continue; }
      setPaths((p) => [...p, path]);
      setPreviews((p) => [...p, URL.createObjectURL(file)]);
    }
    setBusy(false);
  }

  function remove(i: number) {
    setPaths((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => p.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="photos" value={JSON.stringify(paths)} />
      <div className="flex flex-wrap gap-2">
        {previews.map((src, i) => (
          <div key={src} className="relative size-20 overflow-hidden rounded-xl border border-garis">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => remove(i)} className="absolute right-0.5 top-0.5 rounded-full bg-kertas p-1" aria-label="×">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {paths.length < max && (
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-nila-300 text-[11px] text-nila-800">
            <ImagePlus className="size-6" strokeWidth={2} aria-hidden />
            <span className="px-1 text-center leading-tight">{busy ? '…' : label}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} className="sr-only" onChange={onChange} disabled={busy} />
          </label>
        )}
      </div>
      {error && <p className="text-[13px] text-bahaya" role="alert">{error}</p>}
    </div>
  );
}
