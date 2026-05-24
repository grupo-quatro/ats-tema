import { describe, it, expect } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { validateUpdateApplicationStagePayload } from '../update-application-validator';

describe('validateUpdateApplicationStagePayload', () => {
  it('no lanza cuando el payload es válido', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'screening',
      }),
    ).not.toThrow();
  });

  it('no lanza cuando stage es rejected y se provee rejectionReason', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
        rejectionReason: 'No cumple los requisitos técnicos',
      }),
    ).not.toThrow();
  });

  it('lanza invalid-argument cuando applicationId está ausente', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({ stage: 'screening' }),
    ).toThrow(HttpsError);

    try {
      validateUpdateApplicationStagePayload({ stage: 'screening' });
    } catch (e) {
      expect((e as HttpsError).code).toBe('invalid-argument');
      expect((e as HttpsError).message).toMatch(/applicationId/);
    }
  });

  it('lanza invalid-argument cuando applicationId está vacío', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: '   ',
        stage: 'screening',
      }),
    ).toThrow(HttpsError);
  });

  it('lanza invalid-argument cuando stage está ausente', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({ applicationId: 'app-1' }),
    ).toThrow(HttpsError);

    try {
      validateUpdateApplicationStagePayload({ applicationId: 'app-1' });
    } catch (e) {
      expect((e as HttpsError).code).toBe('invalid-argument');
      expect((e as HttpsError).message).toMatch(/stage/);
    }
  });

  it('lanza invalid-argument cuando stage no es un valor válido del enum', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'interview_hr' as any,
      }),
    ).toThrow(HttpsError);

    try {
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'interview_hr' as any,
      });
    } catch (e) {
      expect((e as HttpsError).code).toBe('invalid-argument');
      expect((e as HttpsError).message).toMatch(/interview_hr/);
    }
  });

  it('lanza invalid-argument cuando stage es rejected sin rejectionReason', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
      }),
    ).toThrow(HttpsError);

    try {
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
      });
    } catch (e) {
      expect((e as HttpsError).code).toBe('invalid-argument');
      expect((e as HttpsError).message).toMatch(/rejectionReason/);
    }
  });

  it('lanza invalid-argument cuando stage es rejected con rejectionReason vacío', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
        rejectionReason: '   ',
      }),
    ).toThrow(HttpsError);
  });

  it.each([
    'applied',
    'screening',
    'cv_submitted',
    'interview_1_scheduled',
    'interview_1_done',
    'interview_2_scheduled',
    'interview_2_done',
    'offer_sent',
    'hired',
    'withdrawn',
  ] as const)('acepta el stage válido "%s"', (stage) => {
    expect(() =>
      validateUpdateApplicationStagePayload({ applicationId: 'app-1', stage }),
    ).not.toThrow();
  });
});
