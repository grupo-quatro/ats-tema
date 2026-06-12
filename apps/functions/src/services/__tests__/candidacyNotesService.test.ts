import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EMPLOYEE_ROLES,
  type Application,
  type CandidacyNote,
} from '@ats/shared-types';
import {
  CandidacyNoteForbiddenError,
  CandidacyNoteNotFoundError,
  CandidacyNoteTerminalStageError,
  CandidacyNotesService,
} from '../candidacyNotesService';
import { ApplicationNotFoundError } from '../updateApplicationService';

vi.mock('../../core/firebaseAdmin', () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      displayName: 'Laura Fernández',
      email: 'laura@example.com',
    }),
  },
}));

const makeApplication = (
  overrides: Partial<Application> = {},
): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  stage: 'applied',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  stageUpdatedAt: new Date(),
  ...overrides,
});

const makeNote = (overrides: Partial<CandidacyNote> = {}): CandidacyNote => ({
  id: 'note-1',
  applicationId: 'app-1',
  text: 'Nota original',
  source: 'manual',
  authorUid: 'uid-hr',
  authorName: 'Laura',
  authorRole: 'Recursos Humanos',
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  updatedAt: new Date('2026-05-01T10:00:00.000Z'),
  ...overrides,
});

const mockAppsRepo = { findById: vi.fn() };
const mockNotesRepo = {
  create: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
  findByApplicationId: vi.fn(),
};

