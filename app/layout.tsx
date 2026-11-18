import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ritmo. | Meu diário de treinos',
  description: 'Treinos, cargas e evolução em um só lugar.',
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
