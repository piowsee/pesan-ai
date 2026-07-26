import { QueryProvider } from '@/components/query-provider';
import { RealtimeProvider } from '@/components/realtime-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Pesan AI',
    template: '%s | Pesan AI',
  },
  description: 'WhatsApp chat automation platform with AI support.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-sans ${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <QueryProvider>
          <RealtimeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </RealtimeProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
