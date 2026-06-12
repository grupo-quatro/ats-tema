import { describe, expect, it } from 'vitest';
import type { Skill } from '@ats/shared-types';

import {
  buildCandidateSkillSet,
  computeWeightedMatch,
  parseJobSkills,
} from '../skillMatchCalculator';

const mandatorySkill = (name: string): Skill => ({
  name,
  weight: 1,
  type: 'mandatory',
});

const skill = (name: string, weight: number, type: Skill['type']): Skill => ({
  name,
  weight,
  type,
});

describe('skillMatchCalculator normalizado', () => {
  it.each([
    ['Node.js', 'NodeJS'],
    ['Node JS', 'node-js'],
    ['Power BI', 'PowerBI'],
    ['Social Media', 'social-media'],
    ['B2B Sales', 'B2B_Sales'],
    ['Análisis de datos', 'Analisis de Datos'],
  ])('reconoce %s y %s como la misma skill', (jobSkill, candidateSkill) => {
    const result = computeWeightedMatch(
      [mandatorySkill(jobSkill)],
      buildCandidateSkillSet([candidateSkill]),
    );

    expect(result.scoreTotal).toBe(100);
    expect(result.skillsCoincidentes).toEqual([
      expect.objectContaining({ name: jobSkill }),
    ]);
  });

  it.each([
    ['Java', 'JavaScript'],
    ['C', 'C++'],
    ['C++', 'C#'],
    ['Marketing', 'Marketing Digital'],
    ['Ventas', 'Ventas B2B'],
    ['PostgreSQL', 'Postgres'],
    ['AWS', 'Amazon Web Services'],
  ])('no relaciona semánticamente %s y %s', (jobSkill, candidateSkill) => {
    const result = computeWeightedMatch(
      [mandatorySkill(jobSkill)],
      buildCandidateSkillSet([candidateSkill]),
    );

    expect(result.scoreTotal).toBe(0);
    expect(result.skillsFaltantes).toEqual([
      expect.objectContaining({ name: jobSkill }),
    ]);
  });

  it('ignora valores inválidos sin bloquear el cálculo', () => {
    const candidateSkillSet = buildCandidateSkillSet([
      null,
      undefined,
      42,
      '',
      ' .-_ ',
      'Herramienta Interna ABC',
    ]);

    expect(
      computeWeightedMatch(
        [mandatorySkill('herramienta-interna_abc')],
        candidateSkillSet,
      ).scoreTotal,
    ).toBe(100);
  });

  it('ignora yearsOfExperience de skills históricas', () => {
    expect(
      parseJobSkills([
        {
          name: 'React',
          yearsOfExperience: 3,
          weight: 5,
          type: 'mandatory',
        },
      ]),
    ).toEqual([{ name: 'React', weight: 5, type: 'mandatory' }]);
  });
});

describe('skillMatchCalculator ponderado', () => {
  it('calcula scores total, obligatorio y deseable según los pesos', () => {
    const result = computeWeightedMatch(
      [
        skill('React', 5, 'mandatory'),
        skill('TypeScript', 3, 'mandatory'),
        skill('Docker', 2, 'desirable'),
      ],
      buildCandidateSkillSet(['React', 'Docker']),
    );

    expect(result).toMatchObject({
      scoreTotal: 70,
      scoreMandatory: 62.5,
      scoreDesirable: 100,
      tieneTodosLosMandatorios: false,
    });
  });

  it('reserva score 0 para un cálculo válido sin coincidencias', () => {
    const result = computeWeightedMatch(
      [skill('React', 5, 'mandatory')],
      buildCandidateSkillSet([]),
    );

    expect(result).toMatchObject({
      scoreTotal: 0,
      scoreMandatory: 0,
      scoreDesirable: 0,
      tieneTodosLosMandatorios: false,
    });
  });

  it('considera cumplidos los obligatorios cuando la posición no tiene ninguno', () => {
    const result = computeWeightedMatch(
      [skill('Docker', 2, 'desirable')],
      buildCandidateSkillSet([]),
    );

    expect(result.scoreMandatory).toBe(100);
    expect(result.tieneTodosLosMandatorios).toBe(true);
  });

  it('ordena coincidencias por peso y faltantes por tipo y peso', () => {
    const result = computeWeightedMatch(
      [
        skill('React', 3, 'mandatory'),
        skill('TypeScript', 5, 'mandatory'),
        skill('Docker', 4, 'desirable'),
        skill('AWS', 2, 'desirable'),
      ],
      buildCandidateSkillSet(['React', 'AWS']),
    );

    expect(result.skillsCoincidentes.map(({ name }) => name)).toEqual([
      'React',
      'AWS',
    ]);
    expect(result.skillsFaltantes.map(({ name }) => name)).toEqual([
      'TypeScript',
      'Docker',
    ]);
  });
});
