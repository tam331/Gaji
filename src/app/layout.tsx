import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gaji — SME Batch Payroll',
  description: 'One click. Every worker paid in USDC.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
