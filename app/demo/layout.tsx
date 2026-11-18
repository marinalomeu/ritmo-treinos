import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'ritmo. demo - Experimente o aplicativo';
const description = 'Experimente o ritmo. com fichas, histórico e gráficos de treinos fictícios. Senha de demonstração: teste.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/demo' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'ritmo.',
    url: 'https://ritmo-treinos-coral.vercel.app/demo',
    title,
    description,
    images: [{ url: '/ritmo-og-preview.jpg', width: 1200, height: 630, alt: 'Prévia da interface demonstrativa do ritmo., com fichas e metas de treino.' }]
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/ritmo-og-preview.jpg']
  }
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
