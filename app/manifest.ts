import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest & { gcm_sender_id?: string } {
  return {
    name: 'BBQ Warriors',
    short_name: 'BBQ Warriors',
    description: 'Discover verified articles, embedded YouTube MVs, and official Spotify and YouTube links to stream Josh Cullen’s music.',
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    gcm_sender_id: '103953800507',
    background_color: '#0f172a',
    theme_color: '#f97316',
    icons: [
      {
        src: '/assets/bbqwarriorslogo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/assets/bbqwarriorslogo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: '/assets/bbqwarriorslogo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/assets/bbqwarriorslogo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };
}
