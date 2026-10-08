'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LOGO_BUCKET, LOGO_MAX_BYTES, logoUrl } from '@/lib/brand-look';

/** Uploads one logo to the public brand-logos bucket and keeps its path in a hidden "brand_logo" input. */
export function BrandLogoUpload({ initial, label }: { initial: string | null; label: string }) {
  const t = useTranslations('errors');
  const [path, setPath] = useState(initial ?? '');
  const [preview, setPreview] = useState<string | null>(logoUrl(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError(t('upload_failed'));
    if (file.size > LOGO_MAX_BYTES) return setError(t('file_too_large'));
    setBusy(true);
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const next = `jobs/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from(LOGO_BUCKET).upload(next, file, { contentType: file.type });
    setBusy(false);
    if (error) return setError(t('upload_failed'));
    setPath(next);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="brand_logo" value={path} />
      {preview ? (
        <div className="relative size-20 overflow-hidden rounded-xl border border-garis bg-kertas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="size-full object-contain" />
          <button type="button" onClick={() => { setPath(''); setPreview(null); }} className="absolute right-0.5 top-0.5 rounded-full bg-kertas p-1" aria-label="×">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-nila-300 text-[11px] text-nila-800">
          <ImagePlus className="size-6" strokeWidth={2} aria-hidden />
          <span className="px-1 text-center leading-tight">{busy ? '…' : label}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onChange} disabled={busy} />
        </label>
      )}
      {error && <p className="text-[13px] text-bahaya" role="alert">{error}</p>}
    </div>
  );
}
