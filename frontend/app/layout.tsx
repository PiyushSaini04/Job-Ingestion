import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Footer } from '../components/Footer';
import { NavBar } from '../components/NavBar';
import { ThemeProvider } from '../components/ThemeProvider';
import { getThemeInitScript } from '../lib/theme';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display'
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body'
});

export const metadata: Metadata = {
  title: 'Job Ingestion Platform',
  description: 'Read-only frontend for the job ingestion platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${bodyFont.variable}`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {getThemeInitScript()}
        </Script>
      </head>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <NavBar />
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
