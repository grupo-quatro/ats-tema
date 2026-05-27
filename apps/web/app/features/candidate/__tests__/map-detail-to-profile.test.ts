import { describe, it, expect } from 'vitest';
import type { ApplicationDetailDTO } from '@ats/shared-types';
import { mapDetailToProfile } from '../utils/candidateProfile.utils';

const makeDetail = (
  overrides: Partial<ApplicationDetailDTO> = {},
): ApplicationDetailDTO => ({
  id: 'app-1',
  stage: 'screening',
  status: 'active',
  fitScore: 88,
  fitSummary: 'Perfil muy alineado.',
  notes: 'Candidato proactivo.',
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-10'),
  stageUpdatedAt: new Date('2026-05-10'),
  candidate: {
    id: 'cand-1',
    fullName: 'Valentina Rossi',
    email: 'valentina@example.com',
    phone: '1122334455',
    location: 'Buenos Aires',
    technicalSkills: ['React', 'TypeScript'],
  },
  job: {
    id: 'job-1',
    title: 'Frontend Developer',
    skills: [
      { name: 'React', weight: 5, type: 'mandatory', yearsOfExperience: 2 },
    ],
  },
  ...overrides,
});

describe('mapDetailToProfile', () => {
  it('mapea identidad del candidato correctamente', () => {
    const profile = mapDetailToProfile(makeDetail());
    expect(profile.id).toBe('cand-1');
    expect(profile.applicationId).toBe('app-1');
    expect(profile.fullName).toBe('Valentina Rossi');
    expect(profile.initials).toBe('VR');
    expect(profile.email).toBe('valentina@example.com');
    expect(profile.phone).toBe('1122334455');
    expect(profile.location).toBe('Buenos Aires');
  });

  it('usa el título del puesto como title del perfil', () => {
    const profile = mapDetailToProfile(makeDetail());
    expect(profile.title).toBe('Frontend Developer');
  });

  it('mapea fitScore y strengths desde fitSummary', () => {
    const profile = mapDetailToProfile(makeDetail());
    expect(profile.fitScore).toBe(88);
    expect(profile.strengths).toEqual(['Perfil muy alineado.']);
  });

  it('retorna fitScore 0 cuando no está definido', () => {
    const profile = mapDetailToProfile(makeDetail({ fitScore: undefined }));
    expect(profile.fitScore).toBe(0);
  });

  it('retorna strengths vacío cuando fitSummary no está definido', () => {
    const profile = mapDetailToProfile(makeDetail({ fitSummary: undefined }));
    expect(profile.strengths).toEqual([]);
  });

  it('mapea interviewNotes desde notes', () => {
    const profile = mapDetailToProfile(makeDetail());
    expect(profile.interviewNotes).toHaveLength(1);
    expect(profile.interviewNotes[0]!.note).toBe('Candidato proactivo.');
    expect(profile.interviewNotes[0]!.authorName).toBe('Reclutador');
  });

  it('retorna interviewNotes vacío cuando notes no está definido', () => {
    const profile = mapDetailToProfile(makeDetail({ notes: undefined }));
    expect(profile.interviewNotes).toEqual([]);
  });

  it('mapea detectedSkills desde technicalSkills del candidato', () => {
    const profile = mapDetailToProfile(makeDetail());
    expect(profile.detectedSkills).toEqual(['React', 'TypeScript']);
  });

  it('retorna detectedSkills vacío cuando no hay technicalSkills', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: { ...makeDetail().candidate, technicalSkills: undefined },
      }),
    );
    expect(profile.detectedSkills).toEqual([]);
  });

  it('mapea jobSkills desde las skills del puesto', () => {
    const profile = mapDetailToProfile(makeDetail());
    expect(profile.jobSkills).toHaveLength(1);
    expect(profile.jobSkills[0]!.name).toBe('React');
    expect(profile.jobSkills[0]!.type).toBe('mandatory');
  });

  it('mapea gapSkills desde skillMatchStats.skillsFaltantes', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        skillMatchStats: {
          scoreTotal: 50,
          scoreMandatory: 50,
          scoreDesirable: 0,
          tieneTodosLosMandatorios: false,
          skillsCoincidentes: [],
          skillsFaltantes: [{ name: 'Node.js', weight: 4, type: 'mandatory' }],
          actualizadoEn: new Date('2026-05-10'),
        },
      }),
    );
    expect(profile.gapSkills).toEqual(['Node.js']);
  });

  it('retorna gapSkills vacío cuando no hay skillMatchStats', () => {
    const profile = mapDetailToProfile(
      makeDetail({ skillMatchStats: undefined }),
    );
    expect(profile.gapSkills).toEqual([]);
  });

  it('mapea parsedExperience a experience con period formateado', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: {
          ...makeDetail().candidate,
          parsedExperience: [
            {
              role: 'Dev',
              company: 'Acme',
              startDate: 'Ene 2022',
              endDate: 'Mar 2024',
            },
          ],
        },
      }),
    );
    expect(profile.experience).toHaveLength(1);
    expect(profile.experience[0]).toEqual({
      role: 'Dev',
      company: 'Acme',
      period: 'Ene 2022 - Mar 2024',
    });
  });

  it('retorna experience vacío cuando no hay parsedExperience', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: { ...makeDetail().candidate, parsedExperience: undefined },
      }),
    );
    expect(profile.experience).toEqual([]);
  });

  it('mapea parsedEducation a education con period formateado', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: {
          ...makeDetail().candidate,
          parsedEducation: [
            {
              degree: 'Licenciatura',
              institution: 'UBA',
              startDate: '2016',
              endDate: '2021',
            },
          ],
        },
      }),
    );
    expect(profile.education).toHaveLength(1);
    expect(profile.education[0]).toEqual({
      degree: 'Licenciatura',
      institution: 'UBA',
      period: '2016 - 2021',
    });
  });

  it('usa solo startDate como period cuando no hay endDate', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: {
          ...makeDetail().candidate,
          parsedExperience: [
            { role: 'Dev', company: 'Acme', startDate: 'Ene 2022' },
          ],
        },
      }),
    );
    expect(profile.experience[0]!.period).toBe('Ene 2022');
  });

  it('retorna period vacío cuando no hay startDate ni endDate', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: {
          ...makeDetail().candidate,
          parsedExperience: [{ role: 'Dev', company: 'Acme' }],
        },
      }),
    );
    expect(profile.experience[0]!.period).toBe('');
  });

  it('construye stageHistory correctamente', () => {
    const profile = mapDetailToProfile(makeDetail({ stage: 'applied' }));
    const current = profile.stageHistory.find((s) => s.status === 'current');
    expect(current?.key).toBe('postulacion_recibida');
  });

  it('usa fullName fallback cuando el candidato no tiene nombre', () => {
    const profile = mapDetailToProfile(
      makeDetail({
        candidate: { ...makeDetail().candidate, fullName: undefined },
      }),
    );
    expect(profile.fullName).toBe('Candidato sin nombre');
    expect(profile.initials).toBe('?');
  });
});
