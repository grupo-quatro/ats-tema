import { PublicOfferView } from '@/features/offers/components/PublicOfferView';

interface OfferPageProps {
  params: Promise<{ token: string }>;
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { token } = await params;
  return <PublicOfferView token={token} />;
}
