import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Planer Zadań i Kalendarz',
    short_name: 'Planer',
    description: 'Aplikacja do planowania zadań z kalendarzem',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617', // Pasuje do slate-950
    theme_color: '#9333ea',     // Pasuje do akcentu purple-600
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}