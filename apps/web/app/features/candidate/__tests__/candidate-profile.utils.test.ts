import { describe, it, expect } from 'vitest';
import type { ApplicationWithCandidateDTO } from '@ats/shared-types';
import {
  getInitials,
  buildStageHistory,
  mapApplicationToProfile,
  STAGE_ORDER,
} from '../utils/candidate-profile.utils';

const makeApplication = (
  overrides: Partial<ApplicationWithCandidateDTO> = {},
): ApplicationWithCandidateDTO => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  candidateName: 'Valentina Rossi',
  candidateEmail: 'valentina@example.com',
  stage: 'screening',
  status: 'active',
  fitScore: 85,
  fitSummary: 'Perfil muy alineado con el puesto.',
  notes: 'Buen perfil técnico.',
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-10'),
  stageUpdatedAt: new Date('2026-05-10'),
  ...overrides,
});

// ─── getInitials ─────────────────────────────────────────────────────────────

describe('getInitials', () => {
  it('retorna las iniciales de nombre y apellido', () => {
    expect(getInitials('Valentina Rossi')).toBe('VR');
  });

  it('retorna solo la primera inicial si hay un solo nombre', () => {
    expect(getInitials('Valentina')).toBe('V');
  });

  it('toma solo las dos primeras palabras si hay más de dos', () => {
    expect(getInitials('María José López García')).toBe('MJ');
  });

  it('retorna ? si el nombre es undefined', () => {
    expect(getInitials(undefined)).toBe('?');
  });

  it('retorna ? si el nombre es string vacío', () => {
    expect(getInitials('')).toBe('?');
  });

  it('maneja espacios extra', () => {
    expect(getInitials('  Ana   Torres  ')).toBe('AT');
  });
});

// ─── buildStageHistory ───────────────────────────────────────────────────────

describe('buildStageHistory', () => {
  it('marca como completed las etapas anteriores al stage actual', () => {
    const history = buildStageHistory('interview_1_done');
    const completedKeys = history
      .filter((s) => s.status === 'completed')
      .map((s) => s.key);

    expect(completedKeys).toContain('postulacion_recibida');
    expect(completedKeys).toContain('en_revision');
    expect(completedKeys).toContain('cv_presentado_area');
    expect(completedKeys).toContain('entrevista1_agendada');
  });

  it('marca como current el stage actual', () => {
    const history = buildStageHistory('interview_1_done');
    const current = history.find((s) => s.status === 'current');
    expect(current?.key).toBe('entrevista1_evaluacion');
  });

  it('marca como pending las etapas posteriores al stage actual', () => {
    const history = buildStageHistory('applied');
    const pending = history.filter((s) => s.status === 'pending');
    expect(pending.length).toBeGreaterThan(0);
    expect(history[0]!.status).toBe('current');
  });

  it('retorna una entrada por cada stage del orden (excluyendo rejected/withdrawn)', () => {
    const history = buildStageHistory('screening');
    expect(history.length).toBe(STAGE_ORDER.length);
  });

  it('cuando el stage es hired todas las etapas anteriores son completed', () => {
    const history = buildStageHistory('hired');
    const nonPending = history.filter((s) => s.status !== 'pending');
    const lastEntry = history[history.length - 1]!;
    expect(lastEntry.status).toBe('current');
    expect(lastEntry.key).toBe('contratado');
    expect(nonPending.length).toBe(history.length);
  });
});

// ─── mapApplicationToProfile ─────────────────────────────────────────────────

describe('mapApplicationToProfile', () => {
  it('mapea correctamente los campos de identidad del candidato', () => {
    const profile = mapApplicationToProfile(makeApplication());
    expect(profile.id).toBe('cand-1');
    expect(profile.fullName).toBe('Valentina Rossi');
    expect(profile.initials).toBe('VR');
    expect(profile.email).toBe('valentina@example.com');
  });

  it('mapea fitScore correctamente', () => {
    const profile = mapApplicationToProfile(makeApplication({ fitScore: 92 }));
    expect(profile.fitScore).toBe(92);
  });

  it('usa 0 como fitScore cuando no está definido', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ fitScore: undefined }),
    );
    expect(profile.fitScore).toBe(0);
  });

  it('mapea fitSummary como primer elemento de strengths', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ fitSummary: 'Excelente perfil técnico.' }),
    );
    expect(profile.strengths).toEqual(['Excelente perfil técnico.']);
  });

  it('retorna strengths vacío cuando fitSummary no está definido', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ fitSummary: undefined }),
    );
    expect(profile.strengths).toEqual([]);
  });

  it('mapea notes como interviewNote cuando está presente', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ notes: 'Candidato muy comunicativo.' }),
    );
    expect(profile.interviewNotes).toHaveLength(1);
    expect(profile.interviewNotes[0]!.note).toBe('Candidato muy comunicativo.');
  });

  it('retorna interviewNotes vacío cuando notes no está definido', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ notes: undefined }),
    );
    expect(profile.interviewNotes).toEqual([]);
  });

  it('usa "Candidato sin nombre" cuando candidateName no está definido', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ candidateName: undefined }),
    );
    expect(profile.fullName).toBe('Candidato sin nombre');
    expect(profile.initials).toBe('?');
  });

  it('retorna arrays vacíos para campos sin datos reales aún', () => {
    const profile = mapApplicationToProfile(makeApplication());
    expect(profile.experience).toEqual([]);
    expect(profile.education).toEqual([]);
    expect(profile.detectedSkills).toEqual([]);
    expect(profile.gapSkills).toEqual([]);
  });

  it('retorna cvMockUrl null', () => {
    const profile = mapApplicationToProfile(makeApplication());
    expect(profile.cvMockUrl).toBeNull();
  });

  it('construye el stageHistory con el stage correcto como current', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ stage: 'cv_submitted' }),
    );
    const current = profile.stageHistory.find((s) => s.status === 'current');
    expect(current?.key).toBe('cv_presentado_area');
  });

  it('mapea rejected a currentStage "Descartado"', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ stage: 'rejected' }),
    );
    expect(profile.currentStage).toBe('Descartado');
  });
});
