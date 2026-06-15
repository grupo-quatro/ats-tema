import { describe, it, expect } from 'vitest';
import {
  parseTrustedGoogleScope,
  detectOAuthType,
} from '../components/OAuthCodeHandler';

// ─── parseTrustedGoogleScope ──────────────────────────────────────────────────

describe('parseTrustedGoogleScope', () => {
  it('acepta mail.google.com', () => {
    expect(parseTrustedGoogleScope('https://mail.google.com/')).toEqual({
      host: 'mail.google.com',
      path: '/',
    });
  });

  it('acepta www.googleapis.com', () => {
    expect(
      parseTrustedGoogleScope('https://www.googleapis.com/auth/gmail.readonly'),
    ).toEqual({ host: 'www.googleapis.com', path: '/auth/gmail.readonly' });
  });

  it('rechaza un host no permitido aunque contenga mail.google.com como substring', () => {
    expect(parseTrustedGoogleScope('https://evil.mail.google.com/')).toBeNull();
  });

  it('rechaza un host que tiene mail.google.com como prefijo del TLD', () => {
    expect(
      parseTrustedGoogleScope('https://mail.google.com.evil.com/'),
    ).toBeNull();
  });

  it('rechaza hosts arbitrarios', () => {
    expect(
      parseTrustedGoogleScope('https://attacker.com/auth/gmail'),
    ).toBeNull();
  });

  it('devuelve null para tokens que no son URLs válidas', () => {
    expect(parseTrustedGoogleScope('gmail')).toBeNull();
    expect(parseTrustedGoogleScope('')).toBeNull();
    expect(parseTrustedGoogleScope('not-a-url')).toBeNull();
  });
});

// ─── detectOAuthType ──────────────────────────────────────────────────────────

describe('detectOAuthType', () => {
  it('detecta gmail por https://mail.google.com/', () => {
    expect(detectOAuthType('https://mail.google.com/')).toBe('gmail');
  });

  it('detecta gmail por scope googleapis gmail.*', () => {
    expect(
      detectOAuthType('https://www.googleapis.com/auth/gmail.readonly'),
    ).toBe('gmail');
  });

  it('detecta calendar', () => {
    expect(
      detectOAuthType('https://www.googleapis.com/auth/calendar.readonly'),
    ).toBe('calendar');
  });

  it('detecta google cuando hay tanto gmail como calendar en el scope', () => {
    const scope =
      'https://mail.google.com/ https://www.googleapis.com/auth/calendar';
    expect(detectOAuthType(scope)).toBe('google');
  });

  it('detecta google con variantes googleapis para ambos scopes', () => {
    const scope =
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar.events';
    expect(detectOAuthType(scope)).toBe('google');
  });

  it('devuelve null si no hay scopes reconocidos', () => {
    expect(detectOAuthType('')).toBeNull();
    expect(detectOAuthType('openid email profile')).toBeNull();
  });

  it('no clasifica scopes de hosts no permitidos aunque contengan gmail en la ruta', () => {
    expect(detectOAuthType('https://attacker.com/auth/gmail.send')).toBeNull();
  });

  it('no clasifica un scope con mail.google.com como substring del host', () => {
    expect(detectOAuthType('https://evil.mail.google.com/')).toBeNull();
  });

  it('ignora tokens inválidos y evalúa el resto del scope', () => {
    const scope =
      'openid https://www.googleapis.com/auth/gmail.readonly profile';
    expect(detectOAuthType(scope)).toBe('gmail');
  });
});
