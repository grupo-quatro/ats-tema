export type InterviewFormType = 'hr' | 'tech';

export interface InterviewFormQuestion {
  id: string;
  question: string;
  answer: string;
  rating?: number;
}

export interface InterviewForm {
  id: string;
  applicationId: string;
  type: InterviewFormType;
  title: string;
  authorUid: string;
  authorName: string;
  authorRole: string;
  submittedAt: Date;
  overallRating?: number;
  decision?: string;
  questions: InterviewFormQuestion[];
}

export type CreateInterviewFormDTO = Omit<
  InterviewForm,
  'id' | 'submittedAt' | 'authorUid' | 'authorName' | 'authorRole'
>;
