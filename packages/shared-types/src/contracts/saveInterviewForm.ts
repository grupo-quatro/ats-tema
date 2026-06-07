import type { InterviewFormType } from '../models/interviewForm';

export interface SaveInterviewFormQuestionInput {
  question: string;
  answer: string;
  rating?: number;
}

export interface SaveInterviewFormPayload {
  applicationId: string;
  type: InterviewFormType;
  title: string;
  overallRating: number;
  decision: string;
  questions: SaveInterviewFormQuestionInput[];
}

export interface SaveInterviewFormResponse {
  id: string;
  submittedAt: string;
}
