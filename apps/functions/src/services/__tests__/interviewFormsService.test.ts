import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Application, InterviewForm } from '@ats/shared-types';
import {
  InterviewFormForbiddenError,
  InterviewFormsService,
} from '../interviewFormsService';
import { ApplicationNotFoundError } from '../updateApplicationService';

vi.mock('../../core/firebaseAdmin', () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      displayName: 'Laura Fernández',
      email: 'laura@example.com',
    }),
  },
  db: {
    collection: vi.fn().mockReturnValue({}),
  },
}));

const makeApplication = (): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  stage: 'applied',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  stageUpdatedAt: new Date(),
});

const makeForm = (overrides: Partial<InterviewForm> = {}): InterviewForm => ({
  id: 'form-1',
  applicationId: 'app-1',
  type: 'hr',
  title: 'Evaluación RRHH',
  authorUid: 'uid-hr',
  authorName: 'Laura',
  authorRole: 'Recursos Humanos',
  submittedAt: new Date('2026-04-02T10:30:00.000Z'),
  questions: [{ id: 'q1', question: 'Comunicación', answer: 'Buena' }],
  ...overrides,
});

const mockAppsRepo = {
  findById: vi.fn(),
};

const mockFormsRepo = {
  create: vi.fn(),
  findByApplicationId: vi.fn(),
};

const mockUpdateStageService = {
  updateStage: vi.fn(),
};

describe('InterviewFormsService.saveInterviewForm', () => {
  let service: InterviewFormsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppsRepo.findById.mockResolvedValue(makeApplication());
    mockFormsRepo.create.mockResolvedValue({
      id: 'form-new',
      submittedAt: new Date('2026-05-01T12:00:00.000Z'),
    });
    service = new InterviewFormsService(
      mockAppsRepo as never,
      mockFormsRepo as never,
      mockUpdateStageService as never,
    );
  });

  it('guarda formulario HR cuando el rol es hr', async () => {
    const result = await service.saveInterviewForm(
      {
        applicationId: 'app-1',
        type: 'hr',
        title: 'Evaluación RRHH',
        overallRating: 4,
        decision: 'Avanzar',
        questions: [{ question: 'Comunicación', answer: 'Buena', rating: 4 }],
      },
      { uid: 'uid-hr', role: 'hr' },
    );

    expect(result.id).toBe('form-new');
    expect(mockFormsRepo.create).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({
        type: 'hr',
        authorUid: 'uid-hr',
        questions: [
          { id: 'q1', question: 'Comunicación', answer: 'Buena', rating: 4 },
        ],
      }),
    );
  });

  it('guarda formulario tech cuando el rol es tech_lead', async () => {
    await service.saveInterviewForm(
      {
        applicationId: 'app-1',
        type: 'tech',
        title: 'Evaluación técnica',
        overallRating: 5,
        decision: 'Avanzar',
        questions: [{ question: 'React', answer: 'Sólido', rating: 5 }],
      },
      { uid: 'uid-tech', role: 'tech_lead' },
    );

    expect(mockFormsRepo.create).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({ type: 'tech' }),
    );
  });

  it('lanza ApplicationNotFoundError cuando la postulación no existe', async () => {
    mockAppsRepo.findById.mockResolvedValue(null);

    await expect(
      service.saveInterviewForm(
        {
          applicationId: 'missing',
          type: 'hr',
          title: 'Evaluación',
          overallRating: 4,
          decision: 'Avanzar',
          questions: [{ question: 'Q', answer: 'A' }],
        },
        { uid: 'uid-hr', role: 'hr' },
      ),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it('lanza InterviewFormForbiddenError cuando hr intenta guardar tech', async () => {
    await expect(
      service.saveInterviewForm(
        {
          applicationId: 'app-1',
          type: 'tech',
          title: 'Evaluación técnica',
          overallRating: 4,
          decision: 'Avanzar',
          questions: [{ question: 'React', answer: 'Sólido' }],
        },
        { uid: 'uid-hr', role: 'hr' },
      ),
    ).rejects.toThrow(InterviewFormForbiddenError);
  });

  it('lanza InterviewFormForbiddenError cuando tech_lead intenta guardar hr', async () => {
    await expect(
      service.saveInterviewForm(
        {
          applicationId: 'app-1',
          type: 'hr',
          title: 'Evaluación RRHH',
          overallRating: 4,
          decision: 'Avanzar',
          questions: [{ question: 'Comunicación', answer: 'Buena' }],
        },
        { uid: 'uid-tech', role: 'tech_lead' },
      ),
    ).rejects.toThrow(InterviewFormForbiddenError);
  });
});

describe('InterviewFormsService.getInterviewForms', () => {
  let service: InterviewFormsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppsRepo.findById.mockResolvedValue(makeApplication());
    mockFormsRepo.findByApplicationId.mockResolvedValue([
      makeForm({ type: 'hr', id: 'form-hr' }),
      makeForm({
        type: 'tech',
        id: 'form-tech',
        title: 'Evaluación técnica',
      }),
    ]);
    service = new InterviewFormsService(
      mockAppsRepo as never,
      mockFormsRepo as never,
      mockUpdateStageService as never,
    );
  });

  it('admin ve todos los formularios', async () => {
    const result = await service.getInterviewForms('app-1', {
      uid: 'uid-admin',
      role: 'admin',
    });

    expect(result).toHaveLength(2);
  });

  it('hr ve todos los formularios', async () => {
    const result = await service.getInterviewForms('app-1', {
      uid: 'uid-hr',
      role: 'hr',
    });

    expect(result).toHaveLength(2);
  });

  it('tech_lead ve todos los formularios', async () => {
    const result = await service.getInterviewForms('app-1', {
      uid: 'uid-tech',
      role: 'tech_lead',
    });

    expect(result).toHaveLength(2);
  });

  it('retorna submittedAt como ISO string', async () => {
    const result = await service.getInterviewForms('app-1', {
      uid: 'uid-hr',
      role: 'hr',
    });

    expect(result[0]?.submittedAt).toBe('2026-04-02T10:30:00.000Z');
  });
});
