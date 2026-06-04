import { createHash, randomBytes } from 'crypto';

import type {
  CreateOfferDraftPayload,
  CreateOfferDraftResponse,
  GetOfferByApplicationResponse,
  Job,
  Offer,
  PublicOfferResponse,
  RespondOfferPayload,
  RespondOfferResponse,
  SendOfferPayload,
  SendOfferResponse,
} from '@ats/shared-types';

import { auth, storage } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { JobsRepository } from '../repositories/jobRepository';
import { OfferRepository } from '../repositories/offerRepository';
import { OfferWorkflowRepository } from '../repositories/offerWorkflowRepository';

const OFFER_TOKEN_TTL_DAYS = 7;
const DEFAULT_TEMPLATE_ID = 'default-offer-letter';
const DEFAULT_TEMPLATE_VERSION = '1.0';

export class OfferNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferNotFoundError';
  }
}

export class OfferInvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferInvalidStateError';
  }
}

export class OfferUnauthorizedStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferUnauthorizedStateError';
  }
}

export type OfferResponseContext = {
  ip?: string;
  userAgent?: string;
};

type OfferDocumentData = {
  candidateName: string;
  jobTitle: string;
  compensation?: string;
  startDate?: string;
  modality?: string;
  benefits?: string[];
  expirationDate?: string;
  observations?: string;
};

export class OfferService {
  constructor(
    private readonly offerRepository: OfferRepository = new OfferRepository(),
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
    private readonly offerWorkflowRepository: OfferWorkflowRepository = new OfferWorkflowRepository(),
  ) {}

  async createDraft(
    payload: CreateOfferDraftPayload,
    createdBy: string,
  ): Promise<CreateOfferDraftResponse> {
    const applicationId = payload.applicationId.trim();
    const application =
      await this.applicationsRepository.findById(applicationId);

    if (!application) {
      throw new OfferNotFoundError('La candidatura no existe.');
    }

    this.assertApplicationCanReceiveOffer(application.status);

    const [candidate, job] = await Promise.all([
      this.candidatesRepository.findById(application.candidateId),
      this.jobsRepository.findById(application.jobId),
    ]);

    const candidateName =
      candidate?.fullName ?? application.candidateName ?? 'Candidato';
    const candidateEmail = candidate?.email ?? application.candidateEmail;
    if (!candidateEmail) {
      throw new OfferInvalidStateError(
        'El candidato debe tener un email válido para enviar una carta oferta.',
      );
    }

    const jobTitle = job?.title ?? application.jobTitle ?? application.jobId;
    const offerId = this.offerRepository.createId();
    const documentData: OfferDocumentData = {
      candidateName,
      jobTitle,
      compensation:
        payload.compensation?.trim() || this.formatJobCompensation(job),
      startDate: payload.startDate?.trim() || undefined,
      modality: payload.modality?.trim() || this.formatJobModality(job),
      benefits: this.cleanBenefits(payload.benefits) ?? job?.benefits,
      expirationDate: payload.expirationDate?.trim() || undefined,
      observations: payload.observations?.trim() || undefined,
    };
    const documentHtml = this.renderOfferDocument(documentData);
    const documentStoragePath = await this.storeOfferDocument(
      offerId,
      documentHtml,
    );

    const offer = await this.offerRepository.create(offerId, {
      applicationId,
      candidateId: application.candidateId,
      jobId: application.jobId,
      status: 'draft',
      candidateName,
      candidateEmail,
      jobTitle,
      compensation: documentData.compensation,
      startDate: documentData.startDate,
      modality: documentData.modality,
      benefits: documentData.benefits,
      expirationDate: documentData.expirationDate,
      observations: documentData.observations,
      templateId: payload.templateId?.trim() || DEFAULT_TEMPLATE_ID,
      templateVersion: DEFAULT_TEMPLATE_VERSION,
      documentStoragePath,
      documentHash: this.hash(documentHtml),
      createdBy,
    });

    return { offer };
  }

