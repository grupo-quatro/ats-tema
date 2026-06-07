import { describe, expect, it } from 'vitest';

import {
  calculateApproximateYearsOfExperience,
  formatEducationSummary,
  hasDateRangeErrors,
  normalizeDateForInput,
  normalizeTechnicalSkills,
  validateProfileDateRanges,
} from '../manualCandidateForm.utils';

describe('manualCandidateForm.utils', () => {
  it('deduplica habilidades equivalentes por formato sin imponer aliases de dominio', () => {
    expect(
      normalizeTechnicalSkills(
        'Project Management, project-management, PowerBI, Power BI, Node.js, node js',
      ),
    ).toEqual(['Project Management', 'PowerBI', 'Node.js']);
  });

  it('normaliza fechas del parser a valores compatibles con input date', () => {
    expect(normalizeDateForInput('Mar 2020')).toBe('2020-03-01');
    expect(normalizeDateForInput('2024')).toBe('2024-01-01');
    expect(normalizeDateForInput('2024-06')).toBe('2024-06-01');
    expect(normalizeDateForInput('Presente')).toBe('');
  });

  it('valida que fecha desde sea anterior a fecha hasta', () => {
    const errors = validateProfileDateRanges(
      [{ role: 'Dev', startDate: '2025-01-01', endDate: '2024-01-01' }],
      [{ degree: 'Analista', endDate: '2026-01-01' }],
    );

    expect(hasDateRangeErrors(errors)).toBe(true);
    expect(errors.experiences[0]).toBe(
      'La fecha desde debe ser anterior a la fecha hasta.',
    );
    expect(errors.educations[0]).toBe('Completá la fecha desde.');
  });

  it('calcula experiencia aproximada sin duplicar rangos solapados', () => {
    const years = calculateApproximateYearsOfExperience(
      [
        {
          role: 'Dev',
          startDate: '2020-01-01',
          endDate: '2022-01-01',
        },
        {
          role: 'Backend Dev',
          startDate: '2021-01-01',
          endDate: '2023-01-01',
        },
      ],
      new Date('2026-01-01T00:00:00'),
    );

    expect(years).toBe(3);
  });

  it('deriva el resumen education desde la primera educacion cargada', () => {
    expect(
      formatEducationSummary([
        {
          degree: 'Analista de Sistemas',
          institution: 'ORT Argentina',
          startDate: '2023-01-01',
        },
      ]),
    ).toBe('Analista de Sistemas, ORT Argentina');
  });
});
