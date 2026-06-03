export type OfferStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface Offer {
  id: string;
  applicationId: string;
  candidateId: string;
  jobId: string;

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

  templateId?: string;
  templateVersion?: string;
  documentStoragePath?: string;
  documentHash?: string;

  tokenHash?: string;
  tokenExpiresAt?: Date;
  tokenUsedAt?: Date;

  sentAt?: Date;
  sentBy?: string;
  acceptedAt?: Date;
  declinedAt?: Date;
  acceptedByName?: string;
  acceptedByEmail?: string;
  responseFromIp?: string;
  responseUserAgent?: string;
  declineReason?: string;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateOfferDTO = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateOfferDTO = Partial<
  Omit<Offer, 'id' | 'createdAt' | 'applicationId' | 'candidateId' | 'jobId'>
>;
