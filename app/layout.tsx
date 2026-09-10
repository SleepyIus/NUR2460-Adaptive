import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NUR2460 · Exam 2 Adaptive Study',
  description: '240 source-based Exam 2 nursing questions, adaptive study, and blueprint-matched practice exams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
