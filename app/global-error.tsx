'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ErrorScreen } from '@/components/error-screen';
import messages from '@/messages/id.json';
import './globals.css';

// Replaces the root layout when it fails, so it brings its own <html>, styles and messages.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider locale="id" messages={{ errorPage: messages.errorPage }}>
          <ErrorScreen error={error} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
