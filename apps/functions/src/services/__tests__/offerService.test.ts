import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Application, Offer } from '@ats/shared-types';

const firebaseAdminMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveFile: vi.fn(),
}));

vi.mock('../../core/firebaseAdmin', () => ({
  auth: {
    getUser: firebaseAdminMocks.getUser,
  },
  storage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: firebaseAdminMocks.saveFile,
      })),
    })),
  },
}));

import {
  OfferInvalidStateError,
  OfferNotFoundError,
  OfferService,
  OfferUnauthorizedStateError,
} from '../offerService';

const makeApplication = (
  overrides: Partial<Application> = {},
): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  candidateName: 'Ana Demo',
  candidateEmail: 'ana@example.com',
  stage: 'hr_2_done',
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  stageUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'offer-1',
  applicationId: 'app-1',
  candidateId: 'cand-1',
  jobId: 'job-1',
  status: 'draft',
  candidateName: 'Ana Demo',
  candidateEmail: 'ana@example.com',
  jobTitle: 'Backend Developer',
  createdBy: 'hr-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const offerRepository = {
  createId: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  findLatestByApplicationId: vi.fn(),
  findByTokenHash: vi.fn(),
  update: vi.fn(),
};

const applicationsRepository = {
  findById: vi.fn(),
  update: vi.fn(),
  addStageHistoryEntry: vi.fn(),
};

const candidatesRepository = {
  findById: vi.fn(),
};

const jobsRepository = {
  findById: vi.fn(),
};

const offerWorkflowRepository = {
  sendOffer: vi.fn(),
};

