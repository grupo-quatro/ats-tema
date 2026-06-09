'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EMPLOYEE_ROLES, type EmployeeRole } from '@ats/shared-types';
import { useAuth } from '../../shared/lib/authContext';

const ALLOWED_ROLES: EmployeeRole[] = [
  EMPLOYEE_ROLES.HR,
  EMPLOYEE_ROLES.AREA_LEADER,
];

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
