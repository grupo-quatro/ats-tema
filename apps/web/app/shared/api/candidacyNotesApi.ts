import type {
  GetCandidacyNotesResponse,
  SaveCandidacyNotePayload,
  SaveCandidacyNoteResponse,
  UpdateCandidacyNotePayload,
  UpdateCandidacyNoteResponse,
} from '@ats/shared-types';
import { getFunctionUrl } from '../lib/functionsUrl';
import { getToken } from '../lib/auth';

export async function saveCandidacyNote(
  payload: SaveCandidacyNotePayload,
): Promise<SaveCandidacyNoteResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('saveCandidacyNote'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al guardar la nota');
  }
  return res.json();
}

export async function updateCandidacyNote(
  payload: UpdateCandidacyNotePayload,
): Promise<UpdateCandidacyNoteResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('updateCandidacyNote'), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al actualizar la nota');
  }
  return res.json();
}

export async function getCandidacyNotes(
  applicationId: string,
): Promise<GetCandidacyNotesResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ applicationId });
  const res = await fetch(`${getFunctionUrl('getCandidacyNotes')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al obtener las notas');
  }
  return res.json();
}
