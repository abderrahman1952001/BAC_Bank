import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BAC Bank | منصة مراجعة البكالوريا',
  description: 'منصة عربية لطلبة الجزائر: مراجعة، فلترة الأسئلة، وتتبع التقدم.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
