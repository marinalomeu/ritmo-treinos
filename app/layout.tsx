import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://ritmo-treinos-coral.vercel.app'),
  title: 'ritmo. - Treinos, evolução e metas',
  description: 'Aplicativo para organizar fichas de treino, registrar séries e cargas, acompanhar a evolução e definir metas personalizadas.',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'ritmo.',
    url: 'https://ritmo-treinos-coral.vercel.app/',
    title: 'ritmo. - Treinos, evolução e metas',
    description: 'Aplicativo para organizar fichas de treino, registrar séries e cargas, acompanhar a evolução e definir metas personalizadas.',
    images: [{ url: '/ritmo-og-preview.jpg', width: 1200, height: 630, alt: 'Prévia da interface do ritmo., com fichas e metas de treino.' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ritmo. - Treinos, evolução e metas',
    description: 'Aplicativo para organizar fichas de treino, registrar séries e cargas, acompanhar a evolução e definir metas personalizadas.',
    images: ['/ritmo-og-preview.jpg']
  },
  applicationName: 'ritmo.',
  manifest: '/manifest.webmanifest',
  robots: {index:false,follow:false},
  appleWebApp: {capable:true,title:'ritmo.',statusBarStyle:'default'},
  icons: {
    icon: [{url:'/icons/ritmo-favicon-64.png',type:'image/png',sizes:'64x64'}],
    apple: [{url:'/icons/ritmo-apple-180.png',type:'image/png',sizes:'180x180'}]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#62445d'
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
