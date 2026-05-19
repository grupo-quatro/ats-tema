import type { Metadata } from 'next';
import JobPortal from '../features/jobs/components/JobPortal';

export const metadata: Metadata = {
  title: 'Posiciones abiertas | Tema Consulting',
};

export default function JobsPage() {
  return <JobPortal />;
}
