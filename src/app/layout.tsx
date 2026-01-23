import type { Metadata } from 'next';
import './globals.css';
import { Lexend } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const lexend = Lexend({ subsets: ['latin'], display: 'swap', variable: '--font-lexend' });

export const metadata: Metadata = {
  title: 'Paris 1 Esport | Association étudiante',
  description: 'Association esport étudiante : équipes, événements, partenaires.',
  icons: {
    icon: '/Logo_P1.png'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={lexend.variable}>
      <body className="bg-[#f8f9fb] text-slate-900">
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
