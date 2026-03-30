import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display'
});
const interBody = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body'
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.paris1esport.fr';

export const metadata: Metadata = {
  title: 'Paris 1 Esport | Association étudiante',
  description: 'Association esport étudiante : équipes, événements, partenaires.',
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: '/logos/Logo_P1E_sansfond.png'
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    title: 'Paris 1 Esport | Association étudiante',
    description: 'Association esport étudiante : équipes, événements, partenaires.',
    siteName: 'Paris 1 Esport',
    images: [
      {
        url: '/logos/Logo_P1E_sansfond.png',
        width: 512,
        height: 512,
        alt: 'Logo Paris 1 Esport'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paris 1 Esport | Association étudiante',
    description: 'Association esport étudiante : équipes, événements, partenaires.',
    images: ['/logos/Logo_P1E_sansfond.png']
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${interBody.variable}`}>
      <body className="bg-white text-gray-900">
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
