import type {
  CandidatePostulationPayload,
  CandidatePostulationResponse,
  CandidatePostulationCVPayload,
  CandidatePostulationCVResponse,
  ConfirmCandidateProfilePayload,
  ConfirmCandidateProfileResponse,
  GetCandidateProfileForConfirmationPayload,
  GetCandidateProfileForConfirmationResponse,
} from '@ats/shared-types';

import { getFunctionUrl } from '../lib/firebase';

async function getCandidateToken(): Promise<string> {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  if (useEmulators) return 'dev-candidate';

  const { getAuth } = await import('firebase/auth');
  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuario no autenticado');
  return user.getIdToken();
}

export async function registerCandidate(
  payload: CandidatePostulationPayload,
): Promise<CandidatePostulationResponse> {
  const token = await getCandidateToken();
  const res = await fetch(getFunctionUrl('registerCandidate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al registrar el candidato');
  }
  return res.json();
}

export async function registerCandidateCV(
  payload: CandidatePostulationCVPayload,
): Promise<CandidatePostulationCVResponse> {
  const token = await getCandidateToken();
  const res = await fetch(getFunctionUrl('registerCandidateCV'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al iniciar la postulación por CV');
  }
  return res.json();
}

export async function getCandidateProfileForConfirmation(
  payload: GetCandidateProfileForConfirmationPayload,
): Promise<GetCandidateProfileForConfirmationResponse> {
  const token = await getCandidateToken();
  const res = await fetch(
    getFunctionUrl('getCandidateProfileForConfirmation'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.error || 'Error al obtener el perfil para confirmación',
    );
  }
  return res.json();
}

export async function confirmCandidateProfile(
  payload: ConfirmCandidateProfilePayload,
): Promise<ConfirmCandidateProfileResponse> {
  const token = await getCandidateToken();
  const res = await fetch(getFunctionUrl('confirmCandidateProfile'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al confirmar el perfil');
  }
  return res.json();
}
