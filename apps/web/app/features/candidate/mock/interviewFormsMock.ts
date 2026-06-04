import type { InterviewFormDTO } from '@ats/shared-types';
import { getInterviewForms } from '../../../shared/api/interviewFormsApi';

export type InterviewFormType = InterviewFormDTO['type'];
export type InterviewFormResponse = InterviewFormDTO;

/**
 * Delega al backend. El filtrado por rol ocurre en el servicio.
 */
export async function fetchInterviewFormResponses(
  applicationId: string,
): Promise<InterviewFormResponse[]> {
  return getInterviewForms(applicationId);
}
