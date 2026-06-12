import type {
  Application,
  CandidacyNote,
  CandidacyNoteDTO,
  EmployeeRole,
  GetCandidacyNotesResponse,
  SaveCandidacyNotePayload,
  SaveCandidacyNoteResponse,
  UpdateCandidacyNotePayload,
  UpdateCandidacyNoteResponse,
} from '@ats/shared-types';

import type { AuthenticatedUser } from '../core/httpAuth';
import { auth } from '../core/firebaseAdmin';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidacyNotesRepository } from '../repositories/candidacyNotesRepository';
import { ApplicationNotFoundError } from './updateApplicationService';

export class CandidacyNoteNotFoundError extends Error {
  constructor(noteId: string) {
    super(`La nota ${noteId} no existe.`);
    this.name = 'CandidacyNoteNotFoundError';
  }
}

export class CandidacyNoteForbiddenError extends Error {
  constructor(message = 'No tenés permiso para modificar esta nota.') {
    super(message);
    this.name = 'CandidacyNoteForbiddenError';
  }
}

export class CandidacyNoteTerminalStageError extends Error {
  constructor() {
    super(
      'No se pueden agregar ni editar notas cuando el candidato está contratado o rechazado.',
    );
    this.name = 'CandidacyNoteTerminalStageError';
  }
}

const ROLE_LABELS: Record<EmployeeRole, string> = {
  hr: 'Recursos Humanos',
  tech_lead: 'Líder técnico',
  area_leader: 'Área Líder',
  admin: 'Administrador',
};

export class CandidacyNotesService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidacyNotesRepository: CandidacyNotesRepository = new CandidacyNotesRepository(),
  ) {}

  async saveCandidacyNote(
    payload: SaveCandidacyNotePayload,
    caller: AuthenticatedUser,
  ): Promise<SaveCandidacyNoteResponse> {
    const applicationId = payload.applicationId.trim();
    const text = payload.text.trim();
    const source = payload.source ?? 'manual';

    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    this.assertCanManageNotes(application);

    return this.createNote(applicationId, text, source, caller);
  }

  async updateCandidacyNote(
    payload: UpdateCandidacyNotePayload,
    caller: AuthenticatedUser,
  ): Promise<UpdateCandidacyNoteResponse> {
    const applicationId = payload.applicationId.trim();
    const noteId = payload.id.trim();
    const text = payload.text.trim();

    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    this.assertCanManageNotes(application);

    const note = await this.updateNote(applicationId, noteId, text, caller);
    return this.toCandidacyNoteDTO(note);
  }

  async getCandidacyNotes(
    applicationId: string,
  ): Promise<GetCandidacyNotesResponse> {
    const application =
      await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    const notes =
      await this.candidacyNotesRepository.findByApplicationId(applicationId);

    return notes.map(this.toCandidacyNoteDTO);
  }

  private assertCanManageNotes(application: Application): void {
    if (application.stage === 'hired' || application.stage === 'rejected') {
      throw new CandidacyNoteTerminalStageError();
    }
  }

  private async createNote(
    applicationId: string,
    text: string,
    source: CandidacyNote['source'],
    caller: AuthenticatedUser,
  ): Promise<SaveCandidacyNoteResponse> {
    const { authorName, authorRole } = await this.resolveAuthor(caller);

    const note = await this.candidacyNotesRepository.create(applicationId, {
      applicationId,
      text,
      source,
      authorUid: caller.uid,
      authorName,
      authorRole,
    });

    return this.toSaveResponse(note);
  }

  private async updateNote(
    applicationId: string,
    noteId: string,
    text: string,
    caller: AuthenticatedUser,
  ): Promise<CandidacyNote> {
    const existing = await this.candidacyNotesRepository.findById(
      applicationId,
      noteId,
    );

    if (!existing) {
      throw new CandidacyNoteNotFoundError(noteId);
    }

    if (existing.source === 'interview') {
      throw new CandidacyNoteForbiddenError(
        'Las notas generadas por entrevistas no se pueden editar.',
      );
    }

    if (existing.authorUid !== caller.uid && caller.role !== 'admin') {
      throw new CandidacyNoteForbiddenError();
    }

    return this.candidacyNotesRepository.update(applicationId, noteId, text);
  }

  private async resolveAuthor(caller: AuthenticatedUser): Promise<{
    authorName: string;
    authorRole: string;
  }> {
    const userRecord = await auth.getUser(caller.uid).catch(() => null);
    const authorName =
      userRecord?.displayName ?? userRecord?.email ?? caller.uid;
    const authorRole = caller.role ? ROLE_LABELS[caller.role] : 'Usuario';

    return { authorName, authorRole };
  }

  private toCandidacyNoteDTO(note: CandidacyNote): CandidacyNoteDTO {
    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private toSaveResponse(note: CandidacyNote): SaveCandidacyNoteResponse {
    return {
      id: note.id,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
