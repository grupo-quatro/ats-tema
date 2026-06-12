import { describe, expect, it } from 'vitest';
import type { Skill } from '@ats/shared-types';

import {
  buildCandidateSkillSet,
  computeWeightedMatch,
} from '../skillMatchCalculator';

const mandatorySkill = (name: string): Skill => ({
  name,
  yearsOfExperience: 0,
  weight: 1,
  type: 'mandatory',
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
});
