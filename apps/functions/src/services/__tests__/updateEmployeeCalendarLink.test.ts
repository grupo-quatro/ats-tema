import { describe, it, expect, vi, beforeEach } from 'vitest';

// Activa el path de emulador en requireAuthenticatedUser para usar dev tokens
process.env.FUNCTIONS_EMULATOR = 'true';

const { mockDocRef } = vi.hoisted(() => ({
  mockDocRef: {
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
  },
}));

vi.mock('../../core/firebaseAdmin', () => ({
  db: {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    }),
  },
  auth: {
    verifyIdToken: vi.fn(),
  },
}));

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: (handler: unknown) => handler,
}));

import { EMPLOYEE_ROLES } from '@ats/shared-types';
import { updateEmployeeCalendarLink } from '../../callables/updateEmployeeCalendarLink';
import { EmployeeRepository } from '../../repositories/employeeRepository';

const makeRequest = (method: string, body: unknown, token = 'dev-recruiter') =>
  ({
    method,
    body,
    header: (name: string) =>
      name === 'Authorization' ? `Bearer ${token}` : undefined,
  }) as Parameters<typeof updateEmployeeCalendarLink>[0];

const makeResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    set: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Parameters<typeof updateEmployeeCalendarLink>[1];
};

describe('updateEmployeeCalendarLink callable', () => {
  let response: ReturnType<typeof makeResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
    response = makeResponse();
  });

  it('rechaza métodos distintos a POST', async () => {
    await updateEmployeeCalendarLink(makeRequest('GET', {}), response);
    expect(response.status).toHaveBeenCalledWith(405);
  });

  it('rechaza cuando calendarLink no es string', async () => {
    await updateEmployeeCalendarLink(
      makeRequest('POST', { calendarLink: 123 }),
      response,
    );
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it('rechaza URLs que no empiezan con https://', async () => {
    await updateEmployeeCalendarLink(
      makeRequest('POST', { calendarLink: 'http://calendario.com' }),
      response,
    );
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it('acepta cadena vacía (borrar link)', async () => {
    await updateEmployeeCalendarLink(
      makeRequest('POST', { calendarLink: '' }),
      response,
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true });
  });

  it('acepta URL válida con https:// y actualiza Firestore', async () => {
    const validUrl =
      'https://calendar.google.com/calendar/appointments/schedules/abc123';

    await updateEmployeeCalendarLink(
      makeRequest('POST', { calendarLink: validUrl }),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true });
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ calendarLink: validUrl }),
    );
  });

  it('retorna 401 sin token de autorización', async () => {
    const req = {
      method: 'POST',
      body: { calendarLink: 'https://example.com' },
      header: () => undefined,
    } as unknown as Parameters<typeof updateEmployeeCalendarLink>[0];

    await updateEmployeeCalendarLink(req, response);
    expect(response.status).toHaveBeenCalledWith(401);
  });
});

describe('EmployeeRepository.getCalendarLink', () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new EmployeeRepository();
  });

  it('retorna el calendarLink cuando el doc existe y tiene el campo', async () => {
    const link = 'https://calendar.google.com/appointments/abc';
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ calendarLink: link }),
    });

    const result = await repo.getCalendarLink('uid-1');
    expect(result).toBe(link);
  });

  it('retorna null cuando el doc no existe', async () => {
    mockDocRef.get.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    const result = await repo.getCalendarLink('uid-1');
    expect(result).toBeNull();
  });

  it('retorna null cuando el doc existe pero no tiene calendarLink', async () => {
    mockDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ name: 'Laura', role: EMPLOYEE_ROLES.HR }),
    });

    const result = await repo.getCalendarLink('uid-1');
    expect(result).toBeNull();
  });
});
