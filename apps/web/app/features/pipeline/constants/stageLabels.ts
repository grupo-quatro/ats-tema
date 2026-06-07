import { STAGE_CONFIG } from '@ats/shared-types';
import type { ApplicationStage } from '@ats/shared-types';

export type VisibleApplicationStage = Exclude<
  ApplicationStage,
  'profile_pending'
>;

export const STAGE_LABELS = Object.fromEntries(
  Object.entries(STAGE_CONFIG).map(([s, c]) => [s, c.label]),
) as Record<ApplicationStage, string>;

export const VISIBLE_STAGE_LABELS = Object.fromEntries(
  Object.entries(STAGE_CONFIG)
    .filter(([s]) => s !== 'profile_pending')
    .map(([s, c]) => [s, c.label]),
) as Record<VisibleApplicationStage, string>;

export function isVisibleApplicationStage(
  stage: ApplicationStage,
): stage is VisibleApplicationStage {
  return stage !== 'profile_pending';
}

export function getStageLabel(stage: ApplicationStage): string {
  return STAGE_LABELS[stage] ?? 'Etapa no disponible';
}
