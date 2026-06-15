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

    setLoading(true);

    const unsubscribe = employeeRepository.subscribe(callerUid, (data) => {
      setEmployee(data);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [callerUid]);

  return { employee, loading, error };
}
