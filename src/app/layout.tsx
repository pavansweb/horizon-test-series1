import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JEE (Main) CBT Mock Test Portal',
  description: 'Personal JEE Main Computer Based Test Simulation Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900 font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