  async sendOffer(
    payload: SendOfferPayload,
    sentBy: string,
  ): Promise<SendOfferResponse> {
    const offer = await this.getRequiredOffer(payload.offerId.trim());
    if (offer.status !== 'draft') {
      throw new OfferInvalidStateError(
        'Solo se pueden enviar ofertas en estado draft.',
      );
    }

    const application = await this.applicationsRepository.findById(
      offer.applicationId,
    );
    if (!application) {
      throw new OfferNotFoundError('La candidatura asociada no existe.');
    }
    this.assertApplicationCanReceiveOffer(application.status);

    const token = this.generateToken();
    const tokenHash = this.hash(token);
    const tokenExpiresAt = this.addDays(new Date(), OFFER_TOKEN_TTL_DAYS);
    const publicUrl = this.buildPublicOfferUrl(token);
    const userRecord = await auth.getUser(sentBy).catch(() => null);

    await this.offerWorkflowRepository.sendOffer({
      offerId: offer.id,
      applicationId: offer.applicationId,
      sentBy,
      sentByEmail: userRecord?.email ?? sentBy,
      tokenHash,
      tokenExpiresAt,
      email: {
        to: offer.candidateEmail,
        subject: `Carta oferta - ${offer.jobTitle}`,
        html: this.renderOfferEmail(offer, publicUrl),
        text: `Hola ${offer.candidateName}. Podés revisar tu carta oferta en ${publicUrl}`,
        metadata: {
          offerId: offer.id,
          applicationId: offer.applicationId,
        },
      },
    });

    const updatedOffer = await this.getRequiredOffer(offer.id);

    return { offer: updatedOffer, publicUrl };
  }

  async getOfferByApplication(
    applicationId: string,
  ): Promise<GetOfferByApplicationResponse> {
    const application = await this.applicationsRepository.findById(
      applicationId.trim(),
    );
    if (!application) {
      throw new OfferNotFoundError('La candidatura no existe.');
    }

    const offer = await this.offerRepository.findLatestByApplicationId(
      applicationId.trim(),
    );

    return { offer };
  }

  async getPublicOffer(token: string): Promise<PublicOfferResponse> {
    const offer = await this.getOfferByToken(token);
    await this.assertPublicOfferAvailable(offer);

    return {
      offerId: offer.id,
      status: offer.status,
      candidateName: offer.candidateName,
      candidateEmail: offer.candidateEmail,
      jobTitle: offer.jobTitle,
      compensation: offer.compensation,
      startDate: offer.startDate,
      modality: offer.modality,
      benefits: offer.benefits,
      expirationDate: offer.expirationDate,
      observations: offer.observations,
      documentHtml: this.renderOfferDocument({
        candidateName: offer.candidateName,
        jobTitle: offer.jobTitle,
        compensation: offer.compensation,
        startDate: offer.startDate,
        modality: offer.modality,
        benefits: offer.benefits,
        expirationDate: offer.expirationDate,
        observations: offer.observations,
      }),
    };
  }

  async respondToOffer(
    payload: RespondOfferPayload,
    context: OfferResponseContext,
  ): Promise<RespondOfferResponse> {
    const offer = await this.getOfferByToken(payload.token);
    await this.assertPublicOfferAvailable(offer);

    if (payload.action === 'accept') {
      const updatedOffer = await this.offerRepository.update(offer.id, {
        status: 'accepted',
        acceptedAt: new Date(),
        tokenUsedAt: new Date(),
        acceptedByName: payload.signerName?.trim(),
        acceptedByEmail: offer.candidateEmail,
        responseFromIp: context.ip,
        responseUserAgent: context.userAgent,
      });

      return { offerId: updatedOffer.id, status: 'accepted' };
    }

    const updatedOffer = await this.offerRepository.update(offer.id, {
      status: 'declined',
      declinedAt: new Date(),
      tokenUsedAt: new Date(),
      declineReason: payload.declineReason?.trim() || undefined,
      responseFromIp: context.ip,
      responseUserAgent: context.userAgent,
    });

    return { offerId: updatedOffer.id, status: 'declined' };
  }

  private async getRequiredOffer(offerId: string): Promise<Offer> {
    const offer = await this.offerRepository.findById(offerId);
    if (!offer) {
      throw new OfferNotFoundError('La oferta no existe.');
    }
    return offer;
  }

  private async getOfferByToken(token: string): Promise<Offer> {
    const offer = await this.offerRepository.findByTokenHash(this.hash(token));
    if (!offer) {
      throw new OfferNotFoundError(
        'La oferta no existe o el link es inválido.',
      );
    }
    return offer;
  }

