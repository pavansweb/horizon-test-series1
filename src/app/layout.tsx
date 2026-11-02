import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HORIZON TEST SERIES - JEE (Main) CBT Mock Portal',
  description: 'Official NTA JEE Main Computer Based Test Simulation Platform with AI Paper Formatting & Performance Analytics',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC script for instant theme application */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('cbt_theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* KaTeX stylesheet and script for fast LaTeX math formula rendering */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css"
          crossOrigin="anonymous"
        />
        <script
          defer
          src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans min-h-screen transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
