import { describe, expect, it } from 'vitest';

import { getSkillComparisonKeys, normalizeSkill } from '../skillNormalizer';

describe('skillNormalizer', () => {
  it.each([
    ['Node.js', 'node js', 'nodejs'],
    ['  Power--BI  ', 'power bi', 'powerbi'],
    ['B2B_Sales', 'b2b sales', 'b2bsales'],
    ['Análisis de Datos', 'analisis de datos', 'analisisdedatos'],
  ])('normaliza formato de %s', (originalName, normalizedKey, compactKey) => {
    expect(normalizeSkill(originalName)).toEqual({
      originalName: originalName.trim(),
      normalizedKey,
      compactKey,
    });
  });

  it.each([
    ['C', ['c']],
    ['C++', ['c++']],
    ['C#', ['c#']],
  ])('conserva caracteres significativos de %s', (skill, expectedKeys) => {
    expect(getSkillComparisonKeys(skill)).toEqual(expectedKeys);
  });

  it('no genera claves vacías', () => {
    expect(getSkillComparisonKeys(' .-_ ')).toEqual([]);
  });
});
