import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetCalendarCredential,
  mockUpdateCalendarCredential,
  mockGetCalendarSyncToken,
  mockSaveCalendarSyncToken,
  mockFindAllActiveInSchedulingByEmail,
  mockUpdateStage,
  mockSetCalendarStatus,
  mockEventsList,
  mockTxGet,
  mockTxUpdate,
  mockDocUpdate,
} = vi.hoisted(() => ({
  mockGetCalendarCredential: vi.fn(),
  mockUpdateCalendarCredential: vi.fn(),
  mockGetCalendarSyncToken: vi.fn(),
  mockSaveCalendarSyncToken: vi.fn(),
  mockFindAllActiveInSchedulingByEmail: vi.fn(),
  mockUpdateStage: vi.fn(),
  mockSetCalendarStatus: vi.fn(),
  mockEventsList: vi.fn(),
  mockTxGet: vi.fn(),
  mockTxUpdate: vi.fn(),
  mockDocUpdate: vi.fn(),
}));

vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../core/firebaseAdmin', () => ({
  db: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({ update: mockDocUpdate }),
    }),
    runTransaction: vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = { get: mockTxGet, update: mockTxUpdate };
        await fn(tx);
      }),
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
        once: vi.fn(),
      })),
    },
    calendar: vi.fn(() => ({ events: { list: mockEventsList } })),
  },
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({})),
}));

import type { Application } from '@ats/shared-types';
import { processCalendarNotification } from '../calendarWebhookService';

vi.mock('../../repositories/userRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    getCalendarCredential: mockGetCalendarCredential,
    updateCalendarCredential: mockUpdateCalendarCredential,
    getCalendarSyncToken: mockGetCalendarSyncToken,
    saveCalendarSyncToken: mockSaveCalendarSyncToken,
    getGmailCredential: vi.fn().mockResolvedValue(null),
    updateGmailCredential: vi.fn(),
    saveCalendarWatch: vi.fn(),
    getCalendarWatchByChannelId: vi.fn(),
  })),
}));

vi.mock('../../repositories/applicationRepository', () => ({
  ApplicationsRepository: vi.fn().mockImplementation(() => ({
    findAllActiveInSchedulingByEmail: mockFindAllActiveInSchedulingByEmail,
  })),
}));

vi.mock('../../repositories/employeeRepository', () => ({
  EmployeeRepository: vi.fn().mockImplementation(() => ({
    getCalendarLink: vi.fn().mockResolvedValue(null),
    setGmailStatus: vi.fn(),
    setCalendarStatus: mockSetCalendarStatus,
  })),
}));

vi.mock('../updateApplicationService', () => ({
  UpdateApplicationStageService: vi.fn().mockImplementation(() => ({
    updateStage: mockUpdateStage,
  })),
}));

