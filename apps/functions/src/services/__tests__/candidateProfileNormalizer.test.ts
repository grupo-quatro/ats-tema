import { describe, expect, it } from 'vitest';

import { normalizeCandidateProfile } from '../candidateProfileNormalizer';

describe('normalizeCandidateProfile', () => {
  it('normaliza los campos principales del perfil', () => {
    expect(
      normalizeCandidateProfile({
        firstName: '  Ana   María ',
        lastName: ' Pérez ',
        fullName: ' Ana   María Pérez ',
        email: ' Ana.Perez @Example.COM ',
        phone: '(011) 2938-8293',
        location: ' Buenos   Aires ',
        yearsOfExperience: 5,
        education: ' Analista   de Sistemas ',
        technicalSkills: [' React ', '', 'TypeScript', 'react', ' Node.js  '],
        professionalSummary: ' Desarrolladora   frontend. ',
      }),
    ).toEqual({
      firstName: 'Ana María',
      lastName: 'Pérez',
      fullName: 'Ana María Pérez',
      email: 'ana.perez@example.com',
      phone: '01129388293',
      location: 'Buenos Aires',
      yearsOfExperience: 5,
      education: 'Analista de Sistemas',
      technicalSkills: ['React', 'TypeScript', 'Node.js'],
      professionalSummary: 'Desarrolladora frontend.',
    });
  });

  it('omite años de experiencia fuera de rango o no enteros', () => {
    expect(
      normalizeCandidateProfile({ yearsOfExperience: -1 }).yearsOfExperience,
    ).toBeUndefined();
    expect(
      normalizeCandidateProfile({ yearsOfExperience: 61 }).yearsOfExperience,
    ).toBeUndefined();
    expect(
      normalizeCandidateProfile({ yearsOfExperience: 3.5 }).yearsOfExperience,
    ).toBeUndefined();
  });
});
