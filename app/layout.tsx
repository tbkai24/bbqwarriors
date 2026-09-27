import type { Metadata } from 'next';
import './globals.css';
import { PwaInstaller } from '@/components/public/pwa-installer';

export const metadata: Metadata = {
  title: 'BBQ Warriors - Josh Cullen Streaming & Music Hub',
  description: 'Discover verified articles, embedded YouTube MVs, and official Spotify and YouTube links to stream Josh Cullen’s music.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/assets/bbqwarriorslogo.jpg',
    apple: '/assets/bbqwarriorslogo.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BBQ Warriors',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'application-name': 'BBQ Warriors',
  },
  openGraph: {
    title: 'BBQ Warriors',
    description: 'Discover verified articles, embedded YouTube MVs, and official Spotify and YouTube links to stream Josh Cullen’s music.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-sky-500/20 selection:text-sky-900 bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
