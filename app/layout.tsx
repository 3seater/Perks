import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
import './brand.css';
import './catalog.css';
import './type.css';
import './docs.css';
export const metadata:Metadata={title:'Perks — The meme launchpad that pays your lunch.',description:'The meme launchpad that pays your lunch. Launch on Pump.fun, hold your favorite coins, and redeem rewards for digital gift cards.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