vi.mock('../../repositories/emailLogRepository', () => ({
  EmailLogRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../../repositories/emailTemplateRepository', () => ({
  EmailTemplateRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../../repositories/orgConfigRepository', () => ({
  OrgConfigRepository: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../gmailSenderService', () => ({
  GmailSenderService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../templateResolverService', () => ({
  TemplateResolverService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('../stageEmailService', () => ({
  StageEmailService: vi.fn().mockImplementation(() => ({})),
}));

const CREDENTIAL = {
  accessToken: 'at',
  refreshToken: 'rt',
  expiresAt: Date.now() + 3600_000,
};

const makeApplication = (
  overrides: Partial<Application> = {},
): Application => ({
  id: 'app-1',
  jobId: 'job-1',
  candidateId: 'cand-1',
  stage: 'schedule_hr_1',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  stageUpdatedAt: new Date(),
  ...overrides,
});

const makeEvent = (overrides = {}) => ({
  id: 'evt-1',
  status: 'confirmed',
  attendees: [
    { email: 'candidate@example.com', self: false, responseStatus: 'accepted' },
  ],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCalendarCredential.mockResolvedValue(CREDENTIAL);
  mockGetCalendarSyncToken.mockResolvedValue(null);
  mockSaveCalendarSyncToken.mockResolvedValue(undefined);
  mockFindAllActiveInSchedulingByEmail.mockResolvedValue([]);
  mockUpdateStage.mockResolvedValue(undefined);
  mockSetCalendarStatus.mockResolvedValue(undefined);
  mockEventsList.mockResolvedValue({ data: { items: [] } });
  // Por defecto la transacción no encuentra calendarEventId — permite procesamiento
  mockTxGet.mockResolvedValue({ exists: true, data: () => ({}) });
  mockTxUpdate.mockReturnValue(undefined);
  mockDocUpdate.mockResolvedValue(undefined);
});

describe('processCalendarNotification', () => {
  it('no hace nada si el recruiter no tiene calendarCredential', async () => {
    mockGetCalendarCredential.mockResolvedValue(null);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('no hace nada si no hay eventos nuevos', async () => {
    mockEventsList.mockResolvedValue({ data: { items: [] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('transiciona la aplicación al encontrar el candidato por email del asistente', async () => {
    const app = makeApplication();
    mockFindAllActiveInSchedulingByEmail.mockResolvedValue([app]);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockFindAllActiveInSchedulingByEmail).toHaveBeenCalledWith(
      'candidate@example.com',
      expect.any(Array),
      'uid-1',
    );
    expect(mockTxUpdate).toHaveBeenCalled();
    expect(mockUpdateStage).toHaveBeenCalledWith(
      { applicationId: 'app-1', stage: 'hr_1_scheduled' },
      'uid-1',
    );
  });

  it('ignora eventos sin asistente externo', async () => {
    mockEventsList.mockResolvedValue({
      data: {
        items: [
          makeEvent({
            attendees: [{ email: 'recruiter@example.com', self: true }],
          }),
        ],
      },
    });

    await processCalendarNotification('uid-1');

    expect(mockFindAllActiveInSchedulingByEmail).not.toHaveBeenCalled();
    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('no hace nada si no hay aplicación activa en scheduling para el candidato', async () => {
    mockFindAllActiveInSchedulingByEmail.mockResolvedValue([]);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('no reprocesa si calendarEventId ya está seteado (idempotencia)', async () => {
    const app = makeApplication({ calendarEventId: 'evt-1' });
    mockFindAllActiveInSchedulingByEmail.mockResolvedValue([app]);
    // La transacción encuentra el eventId ya marcado
    mockTxGet.mockResolvedValue({
      exists: true,
      data: () => ({ calendarEventId: 'evt-1' }),
    });
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('no avanza si la query no devuelve postulaciones para este recruiter', async () => {
    mockFindAllActiveInSchedulingByEmail.mockResolvedValue([]);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('usa syncToken si existe en Firestore', async () => {
    mockGetCalendarSyncToken.mockResolvedValue('sync-token-abc');
    mockEventsList.mockResolvedValue({
      data: { items: [], nextSyncToken: 'sync-token-new' },
    });

    await processCalendarNotification('uid-1');

    expect(mockEventsList).toHaveBeenCalledWith(
      expect.objectContaining({ syncToken: 'sync-token-abc' }),
    );
    expect(mockSaveCalendarSyncToken).toHaveBeenCalledWith(
      'uid-1',
      'sync-token-new',
    );
  });

  it('setea calendarStatus DISCONNECTED cuando el token fue revocado', async () => {
    mockEventsList.mockRejectedValue(new Error('invalid_grant'));

    await processCalendarNotification('uid-1');

    expect(mockSetCalendarStatus).toHaveBeenCalledWith('uid-1', 'disconnected');
    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('ignora eventos cancelados', async () => {
    mockEventsList.mockResolvedValue({
      data: { items: [makeEvent({ status: 'cancelled' })] },
    });

    await processCalendarNotification('uid-1');

    expect(mockFindAllActiveInSchedulingByEmail).not.toHaveBeenCalled();
    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('ignora asistentes que no aceptaron la invitación', async () => {
    mockEventsList.mockResolvedValue({
      data: {
        items: [
          makeEvent({
            attendees: [
              {
                email: 'candidate@example.com',
                self: false,
                responseStatus: 'needsAction',
              },
            ],
          }),
        ],
      },
    });

    await processCalendarNotification('uid-1');

    expect(mockFindAllActiveInSchedulingByEmail).not.toHaveBeenCalled();
    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('libera calendarEventId si updateStage falla para permitir reintento', async () => {
    const app = makeApplication();
    mockFindAllActiveInSchedulingByEmail.mockResolvedValue([app]);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });
    mockUpdateStage.mockRejectedValue(new Error('stage transition failed'));

    await processCalendarNotification('uid-1');

    // El reclamo se hizo durante la transacción
    expect(mockTxUpdate).toHaveBeenCalled();
    // Y se liberó al fallar updateStage
    expect(mockDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ calendarEventId: expect.anything() }),
    );
  });

  it('procesa todas las páginas antes de guardar el syncToken', async () => {
    const page1Event = makeEvent({ id: 'evt-page1' });
    const page2Event = makeEvent({ id: 'evt-page2' });

    mockEventsList
      .mockResolvedValueOnce({
        data: { items: [page1Event], nextPageToken: 'tok-2' },
      })
      .mockResolvedValueOnce({
        data: { items: [page2Event], nextSyncToken: 'sync-final' },
      });

    await processCalendarNotification('uid-1');

    expect(mockEventsList).toHaveBeenCalledTimes(2);
    expect(mockEventsList).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pageToken: 'tok-2' }),
    );
    // syncToken solo se persiste una vez, con el token de la última página
    expect(mockSaveCalendarSyncToken).toHaveBeenCalledTimes(1);
    expect(mockSaveCalendarSyncToken).toHaveBeenCalledWith(
      'uid-1',
      'sync-final',
    );
  });

  it('avanza la postulación que la query devuelve para este recruiter', async () => {
    const app = makeApplication({ id: 'app-correcto', recruiterId: 'uid-1' });
    mockFindAllActiveInSchedulingByEmail.mockResolvedValue([app]);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).toHaveBeenCalledWith(
      { applicationId: 'app-correcto', stage: 'hr_1_scheduled' },
      'uid-1',
    );
    expect(mockFindAllActiveInSchedulingByEmail).toHaveBeenCalledWith(
      'candidate@example.com',
      expect.any(Array),
      'uid-1',
    );
  });
});
