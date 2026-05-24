'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import type { JobStatus, UpdatePositionStatusPayload } from '@ats/shared-types';
import { getFunctionUrl } from '@/shared/lib/firebase';

async function getAuthToken(): Promise<string> {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  if (useEmulators) return 'dev-recruiter';

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');
  return user.getIdToken();
}

async function updatePositionStatus(
  payload: UpdatePositionStatusPayload,
): Promise<void> {
  const token = await getAuthToken();

  const res = await fetch(getFunctionUrl('updatePositionStatus'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al actualizar el estado');
  }
}

export function useUpdatePositionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePositionStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export type { JobStatus };
