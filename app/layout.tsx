import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';

import './globals.css';

const display = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Conductor — Aberdeen Advisors',
  description:
    'Conductor carries a transformation engagement from fact base to board narrative in one place, with every derived number owned by a calculation engine and every claim traceable to its evidence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
