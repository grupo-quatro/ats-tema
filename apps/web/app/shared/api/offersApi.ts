import type {
  CreateOfferDraftPayload,
  CreateOfferDraftResponse,
  GetOfferByApplicationResponse,
  PreviewOfferPayload,
  PreviewOfferResponse,
  PublicOfferResponse,
  RespondOfferPayload,
  RespondOfferResponse,
  SendOfferPayload,
  SendOfferResponse,
  UpdateOfferDraftPayload,
  UpdateOfferDraftResponse,
} from '@ats/shared-types';
import { getToken } from '../lib/auth';
import { getFunctionUrl } from '../lib/functionsUrl';

async function parseErrorResponse(res: Response, fallback: string) {
  try {
    const error = await res.json();
    return error.error || fallback;
  } catch {
    return fallback;
  }
}

export async function createOfferDraft(
  payload: CreateOfferDraftPayload,
): Promise<CreateOfferDraftResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('createOfferDraft'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo crear la carta oferta'),
    );
  }

  return res.json();
}

export async function sendOffer(
  payload: SendOfferPayload,
): Promise<SendOfferResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('sendOffer'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo enviar la carta oferta'),
    );
  }

  return res.json();
}

export async function updateOfferDraft(
  payload: UpdateOfferDraftPayload,
): Promise<UpdateOfferDraftResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('updateOfferDraft'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo actualizar la carta oferta'),
    );
  }

  return res.json();
}

export async function previewOffer(
  payload: PreviewOfferPayload,
): Promise<PreviewOfferResponse> {
  const token = await getToken();
  const res = await fetch(getFunctionUrl('previewOffer'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo previsualizar la carta oferta'),
    );
  }

  return res.json();
}

export async function getOfferByApplication(
  applicationId: string,
): Promise<GetOfferByApplicationResponse> {
  const token = await getToken();
  const params = new URLSearchParams({ applicationId });
  const res = await fetch(
    `${getFunctionUrl('getOfferByApplication')}?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo obtener la carta oferta'),
    );
  }

  return res.json();
}

export async function getPublicOffer(
  token: string,
): Promise<PublicOfferResponse> {
  const params = new URLSearchParams({ token });
  const res = await fetch(`${getFunctionUrl('getOfferByToken')}?${params}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo obtener la carta oferta'),
    );
  }

  return res.json();
}

export async function respondOffer(
  payload: RespondOfferPayload,
): Promise<RespondOfferResponse> {
  const res = await fetch(getFunctionUrl('respondOffer'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await parseErrorResponse(res, 'No se pudo registrar la respuesta'),
    );
  }

  return res.json();
}
