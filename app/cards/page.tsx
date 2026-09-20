import Link from 'next/link';
import { CardCatalog } from '@/components/card-catalog';
export default function CardsPage(){return <main className="catalog-page"><Link className="text-button" href="/">← Back to Perks</Link><CardCatalog/></main>;}
