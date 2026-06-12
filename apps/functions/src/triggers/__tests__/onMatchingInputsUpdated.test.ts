import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentUpdated: vi.fn((_path, handler) => handler),
}));

vi.mock('../../services/skillMatchService', () => ({
  SkillMatchService: class {
    recalculateForCandidate = vi.fn();
    recalculateForJob = vi.fn();
  },
}));

import {
  candidateMatchingInputsChanged,
  jobMatchingInputsChanged,
} from '../onMatchingInputsUpdated';

describe('matching input change detection', () => {
  it('ignora skills extraídas mientras el perfil continúa draft', () => {
    expect(
      candidateMatchingInputsChanged(
        { profileStatus: 'draft', technicalSkills: [] },
        { profileStatus: 'draft', technicalSkills: ['React'] },
      ),
    ).toBe(false);
  });

  it('recalcula cuando se confirma el perfil', () => {
    expect(
      candidateMatchingInputsChanged(
        { profileStatus: 'draft', technicalSkills: ['React'] },
        { profileStatus: 'completed', technicalSkills: ['React'] },
      ),
    ).toBe(true);
  });

  it('recalcula cuando cambian las skills de un perfil completo', () => {
    expect(
      candidateMatchingInputsChanged(
        { profileStatus: 'completed', technicalSkills: ['React'] },
        {
          profileStatus: 'completed',
          technicalSkills: ['React', 'TypeScript'],
        },
      ),
    ).toBe(true);
  });

  it('ignora cambios del candidato que no afectan el matching', () => {
    expect(
      candidateMatchingInputsChanged(
        {
          profileStatus: 'completed',
          technicalSkills: ['React'],
          phone: '1111',
        },
        {
          profileStatus: 'completed',
          technicalSkills: ['React'],
          phone: '2222',
        },
      ),
    ).toBe(false);
  });

  it('recalcula únicamente cuando cambian las skills de la posición', () => {
    expect(
      jobMatchingInputsChanged(
        { title: 'Frontend', skills: [{ name: 'React' }] },
        { title: 'Frontend Senior', skills: [{ name: 'React' }] },
      ),
    ).toBe(false);

    expect(
      jobMatchingInputsChanged(
        { skills: [{ name: 'React', weight: 3 }] },
        { skills: [{ name: 'React', weight: 5 }] },
      ),
    ).toBe(true);
  });
});
