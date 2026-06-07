import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type {
  CreateInterviewFormDTO,
  InterviewForm,
  InterviewFormQuestion,
} from '@ats/shared-types';

import { db } from '../core/firebaseAdmin';

const APPLICATIONS_COLLECTION = 'applications';
const INTERVIEW_FORMS_SUBCOLLECTION = 'interviewForms';

type FirestoreInterviewForm = Omit<InterviewForm, 'submittedAt'> & {
  submittedAt: Timestamp;
};

export type CreateInterviewFormData = CreateInterviewFormDTO & {
  authorUid: string;
  authorName: string;
  authorRole: string;
};

export class InterviewFormsRepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'InterviewFormsRepositoryError';
  }
}

export class InterviewFormsRepository {
  private readonly collection = db.collection(APPLICATIONS_COLLECTION);

  async create(
    applicationId: string,
    data: CreateInterviewFormData,
  ): Promise<{ id: string; submittedAt: Date }> {
    try {
      const ref = this.collection
        .doc(applicationId)
        .collection(INTERVIEW_FORMS_SUBCOLLECTION)
        .doc();

      const cleanData = JSON.parse(
        JSON.stringify(data),
      ) as CreateInterviewFormData;

      await ref.set({
        id: ref.id,
        ...cleanData,
        submittedAt: FieldValue.serverTimestamp(),
      });

      const snapshot = await ref.get();
      const stored = snapshot.data() as FirestoreInterviewForm;

      return {
        id: ref.id,
        submittedAt: stored.submittedAt.toDate(),
      };
    } catch (error) {
      throw new InterviewFormsRepositoryError(
        `No se pudo crear el formulario de entrevista para ${applicationId}.`,
        error,
      );
    }
  }

  async findByApplicationId(applicationId: string): Promise<InterviewForm[]> {
    try {
      const snapshot = await this.collection
        .doc(applicationId)
        .collection(INTERVIEW_FORMS_SUBCOLLECTION)
        .orderBy('submittedAt', 'desc')
        .get();

      return snapshot.docs.map((doc) =>
        this.mapToInterviewForm(doc.data() as FirestoreInterviewForm),
      );
    } catch (error) {
      throw new InterviewFormsRepositoryError(
        `No se pudieron obtener los formularios para ${applicationId}.`,
        error,
      );
    }
  }

  private mapToInterviewForm(data: FirestoreInterviewForm): InterviewForm {
    return {
      ...data,
      questions: data.questions as InterviewFormQuestion[],
      submittedAt: data.submittedAt.toDate(),
    };
  }
}
