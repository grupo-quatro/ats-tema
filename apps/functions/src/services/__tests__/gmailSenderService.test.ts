import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { logger } from 'firebase-functions';
import { GmailSenderService, GmailSendError } from '../gmailSenderService';
import type { SendEmailPayload } from '../gmailSenderService';

const makePayload = (
  overrides: Partial<SendEmailPayload> = {},
): SendEmailPayload => ({
  accessToken: 'test-access-token',
  to: 'candidato@example.com',
  subject: 'Tu postulación ha sido recibida',
  htmlBody: '<p>Hola, gracias por postularte.</p>',
  ...overrides,
});

const makeFetchResponse = (status: number, statusText: string, ok: boolean) =>
  Promise.resolve({
    ok,
    status,
    statusText,
  } as Response);

describe('GmailSenderService.send', () => {
  let service: GmailSenderService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GMAIL_MOCK', 'false');
    global.fetch = vi.fn();
    service = new GmailSenderService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('no llama a fetch y retorna sin error cuando GMAIL_MOCK es true', async () => {
    vi.stubEnv('GMAIL_MOCK', 'true');

    await service.send(makePayload());

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loguea el destinatario y el asunto cuando GMAIL_MOCK es true', async () => {
    vi.stubEnv('GMAIL_MOCK', 'true');
    const payload = makePayload({
      to: 'candidato@example.com',
      subject: 'Tu postulación ha sido recibida',
    });

    await service.send(payload);

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      'GMAIL_MOCK: would send to candidato@example.com subject Tu postulación ha sido recibida',
    );
  });

  it('llama a fetch con la URL, headers y body correctos cuando el envío es exitoso', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      makeFetchResponse(200, 'OK', true) as never,
    );

    await service.send(makePayload({ accessToken: 'mi-token' }));

    expect(global.fetch).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(url).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    );
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer mi-token',
    );
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );

    const body = JSON.parse(init.body as string) as { raw: string };
    expect(body).toHaveProperty('raw');
    expect(typeof body.raw).toBe('string');
    // base64url: no '+', no '/', no trailing '='
    expect(body.raw).not.toMatch(/[+/=]/);
  });

  it('lanza GmailSendError con statusCode 401 cuando la API devuelve 401', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      makeFetchResponse(401, 'Unauthorized', false) as never,
    );

    await expect(service.send(makePayload())).rejects.toThrow(GmailSendError);

    await expect(service.send(makePayload())).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('lanza GmailSendError con statusCode 500 cuando la API devuelve 500', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      makeFetchResponse(500, 'Internal Server Error', false) as never,
    );

    await expect(service.send(makePayload())).rejects.toThrow(GmailSendError);

    await expect(service.send(makePayload())).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('propaga el error de red cuando fetch lanza una excepción', async () => {
    const networkError = new TypeError('fetch failed: ECONNREFUSED');
    vi.mocked(global.fetch).mockRejectedValue(networkError);

    await expect(service.send(makePayload())).rejects.toThrow(
      'fetch failed: ECONNREFUSED',
    );
  });
});
