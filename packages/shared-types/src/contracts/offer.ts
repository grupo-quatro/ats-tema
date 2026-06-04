import type { Offer, OfferStatus } from '../models/offer';

export interface OfferInput {
  applicationId: string;
  compensation?: string;
  startDate?: string;
  modality?: string;
  benefits?: string[];
  expirationDate?: string;
  observations?: string;
  templateId?: string;
}

export interface CreateOfferDraftPayload extends OfferInput {}

export interface CreateOfferDraftResponse {
  offer: Offer;
}

export interface SendOfferPayload {
  offerId: string;
}

export interface SendOfferResponse {
  offer: Offer;
  publicUrl: string;
}

export interface GetOfferByTokenPayload {
  token: string;
}

export interface GetOfferByApplicationPayload {
  applicationId: string;
}

export interface GetOfferByApplicationResponse {
  offer: Offer | null;
}

export interface PublicOfferResponse {
  offerId: string;
  status: OfferStatus;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  compensation?: string;
  startDate?: string;
  modality?: string;
  benefits?: string[];
  expirationDate?: string;
  observations?: string;
  documentHtml: string;
}

export interface RespondOfferPayload {
  token: string;
  action: 'accept' | 'decline';
  signerName?: string;
  declineReason?: string;
}

export interface RespondOfferResponse {
  offerId: string;
  status: Extract<OfferStatus, 'accepted' | 'declined'>;
}
