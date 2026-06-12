export interface NormalizedSkill {
  originalName: string;
  normalizedKey: string;
  compactKey: string;
}

/**
 * Genera claves de comparación agnósticas al dominio sin alterar el valor
 * original. Los caracteres + y # se conservan porque distinguen skills como
 * C, C++ y C#.
 */
export function normalizeSkill(name: string): NormalizedSkill {
  const originalName = name.trim();
  const normalizedKey = originalName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  return {
    originalName,
    normalizedKey,
    compactKey: normalizedKey.replace(/\s+/g, ''),
  };
}

/** Devuelve las claves exactas y no vacías usadas durante el matching. */
export function getSkillComparisonKeys(name: string): string[] {
  const { normalizedKey, compactKey } = normalizeSkill(name);
  return [...new Set([normalizedKey, compactKey].filter(Boolean))];
}
