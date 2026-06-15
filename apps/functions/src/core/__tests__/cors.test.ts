import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-functions', () => ({
  logger: { warn: vi.fn() },
}));
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn(),
}));

import { setCorsHeaders, handleCorsPreflightAndVerifyMethod } from '../cors';

type FakeResponse = {
  set: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function makeResponse(): FakeResponse {
  const res = {
    set: vi.fn(),
    send: vi.fn(),
    json: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

// ─── setCorsHeaders ───────────────────────────────────────────────────────────

describe('setCorsHeaders', () => {
  beforeEach(() => {
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.ALLOWED_ORIGIN;
  });

  it('usa * como origen cuando corre en el emulador', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    const res = makeResponse();
    setCorsHeaders(res as never);
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
  });

  it('usa ALLOWED_ORIGIN en producción si está configurado', () => {
    process.env.ALLOWED_ORIGIN = 'https://app.temaconsulting.com.ar';
    const res = makeResponse();
    setCorsHeaders(res as never);
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://app.temaconsulting.com.ar',
    );
  });

  it('incluye GET, POST, PATCH y OPTIONS en Allow-Methods', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    const res = makeResponse();
    setCorsHeaders(res as never);
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET, POST, PATCH, OPTIONS',
    );
  });

  it('incluye Content-Type y Authorization en Allow-Headers', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    const res = makeResponse();
    setCorsHeaders(res as never);
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
  });
});

// ─── handleCorsPreflightAndVerifyMethod ───────────────────────────────────────

describe('handleCorsPreflightAndVerifyMethod', () => {
  beforeEach(() => {
    process.env.FUNCTIONS_EMULATOR = 'true';
  });

  it('responde 204 al preflight OPTIONS y retorna true', () => {
    const res = makeResponse();
    const handled = handleCorsPreflightAndVerifyMethod(
      { method: 'OPTIONS' },
      res as never,
      'POST',
    );
    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith('');
  });

  it('responde 405 si el método no coincide y retorna true', () => {
    const res = makeResponse();
    const handled = handleCorsPreflightAndVerifyMethod(
      { method: 'GET' },
      res as never,
      'POST',
    );
    expect(handled).toBe(true);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('retorna false cuando el método coincide (el handler debe continuar)', () => {
    const res = makeResponse();
    const handled = handleCorsPreflightAndVerifyMethod(
      { method: 'POST' },
      res as never,
      'POST',
    );
    expect(handled).toBe(false);
  });

  it('siempre setea los headers CORS incluso para métodos válidos', () => {
    const res = makeResponse();
    handleCorsPreflightAndVerifyMethod(
      { method: 'PATCH' },
      res as never,
      'PATCH',
    );
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      expect.any(String),
    );
  });
});
