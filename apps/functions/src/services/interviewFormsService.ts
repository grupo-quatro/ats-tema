import type {
  EmployeeRole,
  GetInterviewFormsResponse,
  InterviewForm,
  InterviewFormDTO,
  InterviewFormType,
  SaveInterviewFormPayload,
  SaveInterviewFormResponse,
} from '@ats/shared-types';

import type { AuthenticatedUser } from '../core/httpAuth';
import { auth } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { InterviewFormsRepository } from '../repositories/interviewFormsRepository';
import { ApplicationNotFoundError } from './updateApplicationService';

export class InterviewFormForbiddenError extends Error {
  constructor() {
    super('No tenés permiso para realizar esta acción.');
    this.name = 'InterviewFormForbiddenError';
  }
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  hr: 'Recursos Humanos',
  tech_lead: 'Líder técnico',
  hiring_manager: 'Hiring Manager',
  admin: 'Administrador',
};

export class InterviewFormsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly interviewFormsRepository: InterviewFormsRepository = new InterviewFormsRepository(),
  ) {}

  async saveInterviewForm(
    payload: SaveInterviewFormPayload,
    caller: AuthenticatedUser,
  ): Promise<SaveInterviewFormResponse> {
    const { applicationId, type } = payload;

    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    this.assertCanSubmitForm(type, caller.role);

    const userRecord = await auth.getUser(caller.uid).catch(() => null);
    const authorName =
      userRecord?.displayName ?? userRecord?.email ?? caller.uid;
    const authorRole = caller.role ? ROLE_LABELS[caller.role] : 'Usuario';

    const questions = payload.questions.map((item, index) => ({
      id: `q${index + 1}`,
      question: item.question.trim(),
      answer: item.answer.trim(),
      ...(item.rating !== undefined && { rating: item.rating }),
    }));

    const { id, submittedAt } = await this.interviewFormsRepository.create(
      applicationId,
      {
        applicationId,
        type: payload.type,
        title: payload.title.trim(),
        ...(payload.overallRating !== undefined && {
          overallRating: payload.overallRating,
        }),
        ...(payload.decision !== undefined && {
          decision: payload.decision.trim(),
        }),
        questions,
        authorUid: caller.uid,
        authorName,
        authorRole,
      },
    );

    return {
      id,
      submittedAt: submittedAt.toISOString(),
    };
  }

  async getInterviewForms(
    applicationId: string,
    caller: AuthenticatedUser,
  ): Promise<GetInterviewFormsResponse> {
    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    const forms =
      await this.interviewFormsRepository.findByApplicationId(applicationId);

    return this.filterByRole(forms, caller.role).map(this.toInterviewFormDTO);
  }

  private assertCanSubmitForm(
    type: InterviewFormType,
    role: EmployeeRole | null,
  ): void {
    if (!role) {
      throw new InterviewFormForbiddenError();
    }

    if (role === 'admin') {
      return;
    }

    if (type === 'hr' && role === 'hr') {
      return;
    }

    if (
      type === 'tech' &&
      (role === 'tech_lead' || role === 'hiring_manager')
    ) {
      return;
    }

    throw new InterviewFormForbiddenError();
  }

  private filterByRole(
    forms: InterviewForm[],
    role: EmployeeRole | null,
  ): InterviewForm[] {
    if (!role) return [];
    if (role === 'admin') return forms;
    if (role === 'hr') return forms.filter((f) => f.type === 'hr');
    if (role === 'tech_lead' || role === 'hiring_manager') {
      return forms.filter((f) => f.type === 'tech');
    }
    return [];
  }

  private toInterviewFormDTO(form: InterviewForm): InterviewFormDTO {
    return {
      ...form,
      submittedAt: form.submittedAt.toISOString(),
    };
  }
}
