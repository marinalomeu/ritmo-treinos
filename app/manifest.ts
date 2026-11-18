import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'ritmo. | Diário de treinos',
    short_name: 'ritmo.',
    description: 'Seu diário de treinos, séries, cargas, evolução e check-ins.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f5f2',
    theme_color: '#62445d',
    orientation: 'portrait',
    icons: [
      { src: '/icons/ritmo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/ritmo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/ritmo-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
