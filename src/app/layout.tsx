import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthGate from '@/components/AuthGate';

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StreamSchedule — Content Calendar',
  description: 'Plan and organize your streaming content with drag-and-drop scheduling',
  icons: {
    icon: '/Favicon.png',
    apple: '/Favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
