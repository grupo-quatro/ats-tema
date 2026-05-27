import { describe, it, expect } from 'vitest';
import {
  validateGetApplicationsByJobPayload,
  GetApplicationsByJobValidationError,
} from '../getApplicationsByJobValidator';

describe('validateGetApplicationsByJobPayload', () => {
  it('no lanza cuando el payload mínimo es válido', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({ jobId: 'job-1' }),
    ).not.toThrow();
  });

  it('no lanza cuando todos los campos opcionales son válidos', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderBy: 'fitScore',
        orderDirection: 'desc',
        limit: 10,
      }),
    ).not.toThrow();
  });

  it('lanza GetApplicationsByJobValidationError cuando jobId está ausente', () => {
    expect(() => validateGetApplicationsByJobPayload({})).toThrow(
      GetApplicationsByJobValidationError,
    );

    try {
      validateGetApplicationsByJobPayload({});
    } catch (e) {
      expect((e as GetApplicationsByJobValidationError).message).toMatch(
        /jobId/,
      );
    }
  });

  it('lanza GetApplicationsByJobValidationError cuando jobId está vacío', () => {
    expect(() => validateGetApplicationsByJobPayload({ jobId: '   ' })).toThrow(
      GetApplicationsByJobValidationError,
    );
  });

  it('lanza GetApplicationsByJobValidationError cuando orderBy no es válido', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderBy: 'name' as any,
      }),
    ).toThrow(GetApplicationsByJobValidationError);

    try {
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderBy: 'name' as any,
      });
    } catch (e) {
      expect((e as GetApplicationsByJobValidationError).message).toMatch(
        /ordenamiento/,
      );
    }
  });

  it('lanza GetApplicationsByJobValidationError cuando orderDirection no es válido', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderDirection: 'random' as any,
      }),
    ).toThrow(GetApplicationsByJobValidationError);
  });

  it('lanza GetApplicationsByJobValidationError cuando limit es cero', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({ jobId: 'job-1', limit: 0 }),
    ).toThrow(GetApplicationsByJobValidationError);
  });

  it('lanza GetApplicationsByJobValidationError cuando limit es negativo', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({ jobId: 'job-1', limit: -5 }),
    ).toThrow(GetApplicationsByJobValidationError);
  });

  it('lanza GetApplicationsByJobValidationError cuando limit no es entero', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({ jobId: 'job-1', limit: 1.5 }),
    ).toThrow(GetApplicationsByJobValidationError);
  });

  it('acepta orderBy createdAt', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderBy: 'createdAt',
      }),
    ).not.toThrow();
  });

  it('acepta orderBy fitScore', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderBy: 'fitScore',
      }),
    ).not.toThrow();
  });

  it('acepta orderDirection asc y desc', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderDirection: 'asc',
      }),
    ).not.toThrow();

    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderDirection: 'desc',
      }),
    ).not.toThrow();
  });

  it('acepta limit entero positivo', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({ jobId: 'job-1', limit: 1 }),
    ).not.toThrow();

    expect(() =>
      validateGetApplicationsByJobPayload({ jobId: 'job-1', limit: 100 }),
    ).not.toThrow();
  });

  it('ignora orderBy undefined sin lanzar', () => {
    expect(() =>
      validateGetApplicationsByJobPayload({
        jobId: 'job-1',
        orderBy: undefined,
      }),
    ).not.toThrow();
  });
});
