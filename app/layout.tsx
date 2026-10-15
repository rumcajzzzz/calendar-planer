import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Kalendarz Planer',
  description: 'Zintegrowana aplikacja do zarządzania czasem',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Planer',
  },
};

export const viewport: Viewport = {
  themeColor: '#9333ea',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}