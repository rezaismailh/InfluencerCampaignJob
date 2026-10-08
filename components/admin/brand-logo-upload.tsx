'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LOGO_BUCKET, LOGO_MAX_BYTES, logoUrl } from '@/lib/brand-look';

const LOGO_SIZE = 256;
const RAW_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Shrinks the image to fit 256×256 and re-encodes it as WebP (PNG where the browser
 * can't write WebP), keeping transparency. Logos show at 40–48px, so this is plenty.
 */
async function compressLogo(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LOGO_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  } catch {
    return null;
  }
}

/** Compresses one logo, uploads it to the public brand-logos bucket and keeps its path in a hidden "brand_logo" input. */
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
    if (file.size > RAW_MAX_BYTES) return setError(t('file_too_large'));
    setBusy(true);
    const blob = await compressLogo(file);
    if (!blob || blob.size > LOGO_MAX_BYTES) { setBusy(false); return setError(t(blob ? 'file_too_large' : 'upload_failed')); }
    const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
    const next = `jobs/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from(LOGO_BUCKET).upload(next, blob, { contentType: blob.type });
    setBusy(false);
    if (error) return setError(t('upload_failed'));
    setPath(next);
    setPreview(URL.createObjectURL(blob));
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
