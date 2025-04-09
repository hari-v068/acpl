import type { Metadata } from 'next';
import { Geist, Geist_Mono, Syne } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ACP — Lite',
  description: '',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
<<<<<<< HEAD
        className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} antialiased`}
=======
        className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} font-sans antialiased`}
>>>>>>> feat/evaluator
      >
        {children}
      </body>
    </html>
  );
}
