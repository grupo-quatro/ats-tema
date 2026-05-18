import SuccessView from '@/features/postulation/components/SuccessView';
import type { CvParseStatus } from '@ats/shared-types';

type Props = { searchParams: Promise<{ status?: string }> };

export default async function SuccessPage({ searchParams }: Props) {
  const { status } = await searchParams;
  return <SuccessView cvParseStatus={(status as CvParseStatus) ?? 'pending'} />;
}
