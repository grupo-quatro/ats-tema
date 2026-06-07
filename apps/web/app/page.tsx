import { Suspense } from 'react';
import JobPortal from './features/jobs/components/JobPortal';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <JobPortal />
    </Suspense>
  );
}
