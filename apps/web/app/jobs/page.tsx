import type { Metadata } from 'next';
import { Suspense } from 'react';
import JobPortal from '../features/jobs/components/JobPortal';

export const metadata: Metadata = {
  title: 'Posiciones abiertas | Tema Consulting',
};

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobPortal />
    </Suspense>
  );
}
