import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NY Footy Referee Bot — Operations Dashboard',
  description: 'Real-time Q&A analytics for the NY Footy WhatsApp referee assistant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
