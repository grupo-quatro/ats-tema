'use client';

import { useEffect, useState } from 'react';
import type { Employee } from '@ats/shared-types';
import { employeeRepository } from '../../../repositories';
import { useAuth } from '../../../shared/lib/authContext';

interface UseEmployeeProfileResult {
  employee: Employee | null;
  loading: boolean;
  error: string | null;
}

export function useEmployeeProfile(): UseEmployeeProfileResult {
  const { callerUid } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callerUid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    employeeRepository
      .getById(callerUid)
      .then((data) => {
        if (!cancelled) {
          setEmployee(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudo cargar el perfil.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [callerUid]);

  return { employee, loading, error };
}
