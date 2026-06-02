'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { EmployeeRole } from '@ats/shared-types';
import { useAuth } from '../../shared/lib/authContext';

const ALLOWED_ROLES: EmployeeRole[] = ['hr', 'hiring_manager'];

export default function CommunicationTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!role || !ALLOWED_ROLES.includes(role))) {
      router.replace('/dashboard/positions');
    }
  }, [role, loading, router]);

  if (loading || !role || !ALLOWED_ROLES.includes(role)) return null;

  return <>{children}</>;
}
