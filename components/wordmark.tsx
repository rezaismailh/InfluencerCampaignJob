import Image from 'next/image';

// The wordmark is an SVG file, never typeset text.
export function Wordmark({ on = 'light', height = 32, className }: { on?: 'light' | 'dark'; height?: number; className?: string }) {
  const src = on === 'dark'
    ? height < 32 ? '/brand/tali-wordmark-bold-dark-bg.svg' : '/brand/tali-wordmark-dark-bg.svg'
    : '/brand/tali-wordmark-light-bg.svg';
  const width = Math.round((height * 220) / 140);
  return <Image src={src} alt="Tali" width={width} height={height} className={className} priority unoptimized />;
}
