import { STAGE_CONFIG } from '@ats/shared-types';
import type { ApplicationStage } from '@ats/shared-types';

export const STAGE_LABELS = Object.fromEntries(
  Object.entries(STAGE_CONFIG).map(([s, c]) => [s, c.label]),
) as Record<ApplicationStage, string>;
