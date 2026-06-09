import {
  EMPLOYEE_ROLES,
  type EmployeeRole,
  type GetInterviewFormsResponse,
  type InterviewForm,
  type InterviewFormDTO,
  type InterviewFormType,
  type SaveInterviewFormPayload,
  type SaveInterviewFormResponse,
} from '@ats/shared-types';

import { findNextStageForTrigger } from '@ats/shared-types';
import type { AuthenticatedUser } from '../core/httpAuth';
import { auth } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { InterviewFormsRepository } from '../repositories/interviewFormsRepository';
import {
  ApplicationNotFoundError,
  UpdateApplicationStageService,
} from './updateApplicationService';

export class InterviewFormForbiddenError extends Error {
  constructor() {
    super('No tenés permiso para realizar esta acción.');
    this.name = 'InterviewFormForbiddenError';
  }
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  hr: 'Recursos Humanos',
  tech_lead: 'Líder técnico',
  area_leader: 'Área Líder',
  admin: 'Administrador',
};

export class InterviewFormsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly interviewFormsRepository: InterviewFormsRepository = new InterviewFormsRepository(),
    private readonly updateApplicationStageService: UpdateApplicationStageService = new UpdateApplicationStageService(),
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

    const nextStage = findNextStageForTrigger(
      application.stage,
      'on_interview_submision',
    );
    if (nextStage) {
      await this.updateApplicationStageService.updateStage(
        { applicationId, stage: nextStage },
        caller.uid,
      );
    }

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

    return this.assertCanViewForms(caller.role)
      ? forms.map(this.toInterviewFormDTO)
      : [];
  }

  private assertCanSubmitForm(
    type: InterviewFormType,
    role: EmployeeRole | null,
  ): void {
    if (!role) {
      throw new InterviewFormForbiddenError();
    }

    if (role === EMPLOYEE_ROLES.ADMIN) {
      return;
    }

    if (type === 'hr' && role === EMPLOYEE_ROLES.HR) {
      return;
    }

    if (
      type === 'tech' &&
      (role === EMPLOYEE_ROLES.TECH_LEAD || role === EMPLOYEE_ROLES.AREA_LEADER)
    ) {
      return;
    }

    throw new InterviewFormForbiddenError();
  }

  private assertCanViewForms(role: EmployeeRole | null): boolean {
    return (
      role === EMPLOYEE_ROLES.ADMIN ||
      role === EMPLOYEE_ROLES.HR ||
      role === EMPLOYEE_ROLES.TECH_LEAD ||
      role === EMPLOYEE_ROLES.AREA_LEADER
    );
  }

  private toInterviewFormDTO(form: InterviewForm): InterviewFormDTO {
    return {
      ...form,
      submittedAt: form.submittedAt.toISOString(),
    };
  }
}
