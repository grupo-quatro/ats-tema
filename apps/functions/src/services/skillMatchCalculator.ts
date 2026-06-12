/**
 * Módulo de cálculo puro de match de skills.
 * No tiene dependencias de Firestore ni de firebase-admin.
 * Diseñado para ser 100 % testeable con vitest sin mocks ni emuladores.
 */

import type { Skill, SkillType } from '@ats/shared-types';
import type { SkillMatchDetail } from '@ats/shared-types';
import { getSkillComparisonKeys } from './skillNormalizer';

// ─── Tipos exportados ─────────────────────────────────────────────────────────

/** Resultado del cálculo de match, sin el timestamp (lo agrega la capa de servicio). */
export interface SkillMatchResult {
  scoreTotal: number;
  scoreMandatory: number;
  scoreDesirable: number;
  tieneTodosLosMandatorios: boolean;
  skillsCoincidentes: SkillMatchDetail[];
  skillsFaltantes: SkillMatchDetail[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte el array de skills del candidato (string[]) a un Set de claves
 * normalizadas y compactas.
 * Filtra valores no-string y cadenas vacías de forma defensiva.
 */
export function buildCandidateSkillSet(rawSkills: unknown[]): Set<string> {
  const skillKeys = new Set<string>();

  for (const skill of rawSkills) {
    if (typeof skill !== 'string' || skill.trim().length === 0) continue;
    getSkillComparisonKeys(skill).forEach((key) => skillKeys.add(key));
  }

  return skillKeys;
}

/**
 * Parsea el array `job.skills` desde Firestore de forma defensiva.
 * Soporta el modelo actual (Skill[]) y datos legacy (string[]).
 *
 * Datos legacy → weight=1, type='desirable'.
 */
export function parseJobSkills(rawSkills: unknown[]): Skill[] {
  return rawSkills.reduce<Skill[]>((acc, s) => {
    if (typeof s === 'string' && s.trim().length > 0) {
      acc.push({
        name: s.trim(),
        weight: 1,
        type: 'desirable',
      });
    } else if (s && typeof s === 'object' && 'name' in s) {
      const raw = s as Record<string, unknown>;
      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      if (name.length > 0) {
        acc.push({
          name,
          weight:
            typeof raw.weight === 'number' && raw.weight > 0 ? raw.weight : 1,
          type:
            raw.type === 'mandatory' || raw.type === 'desirable'
              ? (raw.type as SkillType)
              : 'desirable',
        });
      }
    }
    return acc;
  }, []);
}

/** Redondea a dos decimales sin floating-point drift. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Algoritmo ponderado ──────────────────────────────────────────────────────

/**
 * Calcula el match ponderado entre las skills de un candidato y los
 * requisitos de un puesto.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  MODELO MATEMÁTICO                                                       │
 * │                                                                          │
 * │  Sea S = conjunto de skills del puesto                                   │
 * │      w_i   = weight de la skill i  (positivo)                           │
 * │      m_i   = 1 si el candidato tiene la skill i, 0 si no               │
 * │      M ⊆ S = skills de tipo 'mandatory'                                 │
 * │      D ⊆ S = skills de tipo 'desirable'                                 │
 * │                                                                          │
 * │  scoreTotal     = (Σ w_i · m_i)       / (Σ w_i)       · 100            │
 * │  scoreMandatory = (Σ w_i · m_i | M)   / (Σ w_i | M)   · 100            │
 * │  scoreDesirable = (Σ w_i · m_i | D)   / (Σ w_i | D)   · 100            │
 * │                                                                          │
 * │  Casos borde:                                                            │
 * │  • sin skills en el puesto      → scoreTotal = 0 (convención interna)   │
 * │  • sin mandatory                → scoreMandatory = 100 (vacío = cumple) │
 * │  • sin desirable                → scoreDesirable = 0                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function computeWeightedMatch(
  jobSkills: Skill[],
  candidateSkillSet: Set<string>,
): SkillMatchResult {
  let totalWeight = 0;
  let matchedWeight = 0;
  let mandatoryTotalWeight = 0;
  let mandatoryMatchedWeight = 0;
  let desirableTotalWeight = 0;
  let desirableMatchedWeight = 0;

  const skillsCoincidentes: SkillMatchDetail[] = [];
  const skillsFaltantes: SkillMatchDetail[] = [];

  for (const skill of jobSkills) {
    const isMatched = getSkillComparisonKeys(skill.name).some((key) =>
      candidateSkillSet.has(key),
    );
    const detail: SkillMatchDetail = {
      name: skill.name,
      weight: skill.weight,
      type: skill.type,
    };

    totalWeight += skill.weight;
    if (isMatched) matchedWeight += skill.weight;

    if (skill.type === 'mandatory') {
      mandatoryTotalWeight += skill.weight;
      if (isMatched) mandatoryMatchedWeight += skill.weight;
    } else {
      desirableTotalWeight += skill.weight;
      if (isMatched) desirableMatchedWeight += skill.weight;
    }

    (isMatched ? skillsCoincidentes : skillsFaltantes).push(detail);
  }

  // Ordenar coincidentes: weight DESC
  skillsCoincidentes.sort((a, b) => b.weight - a.weight);

  // Ordenar faltantes: mandatory primero, luego desirable; dentro de cada grupo weight DESC
  skillsFaltantes.sort((a, b) => {
    if (a.type === b.type) return b.weight - a.weight;
    return a.type === 'mandatory' ? -1 : 1;
  });

  const scoreTotal =
    totalWeight === 0 ? 0 : round2((matchedWeight / totalWeight) * 100);

  const scoreMandatory =
    mandatoryTotalWeight === 0
      ? 100
      : round2((mandatoryMatchedWeight / mandatoryTotalWeight) * 100);

  const scoreDesirable =
    desirableTotalWeight === 0
      ? 0
      : round2((desirableMatchedWeight / desirableTotalWeight) * 100);

  return {
    scoreTotal,
    scoreMandatory,
    scoreDesirable,
    tieneTodosLosMandatorios: scoreMandatory === 100,
    skillsCoincidentes,
    skillsFaltantes,
  };
}
