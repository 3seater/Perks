import { WalletProfile } from '@/components/wallet-profile';
export default function ProfilePage() { return <WalletProfile demo={process.env.NEXT_PUBLIC_DEMO_MODE!=='false'}/>; }
