import { describe, it, expect } from 'vitest';
import {
  validateUpdateApplicationStagePayload,
  UpdateApplicationValidationError,
} from '../updateApplicationValidator';

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

  it('lanza UpdateApplicationValidationError cuando applicationId está ausente', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({ stage: 'screening' }),
    ).toThrow(UpdateApplicationValidationError);

    try {
      validateUpdateApplicationStagePayload({ stage: 'screening' });
    } catch (e) {
      expect((e as UpdateApplicationValidationError).message).toMatch(
        /applicationId/,
      );
    }
  });

  it('lanza UpdateApplicationValidationError cuando applicationId está vacío', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: '   ',
        stage: 'screening',
      }),
    ).toThrow(UpdateApplicationValidationError);
  });

  it('lanza UpdateApplicationValidationError cuando stage está ausente', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({ applicationId: 'app-1' }),
    ).toThrow(UpdateApplicationValidationError);

    try {
      validateUpdateApplicationStagePayload({ applicationId: 'app-1' });
    } catch (e) {
      expect((e as UpdateApplicationValidationError).message).toMatch(/stage/);
    }
  });

  it('lanza UpdateApplicationValidationError cuando stage no es un valor válido del enum', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'interview_hr' as any,
      }),
    ).toThrow(UpdateApplicationValidationError);

    try {
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'interview_hr' as any,
      });
    } catch (e) {
      expect((e as UpdateApplicationValidationError).message).toMatch(
        /interview_hr/,
      );
    }
  });

  it('rechaza profile_pending porque es un stage tecnico interno', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'profile_pending',
      }),
    ).toThrow(UpdateApplicationValidationError);
  });

  it('rechaza send_offer porque debe gestionarse desde Carta oferta', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'send_offer',
      }),
    ).toThrow('Carta oferta');
  });

  it('lanza UpdateApplicationValidationError cuando stage es rejected sin rejectionReason', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
      }),
    ).toThrow(UpdateApplicationValidationError);

    try {
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
      });
    } catch (e) {
      expect((e as UpdateApplicationValidationError).message).toMatch(
        /rejectionReason/,
      );
    }
  });

  it('lanza UpdateApplicationValidationError cuando stage es rejected con rejectionReason vacío', () => {
    expect(() =>
      validateUpdateApplicationStagePayload({
        applicationId: 'app-1',
        stage: 'rejected',
        rejectionReason: '   ',
      }),
    ).toThrow(UpdateApplicationValidationError);
  });

  it.each([
    'applied',
    'screening',
    'cv_submitted',
    'schedule_hr_1',
    'hr_1_scheduled',
    'hr_1_done',
    'schedule_tech_1',
    'tech_1_scheduled',
    'tech_1_done',
    'onsite_interview',
    'psychotechnical',
    'pre_employment',
    'hired',
    'withdrawn',
  ] as const)('acepta el stage válido "%s"', (stage) => {
    expect(() =>
      validateUpdateApplicationStagePayload({ applicationId: 'app-1', stage }),
    ).not.toThrow();
  });
});
