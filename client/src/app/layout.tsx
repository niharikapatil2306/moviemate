import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MovieMate',
  description: 'Swipe on movies with friends',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