describe('CandidacyNotesService.saveCandidacyNote', () => {
  let service: CandidacyNotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppsRepo.findById.mockResolvedValue(makeApplication());
    mockNotesRepo.create.mockResolvedValue(makeNote({ id: 'note-new' }));
    service = new CandidacyNotesService(
      mockAppsRepo as never,
      mockNotesRepo as never,
    );
  });

  it('crea una nota nueva', async () => {
    const result = await service.saveCandidacyNote(
      { applicationId: 'app-1', text: 'Nueva nota' },
      { uid: 'uid-hr', role: EMPLOYEE_ROLES.HR },
    );

    expect(result.id).toBe('note-new');
    expect(mockNotesRepo.create).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({ source: 'manual' }),
    );
    expect(mockNotesRepo.update).not.toHaveBeenCalled();
  });

  it('lanza ApplicationNotFoundError si la postulación no existe', async () => {
    mockAppsRepo.findById.mockResolvedValue(null);

    await expect(
      service.saveCandidacyNote(
        { applicationId: 'missing', text: 'Nota' },
        { uid: 'uid-hr', role: EMPLOYEE_ROLES.HR },
      ),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it('lanza CandidacyNoteTerminalStageError si el candidato está contratado', async () => {
    mockAppsRepo.findById.mockResolvedValue(
      makeApplication({ stage: 'hired' }),
    );

    await expect(
      service.saveCandidacyNote(
        { applicationId: 'app-1', text: 'Nota' },
        { uid: 'uid-hr', role: 'hr' },
      ),
    ).rejects.toThrow(CandidacyNoteTerminalStageError);
  });

  it('lanza CandidacyNoteTerminalStageError si el candidato está rechazado', async () => {
    mockAppsRepo.findById.mockResolvedValue(
      makeApplication({ stage: 'rejected' }),
    );

    await expect(
      service.saveCandidacyNote(
        { applicationId: 'app-1', text: 'Nota' },
        { uid: 'uid-hr', role: 'hr' },
      ),
    ).rejects.toThrow(CandidacyNoteTerminalStageError);
  });
});

describe('CandidacyNotesService.updateCandidacyNote', () => {
  let service: CandidacyNotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppsRepo.findById.mockResolvedValue(makeApplication());
    mockNotesRepo.findById.mockResolvedValue(makeNote());
    mockNotesRepo.update.mockResolvedValue(
      makeNote({
        text: 'Actualizada',
        updatedAt: new Date('2026-05-02T12:00:00.000Z'),
      }),
    );
    service = new CandidacyNotesService(
      mockAppsRepo as never,
      mockNotesRepo as never,
    );
  });

  it('actualiza una nota y retorna el DTO', async () => {
    const result = await service.updateCandidacyNote(
      { applicationId: 'app-1', id: 'note-1', text: 'Actualizada' },
      { uid: 'uid-hr', role: EMPLOYEE_ROLES.HR },
    );

    expect(mockNotesRepo.update).toHaveBeenCalledWith(
      'app-1',
      'note-1',
      'Actualizada',
    );
    expect(result.id).toBe('note-1');
    expect(result.text).toBe('Actualizada');
    expect(result.updatedAt).toBe('2026-05-02T12:00:00.000Z');
  });

  it('lanza CandidacyNoteNotFoundError si la nota no existe', async () => {
    mockNotesRepo.findById.mockResolvedValue(null);

    await expect(
      service.updateCandidacyNote(
        { applicationId: 'app-1', id: 'missing', text: 'Texto' },
        { uid: 'uid-hr', role: EMPLOYEE_ROLES.HR },
      ),
    ).rejects.toThrow(CandidacyNoteNotFoundError);
  });

  it('lanza CandidacyNoteForbiddenError si otro usuario intenta editar', async () => {
    await expect(
      service.updateCandidacyNote(
        { applicationId: 'app-1', id: 'note-1', text: 'Hack' },
        { uid: 'uid-other', role: 'tech_lead' },
      ),
    ).rejects.toThrow(CandidacyNoteForbiddenError);
  });

  it('admin puede editar nota de otro autor', async () => {
    await service.updateCandidacyNote(
      { applicationId: 'app-1', id: 'note-1', text: 'Edit admin' },
      { uid: 'uid-admin', role: 'admin' },
    );

    expect(mockNotesRepo.update).toHaveBeenCalled();
  });
  
  it('no permite editar notas generadas por entrevistas', async () => {
    mockNotesRepo.findById.mockResolvedValue(makeNote({ source: 'interview' }));

    await expect(
      service.updateCandidacyNote(
        { applicationId: 'app-1', id: 'note-1', text: 'Edit' },
        { uid: 'uid-hr', role: EMPLOYEE_ROLES.HR },
      ),
    ).rejects.toThrow(CandidacyNoteForbiddenError);
  });

  it('lanza CandidacyNoteTerminalStageError si el candidato está contratado', async () => {
    mockAppsRepo.findById.mockResolvedValue(
      makeApplication({ stage: 'hired' }),
    );

    await expect(
      service.updateCandidacyNote(
        { applicationId: 'app-1', id: 'note-1', text: 'Actualizada' },
        { uid: 'uid-hr', role: 'hr' },
      ),
    ).rejects.toThrow(CandidacyNoteTerminalStageError);
  });

  it('lanza CandidacyNoteTerminalStageError si el candidato está rechazado', async () => {
    mockAppsRepo.findById.mockResolvedValue(
      makeApplication({ stage: 'rejected' }),
    );

    await expect(
      service.updateCandidacyNote(
        { applicationId: 'app-1', id: 'note-1', text: 'Actualizada' },
        { uid: 'uid-hr', role: 'hr' },
      ),
    ).rejects.toThrow(CandidacyNoteTerminalStageError);
  });
});



describe('CandidacyNotesService.getCandidacyNotes', () => {
  let service: CandidacyNotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppsRepo.findById.mockResolvedValue(makeApplication());
    mockNotesRepo.findByApplicationId.mockResolvedValue([makeNote()]);
    service = new CandidacyNotesService(
      mockAppsRepo as never,
      mockNotesRepo as never,
    );
  });

  it('retorna notas con fechas ISO', async () => {
    const result = await service.getCandidacyNotes('app-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.createdAt).toBe('2026-05-01T10:00:00.000Z');
  });
});
