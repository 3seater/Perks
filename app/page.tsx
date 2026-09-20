import { Launchpad } from '@/components/launchpad';
export default function Page(){return <Launchpad demo={process.env.NEXT_PUBLIC_DEMO_MODE!=='false'}/>;}
