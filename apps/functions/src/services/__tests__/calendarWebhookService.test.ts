import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetCalendarCredential,
  mockUpdateCalendarCredential,
  mockFindById,
  mockFindActiveInSchedulingByEmail,
  mockUpdate,
  mockUpdateStage,
  mockSetCalendarStatus,
  mockEventsList,
} = vi.hoisted(() => ({
  mockGetCalendarCredential: vi.fn(),
  mockUpdateCalendarCredential: vi.fn(),
  mockFindById: vi.fn(),
  mockFindActiveInSchedulingByEmail: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateStage: vi.fn(),
  mockSetCalendarStatus: vi.fn(),
  mockEventsList: vi.fn(),
}));

vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../core/firebaseAdmin', () => ({
  db: { collection: vi.fn() },
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
    getGmailCredential: vi.fn().mockResolvedValue(null),
    updateGmailCredential: vi.fn(),
    saveCalendarWatch: vi.fn(),
    getCalendarWatchByChannelId: vi.fn(),
  })),
}));

vi.mock('../../repositories/applicationRepository', () => ({
  ApplicationsRepository: vi.fn().mockImplementation(() => ({
    findById: mockFindById,
    findActiveInSchedulingByEmail: mockFindActiveInSchedulingByEmail,
    update: mockUpdate,
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
  attendees: [{ email: 'candidate@example.com', self: false }],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCalendarCredential.mockResolvedValue(CREDENTIAL);
  mockFindById.mockResolvedValue(null);
  mockFindActiveInSchedulingByEmail.mockResolvedValue(null);
  mockUpdate.mockResolvedValue(undefined);
  mockUpdateStage.mockResolvedValue(undefined);
  mockSetCalendarStatus.mockResolvedValue(undefined);
  mockEventsList.mockResolvedValue({ data: { items: [] } });
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
    mockFindActiveInSchedulingByEmail.mockResolvedValue(app);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockFindActiveInSchedulingByEmail).toHaveBeenCalledWith(
      'candidate@example.com',
      expect.any(Array),
    );
    expect(mockUpdateStage).toHaveBeenCalledWith(
      { applicationId: 'app-1', stage: 'hr_1_scheduled' },
      'uid-1',
    );
    expect(mockUpdate).toHaveBeenCalledWith('app-1', {
      calendarEventId: 'evt-1',
    });
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

    expect(mockFindActiveInSchedulingByEmail).not.toHaveBeenCalled();
    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('no hace nada si no hay aplicación activa en scheduling para el candidato', async () => {
    mockFindActiveInSchedulingByEmail.mockResolvedValue(null);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
  });

  it('no reprocesa si calendarEventId ya está seteado (idempotencia)', async () => {
    const app = makeApplication({ calendarEventId: 'evt-1' });
    mockFindActiveInSchedulingByEmail.mockResolvedValue(app);
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdateStage).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('guarda calendarEventId DESPUÉS de updateStage — si falla no queda marcado', async () => {
    const app = makeApplication();
    mockFindActiveInSchedulingByEmail.mockResolvedValue(app);
    mockUpdateStage.mockRejectedValue(new Error('updateStage failed'));
    mockEventsList.mockResolvedValue({ data: { items: [makeEvent()] } });

    await processCalendarNotification('uid-1');

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('setea calendarStatus DISCONNECTED cuando el token fue revocado', async () => {
    mockEventsList.mockRejectedValue(new Error('invalid_grant'));

    await processCalendarNotification('uid-1');

    expect(mockSetCalendarStatus).toHaveBeenCalledWith('uid-1', 'disconnected');
    expect(mockUpdateStage).not.toHaveBeenCalled();
  });
});
