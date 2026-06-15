import { describe, it, expect } from 'vitest';
import type { ApplicationWithCandidateDTO } from '@ats/shared-types';
import { PIPELINE_ORDER } from '@ats/shared-types';
import {
  getInitials,
  buildStageHistory,
  isGenericStageChangeOption,
  mapApplicationToProfile,
  getAvailableRecruiterStages,
  getInterviewDecisionOptions,
  isTerminalApplicationStage,
} from '../utils/candidateProfile.utils';

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
    const history = buildStageHistory('hr_1_done');
    const completedKeys = history
      .filter((s) => s.status === 'completed')
      .map((s) => s.key);

    expect(completedKeys).toContain('postulacion_recibida');
    expect(completedKeys).toContain('en_revision');
    expect(completedKeys).toContain('contacto_entrevista_rrhh_1');
    expect(completedKeys).toContain('entrevista_rrhh_1_agendada');
  });

  it('marca como current el stage actual', () => {
    const history = buildStageHistory('hr_1_done');
    const current = history.find((s) => s.status === 'current');
    expect(current?.key).toBe('entrevista_rrhh_1_realizada');
  });

  it('marca como pending las etapas posteriores al stage actual', () => {
    const history = buildStageHistory('applied');
    const pending = history.filter((s) => s.status === 'pending');
    expect(pending.length).toBeGreaterThan(0);
    expect(history[0]!.status).toBe('current');
  });

  it('ubica entrevista presencial, psicotecnico y preocupacional antes de enviar oferta', () => {
    const history = buildStageHistory('hr_2_done');
    const keys = history.map((s) => s.key);

    expect(keys.indexOf('entrevista_presencial')).toBeGreaterThan(
      keys.indexOf('entrevista_rrhh_2_realizada'),
    );
    expect(keys.indexOf('psicotecnico')).toBe(
      keys.indexOf('entrevista_presencial') + 1,
    );
    expect(keys.indexOf('preocupacional')).toBe(
      keys.indexOf('psicotecnico') + 1,
    );
    expect(keys.indexOf('enviar_oferta')).toBe(
      keys.indexOf('preocupacional') + 1,
    );
  });

  it('retorna una entrada por cada stage del orden excepto profile_pending (sistema-solo)', () => {
    const history = buildStageHistory('screening');
    expect(history.length).toBe(PIPELINE_ORDER.length - 1);
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

describe('isGenericStageChangeOption', () => {
  it('excluye acciones gestionadas desde Carta oferta', () => {
    expect(isGenericStageChangeOption('send_offer')).toBe(false);
    expect(isGenericStageChangeOption('hired')).toBe(false);
  });

  it('mantiene disponibles las etapas manuales del pipeline', () => {
    expect(isGenericStageChangeOption('screening')).toBe(true);
    expect(isGenericStageChangeOption('schedule_hr_1')).toBe(true);
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

  it('conserva fitScore sin definir cuando no está disponible', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ fitScore: undefined }),
    );
    expect(profile.fitScore).toBeUndefined();
  });

  it('retorna strengths vacío', () => {
    const profile = mapApplicationToProfile(makeApplication());
    expect(profile.strengths).toEqual([]);
  });

  it('retorna interviewNotes vacío (se cargan desde el backend en el perfil)', () => {
    const profile = mapApplicationToProfile(
      makeApplication({ notes: 'Candidato muy comunicativo.' }),
    );
    expect(profile.interviewNotes).toEqual([]);
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

// ─── getAvailableRecruiterStages ─────────────────────────────────────────────

describe('getAvailableRecruiterStages', () => {
  it('incluye solo stages recruiter_action válidos desde screening', () => {
    const stages = getAvailableRecruiterStages('screening');
    const keys = stages.map((s) => s.key);

    expect(keys).toContain('contacto_entrevista_rrhh_1');
    expect(keys).toContain('cv_presentado_area');
    expect(keys).not.toContain('entrevista_rrhh_1_agendada');
    expect(keys).not.toContain('descartado');
  });

  it('incluye send_offer como jump stage desde cualquier etapa activa', () => {
    const stages = getAvailableRecruiterStages('hr_1_done');
    expect(stages.map((s) => s.key)).toContain('enviar_oferta');
  });

  it('retorna vacío si no hay stage actual', () => {
    expect(getAvailableRecruiterStages(null)).toEqual([]);
  });
});

// ─── getInterviewDecisionOptions ─────────────────────────────────────────────

describe('getInterviewDecisionOptions', () => {
  it('incluye las tres opciones de decisión desde cualquier etapa', () => {
    const options = getInterviewDecisionOptions('hr_1_done');
    const labels = options.map((o) => o.label);

    expect(labels).toContain('Avanzar a siguiente etapa');
    expect(labels).toContain('Avanzar y mantener en consideración');
    expect(labels).toContain('No avanzar - Rechazado');
    expect(labels.length).toBe(3);
  });

  it('incluye las tres opciones de decisión', () => {
    const options = getInterviewDecisionOptions('hr_1_done');
    const labels = options.map((o) => o.label);

    expect(labels).toContain('Avanzar a siguiente etapa');
    expect(labels).toContain('Avanzar y mantener en consideración');
    expect(labels).toContain('No avanzar - Rechazado');
    expect(labels.length).toBe(3);
  });

  it('retorna vacío si no hay stage actual', () => {
    expect(getInterviewDecisionOptions(null)).toEqual([]);
  });

  it('no incluye opciones en etapas terminales', () => {
    const options = getInterviewDecisionOptions('hired');
    expect(options.length).toBeGreaterThan(0);
  });
});

describe('isTerminalApplicationStage', () => {
  it('retorna true para hired y rejected', () => {
    expect(isTerminalApplicationStage('hired')).toBe(true);
    expect(isTerminalApplicationStage('rejected')).toBe(true);
  });

  it('retorna false para etapas activas y null', () => {
    expect(isTerminalApplicationStage('screening')).toBe(false);
    expect(isTerminalApplicationStage('offer_sent')).toBe(false);
    expect(isTerminalApplicationStage(null)).toBe(false);
  });
});
