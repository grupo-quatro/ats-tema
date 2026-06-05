import type {
  GetInterviewFormsResponse,
  SaveInterviewFormPayload,
  SaveInterviewFormResponse,
} from '@ats/shared-types';
import { getFunctionUrl } from '../lib/functionsUrl';
import { getToken } from '../lib/auth';

export async function saveInterviewForm(
  payload: SaveInterviewFormPayload,
): Promise<SaveInterviewFormResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('saveInterviewForm'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al guardar el formulario');
  }
  return res.json();
}

export async function getInterviewForms(
  applicationId: string,
): Promise<GetInterviewFormsResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ applicationId });
  const res = await fetch(`${getFunctionUrl('getInterviewForms')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al obtener los formularios');
  }
  return res.json();
}