describe('OfferService', () => {
  let service: OfferService;

  beforeEach(() => {
    vi.clearAllMocks();
    firebaseAdminMocks.getUser.mockResolvedValue({ email: 'hr@example.com' });
    firebaseAdminMocks.saveFile.mockResolvedValue(undefined);

    offerRepository.createId.mockReturnValue('offer-1');
    offerRepository.create.mockImplementation((offerId, data) =>
      Promise.resolve(
        makeOffer({
          id: offerId,
          ...data,
        }),
      ),
    );
    offerRepository.update.mockImplementation((offerId, data) =>
      Promise.resolve(
        makeOffer({
          id: offerId,
          ...data,
        }),
      ),
    );
    offerRepository.findLatestByApplicationId.mockResolvedValue(makeOffer());

    applicationsRepository.findById.mockResolvedValue(makeApplication());
    applicationsRepository.update.mockResolvedValue(undefined);
    applicationsRepository.addStageHistoryEntry.mockResolvedValue(undefined);
    candidatesRepository.findById.mockResolvedValue({
      fullName: 'Ana Demo',
      email: 'ana@example.com',
    });
    jobsRepository.findById.mockResolvedValue({
      title: 'Backend Developer',
      location: 'remote',
      salaryMin: 2000,
      salaryMax: 2800,
      currency: 'USD',
      benefits: ['Home office total', 'Learning budget'],
    });
    offerWorkflowRepository.sendOffer.mockResolvedValue(undefined);

    service = new OfferService(
      offerRepository as any,
      applicationsRepository as any,
      candidatesRepository as any,
      jobsRepository as any,
      offerWorkflowRepository as any,
    );
  });

  it('crea una carta oferta en draft con documento y datos denormalizados', async () => {
    const result = await service.createDraft(
      {
        applicationId: 'app-1',
        compensation: 'ARS 100',
        modality: 'Remoto',
        benefits: ['Prepaga', 'Capacitaciones'],
      },
      'hr-1',
    );

    expect(firebaseAdminMocks.saveFile).toHaveBeenCalledWith(
      expect.stringContaining('Carta oferta'),
      expect.objectContaining({ contentType: 'text/html; charset=utf-8' }),
    );
    expect(offerRepository.create).toHaveBeenCalledWith(
      'offer-1',
      expect.objectContaining({
        applicationId: 'app-1',
        candidateId: 'cand-1',
        jobId: 'job-1',
        status: 'draft',
        candidateName: 'Ana Demo',
        candidateEmail: 'ana@example.com',
        jobTitle: 'Backend Developer',
        documentStoragePath: 'offers/offer-1/offer.html',
        createdBy: 'hr-1',
      }),
    );
    expect(result.offer.status).toBe('draft');
  });

  it('usa defaults de la posición cuando la oferta no sobrescribe modalidad, beneficios o compensación', async () => {
    await service.createDraft(
      {
        applicationId: 'app-1',
      },
      'hr-1',
    );

    expect(offerRepository.create).toHaveBeenCalledWith(
      'offer-1',
      expect.objectContaining({
        compensation: 'USD 2000 - 2800',
        modality: 'Remoto',
        benefits: ['Home office total', 'Learning budget'],
      }),
    );
  });

  it('envía la oferta, mueve la candidatura a offer_sent y registra historial', async () => {
    offerRepository.findById.mockResolvedValue(makeOffer());

    const result = await service.sendOffer({ offerId: 'offer-1' }, 'hr-1');

    expect(offerWorkflowRepository.sendOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        offerId: 'offer-1',
        applicationId: 'app-1',
        sentBy: 'hr-1',
        sentByEmail: 'hr@example.com',
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        tokenExpiresAt: expect.any(Date),
        email: expect.objectContaining({
          to: 'ana@example.com',
          subject: 'Carta oferta - Backend Developer',
        }),
      }),
    );
    expect(result.publicUrl).toContain('/offer/');
  });

  it('obtiene la oferta interna asociada a una candidatura', async () => {
    offerRepository.findLatestByApplicationId.mockResolvedValue(
      makeOffer({ status: 'accepted' }),
    );

    const result = await service.getOfferByApplication('app-1');

    expect(applicationsRepository.findById).toHaveBeenCalledWith('app-1');
    expect(offerRepository.findLatestByApplicationId).toHaveBeenCalledWith(
      'app-1',
    );
    expect(result).toEqual({
      offer: expect.objectContaining({ status: 'accepted' }),
    });
  });

  it('retorna null si la candidatura no tiene carta oferta', async () => {
    offerRepository.findLatestByApplicationId.mockResolvedValue(null);

    await expect(service.getOfferByApplication('app-1')).resolves.toEqual({
      offer: null,
    });
  });

  it('lanza OfferNotFoundError si se consulta oferta de una candidatura inexistente', async () => {
    applicationsRepository.findById.mockResolvedValue(null);

    await expect(service.getOfferByApplication('missing-app')).rejects.toThrow(
      OfferNotFoundError,
    );
  });

  it('registra aceptación desde token público sin mover automáticamente a hired', async () => {
    offerRepository.findByTokenHash.mockResolvedValue(
      makeOffer({
        status: 'sent',
        tokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
      }),
    );

    const result = await service.respondToOffer(
      {
        token: 'public-token',
        action: 'accept',
        signerName: 'Ana Demo',
      },
      { ip: '127.0.0.1', userAgent: 'vitest' },
    );

    expect(offerRepository.update).toHaveBeenCalledWith(
      'offer-1',
      expect.objectContaining({
        status: 'accepted',
        acceptedByName: 'Ana Demo',
        acceptedByEmail: 'ana@example.com',
        responseFromIp: '127.0.0.1',
        responseUserAgent: 'vitest',
      }),
    );
    expect(applicationsRepository.update).not.toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({ stage: 'hired' }),
    );
    expect(result).toEqual({ offerId: 'offer-1', status: 'accepted' });
  });

  it('rechaza generar ofertas para candidaturas draft o cerradas', async () => {
    applicationsRepository.findById.mockResolvedValue(
      makeApplication({ status: 'draft' }),
    );

    await expect(
      service.createDraft({ applicationId: 'app-1' }, 'hr-1'),
    ).rejects.toThrow(OfferUnauthorizedStateError);
  });

  it('permite generar ofertas para candidaturas active aunque el stage previo varíe', async () => {
    applicationsRepository.findById.mockResolvedValue(
      makeApplication({ stage: 'screening', status: 'active' }),
    );

    await expect(
      service.createDraft({ applicationId: 'app-1' }, 'hr-1'),
    ).resolves.toMatchObject({
      offer: expect.objectContaining({ status: 'draft' }),
    });
  });

  it('vence una oferta si el token expiró', async () => {
    offerRepository.findByTokenHash.mockResolvedValue(
      makeOffer({
        status: 'sent',
        tokenExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    );

    await expect(service.getPublicOffer('expired-token')).rejects.toThrow(
      OfferInvalidStateError,
    );

    expect(offerRepository.update).toHaveBeenCalledWith('offer-1', {
      status: 'expired',
    });
  });
});
