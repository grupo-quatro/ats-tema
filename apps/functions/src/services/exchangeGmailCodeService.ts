import type { OAuth2Client } from 'google-auth-library';

import type { GmailCredential } from '@ats/shared-types';

import type { IUserRepository } from '../repositories/userRepository';

export class ExchangeGmailCodeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ExchangeGmailCodeError';
  }
}

export class ExchangeGmailCodeService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly oauth2Client: OAuth2Client,
  ) {}

  async exchange(
    uid: string,
    code: string,
    redirectUri: string,
  ): Promise<void> {
    let tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
    };

    try {
      const response = await this.oauth2Client.getToken({
        code,
        redirect_uri: redirectUri,
      });
      tokens = response.tokens;
    } catch (error) {
      throw new ExchangeGmailCodeError(
        'No se pudo intercambiar el código de autorización por tokens de Gmail.',
        error,
      );
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new ExchangeGmailCodeError(
        'La respuesta de OAuth no contiene access_token o refresh_token.',
      );
    }

    const credential: GmailCredential = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    };

    await this.userRepository.updateGmailCredential(uid, credential);
  }
}
