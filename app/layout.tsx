import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
import './brand.css';
import './catalog.css';
import './type.css';
import './docs.css';
const title = 'Perks - Rewards paid via anonymous giftcards.';
const description = 'Launch tokens, rewards paid via anonymous gift cards from 100+ retailers.';
const socialImage = {
  url: '/og-banner.png',
  width: 1500,
  height: 500,
  alt: 'Perks — Trade tokens and claim perks.',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://perksp.ad'),
  title,
  description,
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'Perks',
    title,
    description,
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@perkspad',
    title,
    description,
    images: [socialImage],
  },
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
