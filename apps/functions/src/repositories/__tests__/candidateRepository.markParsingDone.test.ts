import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../core/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    delete: vi.fn(() => ({ __op: 'delete' })),
    serverTimestamp: vi.fn(() => ({ __op: 'serverTimestamp' })),
  },
  Timestamp: class {},
}));

import type { ParsedCandidateProfileData } from '@ats/shared-types';

import { db } from '../../core/firebaseAdmin';
import { CandidatesRepository } from '../candidateRepository';

describe('CandidatesRepository.markParsingDone', () => {
  const set = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as any).mockReturnValue({
      doc: vi.fn(() => ({ set })),
    });
  });

  it('remueve undefined anidados antes de persistir parsedData y parsedCv', async () => {
    const repository = new CandidatesRepository();
    const parsedData = {
      firstName: 'Sofia',
      lastName: undefined,
      fullName: 'Sofia Demo',
      technicalSkills: ['TypeScript'],
      parsedEducation: [
        {
          degree: 'Tecnicatura Superior en Analisis de Sistemas',
          institution: undefined,
          startDate: undefined,
          endDate: '2026',
        },
      ],
      parsedExperience: [
        {
          role: 'Developer',
          company: undefined,
          startDate: '2024',
          endDate: undefined,
        },
      ],
    } as ParsedCandidateProfileData;

    await repository.markParsingDone('candidate-1', parsedData);

    const savedData = set.mock.calls[0]?.[0];

    expect(savedData.parsedData).toEqual({
      firstName: 'Sofia',
      fullName: 'Sofia Demo',
      technicalSkills: ['TypeScript'],
      parsedEducation: [
        {
          degree: 'Tecnicatura Superior en Analisis de Sistemas',
          endDate: '2026',
        },
      ],
      parsedExperience: [
        {
          role: 'Developer',
          startDate: '2024',
        },
      ],
    });
    expect(savedData.parsedCv).toEqual({
      education: [
        {
          degree: 'Tecnicatura Superior en Analisis de Sistemas',
          endDate: '2026',
        },
      ],
      experience: [
        {
          role: 'Developer',
          startDate: '2024',
        },
      ],
    });
  });
});
