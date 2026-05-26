// branch: fb-50-57
import type { SkillType } from './job';

/**
 * Detalle de una skill individual dentro del resultado de match.
 * Se usa tanto para coincidentes como para faltantes.
 */
export interface SkillMatchDetail {
  /** Nombre normalizado de la skill (lowercase). */
  name: string;
  /** Peso relativo de la skill dentro del puesto (tal como viene de Job.skills.weight). */
  weight: number;
  /** Tipo de skill del puesto: obligatoria o deseable. */
  type: SkillType;
}

/**
 * Resultado completo del análisis de match de skills entre un candidato
 * y los requisitos de un puesto.
 *
 * Persiste en el documento `applications/{id}` bajo el campo `skillMatchStats`.
 * También se expone al frontend a través de ApplicationWithCandidateDTO.
 */
export interface SkillMatchStats {
  /**
   * Score ponderado global (0–100).
   *
   * Fórmula:
   *   scoreTotal = (Σ weight_i * matched_i) / (Σ weight_i) * 100
   *
   * Es el número principal para ordenar y mostrar la barra de progreso
   * en el listado de candidatos.
   */
  scoreTotal: number;

  /**
   * Score ponderado considerando únicamente las skills obligatorias (0–100).
   *
   * Fórmula:
   *   scoreMandatory = (Σ weight_i * matched_i | type='mandatory')
   *                  / (Σ weight_i | type='mandatory') * 100
   *
   * Si el puesto no tiene skills obligatorias, vale 100 por convención.
   */
  scoreMandatory: number;

  /**
   * Score ponderado considerando únicamente las skills deseables (0–100).
   *
   * Si el puesto no tiene skills deseables, vale 0 por convención
   * (no aportan peso al cálculo).
   */
  scoreDesirable: number;

  /**
   * true si el candidato tiene el 100 % de las skills de tipo 'mandatory'.
   * Sirve para filtrado duro en el frontend (excluir candidatos que no
   * cumplen los requisitos mínimos) antes de ordenar por scoreTotal.
   */
  tieneTodosLosMandatorios: boolean;

  /** Skills del puesto que el candidato tiene. Ordenadas por weight DESC. */
  skillsCoincidentes: SkillMatchDetail[];

  /**
   * Skills del puesto que el candidato NO tiene.
   * Las de tipo 'mandatory' se muestran como gaps críticos en el frontend.
   * Ordenadas: primero mandatory, luego desirable; dentro de cada grupo, weight DESC.
   */
  skillsFaltantes: SkillMatchDetail[];

  /** Timestamp (ISO string en el cliente) de cuándo se calculó el match. */
  actualizadoEn: Date;
}
