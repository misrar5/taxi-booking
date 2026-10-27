import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { BUSINESS } from '@/lib/business';
import './globals.css';

// Self-hosted by Next at build time — no request to Google Fonts, cached for offline
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: `${BUSINESS.name} — Wheelchair, SUV & Maxi Taxis in Melbourne`,
  description:
    'Book a wheelchair accessible taxi, SUV, maxi taxi or parcel delivery in Melbourne. Instant fare estimates. MPTP and NDIS accepted.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f1c3f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={jakarta.variable}>
      <body className="bg-white font-sans text-navy-950 antialiased">{children}</body>
    </html>
  );
}
