import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GmailCredential } from '@ats/shared-types';

import type { IUserRepository } from '../../repositories/userRepository';
import {
  ExchangeGmailCodeService,
  ExchangeGmailCodeError,
} from '../exchangeGmailCodeService';

const createUserRepositoryMock = (): IUserRepository => ({
  getGmailCredential: vi.fn(),
  updateGmailCredential: vi.fn(),
});

const createOAuth2ClientMock = () => ({
  getToken: vi.fn(),
});

describe('ExchangeGmailCodeService.exchange', () => {
  let userRepository: IUserRepository;
  let oauth2Client: ReturnType<typeof createOAuth2ClientMock>;
  let service: ExchangeGmailCodeService;

  beforeEach(() => {
    vi.clearAllMocks();
    userRepository = createUserRepositoryMock();
    oauth2Client = createOAuth2ClientMock();
    // Cast is intentional: test only needs the two methods we stub
    service = new ExchangeGmailCodeService(
      userRepository,
      oauth2Client as never,
    );
  });

  it('guarda la credencial en el repositorio cuando el intercambio es exitoso', async () => {
    const expiryDate = Date.now() + 3600 * 1000;
    oauth2Client.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-abc',
        expiry_date: expiryDate,
      },
    });
    vi.mocked(userRepository.updateGmailCredential).mockResolvedValue(
      undefined,
    );

    await service.exchange('uid-test', 'auth-code', 'https://app/callback');

    expect(oauth2Client.getToken).toHaveBeenCalledWith({
      code: 'auth-code',
      redirect_uri: 'https://app/callback',
    });

    const savedCredential = vi.mocked(userRepository.updateGmailCredential).mock
      .calls[0][1] as GmailCredential;

    expect(savedCredential.accessToken).toBe('access-token-123');
    expect(savedCredential.refreshToken).toBe('refresh-token-abc');
    expect(savedCredential.expiresAt).toBe(expiryDate);
  });

  it('calcula expiresAt con fallback cuando expiry_date no viene en la respuesta', async () => {
    const beforeExchange = Date.now();

    oauth2Client.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token-456',
        refresh_token: 'refresh-token-xyz',
        expiry_date: null,
      },
    });
    vi.mocked(userRepository.updateGmailCredential).mockResolvedValue(
      undefined,
    );

    await service.exchange('uid-test', 'auth-code', 'https://app/callback');

    const savedCredential = vi.mocked(userRepository.updateGmailCredential).mock
      .calls[0][1] as GmailCredential;

    expect(savedCredential.expiresAt).toBeGreaterThanOrEqual(
      beforeExchange + 3600 * 1000,
    );
  });

  it('lanza ExchangeGmailCodeError cuando getToken falla', async () => {
    oauth2Client.getToken.mockRejectedValue(
      new Error('invalid_grant: Code was already redeemed.'),
    );

    await expect(
      service.exchange('uid-test', 'bad-code', 'https://app/callback'),
    ).rejects.toThrow(ExchangeGmailCodeError);

    expect(userRepository.updateGmailCredential).not.toHaveBeenCalled();
  });

  it('lanza ExchangeGmailCodeError cuando la respuesta no contiene access_token', async () => {
    oauth2Client.getToken.mockResolvedValue({
      tokens: {
        access_token: null,
        refresh_token: 'refresh-token-abc',
        expiry_date: Date.now() + 3600 * 1000,
      },
    });

    await expect(
      service.exchange('uid-test', 'auth-code', 'https://app/callback'),
    ).rejects.toThrow(ExchangeGmailCodeError);

    expect(userRepository.updateGmailCredential).not.toHaveBeenCalled();
  });

  it('lanza ExchangeGmailCodeError cuando la respuesta no contiene refresh_token', async () => {
    oauth2Client.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token-123',
        refresh_token: null,
        expiry_date: Date.now() + 3600 * 1000,
      },
    });

    await expect(
      service.exchange('uid-test', 'auth-code', 'https://app/callback'),
    ).rejects.toThrow(ExchangeGmailCodeError);

    expect(userRepository.updateGmailCredential).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio al guardar la credencial', async () => {
    oauth2Client.getToken.mockResolvedValue({
      tokens: {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-abc',
        expiry_date: Date.now() + 3600 * 1000,
      },
    });
    vi.mocked(userRepository.updateGmailCredential).mockRejectedValue(
      new Error('Firestore write error'),
    );

    await expect(
      service.exchange('uid-test', 'auth-code', 'https://app/callback'),
    ).rejects.toThrow('Firestore write error');
  });
});
