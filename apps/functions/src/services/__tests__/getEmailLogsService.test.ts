import { describe, it, expect, vi } from 'vitest';

import type { EmailLog } from '@ats/shared-types';

import { GetEmailLogsService } from '../getEmailLogsService';
import type { IEmailLogRepository } from '../../repositories/emailLogRepository';

const makeEmailLog = (overrides: Partial<EmailLog> = {}): EmailLog => ({
  id: 'log-1',
  applicationId: 'app-1',
  candidateId: 'cand-1',
  candidateEmail: 'test@example.com',
  jobId: 'job-1',
  templateId: 'tmpl-1',
  templateName: 'Postulación recibida',
  stage: 'applied',
  subject: 'Tu postulación fue recibida',
  body: '<p>Hola</p>',
  status: 'sent',
  recruiterId: 'recruiter-1',
  recruiterEmail: 'recruiter@example.com',
  attemptedAt: new Date('2024-01-01T10:00:00Z'),
  sentAt: new Date('2024-01-01T10:00:05Z'),
  ...overrides,
});

const makeEmailLogRepo = (): IEmailLogRepository => ({
  create: vi.fn(),
  updateStatus: vi.fn(),
  findById: vi.fn(),
  findByCandidate: vi.fn(),
  findFailed: vi.fn(),
  findFailedByApplication: vi.fn(),
});

describe('GetEmailLogsService.getByCandidate', () => {
  it('delega a findByCandidate del repositorio y retorna los logs', async () => {
    const repo = makeEmailLogRepo();
    const logs = [
      makeEmailLog(),
      makeEmailLog({ id: 'log-2', status: 'failed' }),
    ];
    vi.mocked(repo.findByCandidate).mockResolvedValue(logs);

    const service = new GetEmailLogsService(repo);
    const result = await service.getByCandidate('cand-1');

    expect(repo.findByCandidate).toHaveBeenCalledOnce();
    expect(repo.findByCandidate).toHaveBeenCalledWith('cand-1');
    expect(result).toEqual(logs);
  });

  it('retorna arreglo vacío cuando el candidato no tiene comunicaciones', async () => {
    const repo = makeEmailLogRepo();
    vi.mocked(repo.findByCandidate).mockResolvedValue([]);

    const service = new GetEmailLogsService(repo);
    const result = await service.getByCandidate('cand-sin-logs');

    expect(result).toHaveLength(0);
  });

  it('propaga el error del repositorio al caller', async () => {
    const repo = makeEmailLogRepo();
    vi.mocked(repo.findByCandidate).mockRejectedValue(
      new Error('Firestore no disponible'),
    );

    const service = new GetEmailLogsService(repo);
    await expect(service.getByCandidate('cand-1')).rejects.toThrow(
      'Firestore no disponible',
    );
  });
});

describe('GetEmailLogsService.getFailedByApplication', () => {
  it('delega a findFailedByApplication y retorna solo logs fallidos', async () => {
    const repo = makeEmailLogRepo();
    const failedLogs = [
      makeEmailLog({ id: 'log-3', status: 'failed', applicationId: 'app-2' }),
    ];
    vi.mocked(repo.findFailedByApplication).mockResolvedValue(failedLogs);

    const service = new GetEmailLogsService(repo);
    const result = await service.getFailedByApplication('app-2');

    expect(repo.findFailedByApplication).toHaveBeenCalledOnce();
    expect(repo.findFailedByApplication).toHaveBeenCalledWith('app-2');
    expect(result).toEqual(failedLogs);
  });

  it('retorna arreglo vacío cuando la postulación no tiene comunicaciones fallidas', async () => {
    const repo = makeEmailLogRepo();
    vi.mocked(repo.findFailedByApplication).mockResolvedValue([]);

    const service = new GetEmailLogsService(repo);
    const result = await service.getFailedByApplication('app-sin-fallos');

    expect(result).toHaveLength(0);
  });

  it('propaga el error del repositorio al caller', async () => {
    const repo = makeEmailLogRepo();
    vi.mocked(repo.findFailedByApplication).mockRejectedValue(
      new Error('Firestore no disponible'),
    );

    const service = new GetEmailLogsService(repo);
    await expect(service.getFailedByApplication('app-2')).rejects.toThrow(
      'Firestore no disponible',
    );
  });
});
