import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'ritmo. | Meu diário de treinos', description:'Treinos, cargas e evolução em um só lugar.', applicationName:'ritmo.', robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
