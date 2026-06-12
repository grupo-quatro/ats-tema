import type { OAuth2Client } from 'google-auth-library';

import { GMAIL_STATUS } from '@ats/shared-types';
import type { GmailCredential } from '@ats/shared-types';

import type { IEmployeeRepository } from '../repositories/employeeRepository';
import type { IUserRepository } from '../repositories/userRepository';

export class ExchangeCalendarCodeError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ExchangeCalendarCodeError';
  }
}

export class ExchangeCalendarCodeService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly oauth2Client: OAuth2Client,
    private readonly employeeRepository?: IEmployeeRepository,
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
      throw new ExchangeCalendarCodeError(
        'No se pudo intercambiar el código de autorización por tokens de Google Calendar.',
        error,
      );
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new ExchangeCalendarCodeError(
        'La respuesta de OAuth no contiene access_token o refresh_token.',
      );
    }

    const credential: GmailCredential = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    };

    await this.userRepository.updateCalendarCredential(uid, credential);
    await this.employeeRepository?.setCalendarStatus(
      uid,
      GMAIL_STATUS.CONNECTED,
    );
  }
}
