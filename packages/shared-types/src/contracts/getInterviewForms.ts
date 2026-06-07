import type { InterviewForm } from '../models/interviewForm';

export interface GetInterviewFormsPayload {
  applicationId: string;
}

export interface InterviewFormDTO extends Omit<InterviewForm, 'submittedAt'> {
  submittedAt: string;
}

export type GetInterviewFormsResponse = InterviewFormDTO[];