  private assertApplicationCanReceiveOffer(status: string): void {
    if (status === 'draft') {
      throw new OfferUnauthorizedStateError(
        'No se puede generar oferta para una candidatura en draft.',
      );
    }

    if (status === 'rejected' || status === 'withdrawn' || status === 'hired') {
      throw new OfferUnauthorizedStateError(
        'No se puede generar oferta para una candidatura cerrada.',
      );
    }
  }

  private async assertPublicOfferAvailable(offer: Offer): Promise<void> {
    if (offer.status !== 'sent') {
      throw new OfferInvalidStateError('La oferta ya no está disponible.');
    }

    if (!offer.tokenExpiresAt || offer.tokenExpiresAt.getTime() < Date.now()) {
      await this.offerRepository.update(offer.id, { status: 'expired' });
      throw new OfferInvalidStateError('El link de la oferta está vencido.');
    }
  }

  private cleanBenefits(benefits?: string[]): string[] | undefined {
    const clean = benefits
      ?.map((benefit) => benefit.trim())
      .filter((benefit) => benefit.length > 0);
    return clean?.length ? clean : undefined;
  }

  private formatJobCompensation(job: Job | null): string | undefined {
    if (!job?.salaryMin && !job?.salaryMax) return undefined;

    const currency = job.currency ? `${job.currency} ` : '';
    if (job.salaryMin && job.salaryMax) {
      return `${currency}${job.salaryMin} - ${job.salaryMax}`;
    }

    if (job.salaryMin) return `Desde ${currency}${job.salaryMin}`;

    return `Hasta ${currency}${job.salaryMax}`;
  }

  private formatJobModality(job: Job | null): string | undefined {
    if (!job?.location) return undefined;

    const labels: Record<Job['location'], string> = {
      remote: 'Remoto',
      hybrid: 'Híbrido',
      'on-site': 'Presencial',
    };

    return labels[job.location];
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private buildPublicOfferUrl(token: string): string {
    const baseUrl =
      process.env.OFFER_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/offer/${token}`;
  }

  private async storeOfferDocument(
    offerId: string,
    documentHtml: string,
  ): Promise<string> {
    const filePath = `offers/${offerId}/offer.html`;
    await storage.bucket().file(filePath).save(documentHtml, {
      contentType: 'text/html; charset=utf-8',
      resumable: false,
    });
    return filePath;
  }

  private renderOfferEmail(offer: Offer, publicUrl: string): string {
    return `
      <p>Hola ${this.escapeHtml(offer.candidateName)},</p>
      <p>Te enviamos la carta oferta para la posición <strong>${this.escapeHtml(
        offer.jobTitle,
      )}</strong>.</p>
      <p>Podés revisarla y responder desde el siguiente enlace:</p>
      <p><a href="${this.escapeHtml(publicUrl)}">Ver carta oferta</a></p>
    `;
  }

  private renderOfferDocument(data: OfferDocumentData): string {
    const benefits = data.benefits?.length
      ? `<ul>${data.benefits
          .map((benefit) => `<li>${this.escapeHtml(benefit)}</li>`)
          .join('')}</ul>`
      : '<p>No se informaron beneficios adicionales.</p>';

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Carta oferta - ${this.escapeHtml(data.jobTitle)}</title>
        </head>
        <body>
          <h1>Carta oferta</h1>
          <p>Estimada/o ${this.escapeHtml(data.candidateName)},</p>
          <p>Tenemos el agrado de acercarte una propuesta para la posición <strong>${this.escapeHtml(
            data.jobTitle,
          )}</strong>.</p>
          <p><strong>Compensación:</strong> ${this.escapeHtml(
            data.compensation ?? 'A confirmar',
          )}</p>
          <p><strong>Modalidad:</strong> ${this.escapeHtml(
            data.modality ?? 'A confirmar',
          )}</p>
          <p><strong>Fecha estimada de inicio:</strong> ${this.escapeHtml(
            data.startDate ?? 'A confirmar',
          )}</p>
          <p><strong>Vigencia de la oferta:</strong> ${this.escapeHtml(
            data.expirationDate ?? 'A confirmar',
          )}</p>
          <h2>Beneficios</h2>
          ${benefits}
          <h2>Observaciones</h2>
          <p>${this.escapeHtml(data.observations ?? 'Sin observaciones.')}</p>
        </body>
      </html>
    `.trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
