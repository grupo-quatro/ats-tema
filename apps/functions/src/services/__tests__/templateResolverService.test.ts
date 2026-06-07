import { describe, it, expect } from 'vitest';
import type { EmailTemplate } from '@ats/shared-types';
import { TemplateResolverService } from '../templateResolverService';
import type { ResolverContext } from '../templateResolverService';

const makeTemplate = (
  overrides: Partial<EmailTemplate> = {},
): EmailTemplate => ({
  id: 'tpl-1',
  name: 'Template de prueba',
  stage: 'application_received',
  subject: 'Hola [Nombre del Candidato], tu postulación fue recibida',
  body: 'Estimado/a [Nombre del Candidato], gracias por postularte a [Nombre de la Posición].',
  isDefault: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const makeContext = (
  overrides: Partial<ResolverContext> = {},
): ResolverContext => ({
  candidateName: 'Ana García',
  positionName: 'Desarrolladora Frontend',
  recruiterName: 'Carlos López',
  recruiterEmail: 'carlos@empresa.com',
  calendarLink: 'https://calendar.app/reunion',
  companyName: 'TechCorp SA',
  ...overrides,
});

describe('TemplateResolverService.resolve', () => {
  const service = new TemplateResolverService();

  it('reemplaza [Nombre del Candidato] en el subject', () => {
    const template = makeTemplate({ subject: 'Hola [Nombre del Candidato]' });
    const { subject } = service.resolve(template, makeContext());
    expect(subject).toBe('Hola Ana García');
  });

  it('reemplaza todas las variables en un template completo', () => {
    const template = makeTemplate({
      subject:
        'Tu postulación a [Nombre de la Posición] en [Nombre de la Empresa]',
      body: [
        'Estimado/a [Nombre del Candidato],',
        'Gracias por tu interés en [Nombre de la Posición].',
        'Tu reclutador/a es [Nombre del Reclutador] ([Email del Reclutador]).',
        'Agenda tu entrevista aquí: [Link de Agenda].',
        'Saludos, [Nombre de la Empresa].',
      ].join('\n'),
    });

    const context = makeContext();
    const { subject, body } = service.resolve(template, context);

    expect(subject).toBe(
      'Tu postulación a Desarrolladora Frontend en TechCorp SA',
    );
    expect(body).toContain('Estimado/a Ana García,');
    expect(body).toContain(
      'Gracias por tu interés en Desarrolladora Frontend.',
    );
    expect(body).toContain(
      'Tu reclutador/a es Carlos López (carlos@empresa.com).',
    );
    expect(body).toContain(
      'Agenda tu entrevista aquí: https://calendar.app/reunion.',
    );
    expect(body).toContain('Saludos, TechCorp SA.');
  });

  it('reemplaza placeholder con string vacío cuando el campo del contexto está vacío', () => {
    const template = makeTemplate({
      subject: 'Hola [Nombre del Candidato]',
      body: 'Posición: [Nombre de la Posición]',
    });

    const context = makeContext({ candidateName: '', positionName: '' });
    const { subject, body } = service.resolve(template, context);

    expect(subject).toBe('Hola ');
    expect(body).toBe('Posición: ');
    expect(subject).not.toContain('[Nombre del Candidato]');
    expect(body).not.toContain('[Nombre de la Posición]');
  });

  it('no muta el template original', () => {
    const template = makeTemplate({
      subject: 'Hola [Nombre del Candidato]',
      body: 'Posición: [Nombre de la Posición]',
    });
    const originalSubject = template.subject;
    const originalBody = template.body;

    service.resolve(template, makeContext());

    expect(template.subject).toBe(originalSubject);
    expect(template.body).toBe(originalBody);
  });

  it('reemplaza múltiples ocurrencias de la misma variable en el body', () => {
    const template = makeTemplate({
      subject: 'Para [Nombre del Candidato]',
      body: '[Nombre del Candidato] es candidato. Gracias [Nombre del Candidato].',
    });

    const { body } = service.resolve(template, makeContext());

    expect(body).toBe('Ana García es candidato. Gracias Ana García.');
    expect(body).not.toContain('[Nombre del Candidato]');
  });

  it('devuelve subject y body sin cambios cuando el template no tiene variables', () => {
    const template = makeTemplate({
      subject: 'Mensaje sin variables',
      body: 'Cuerpo sin variables. Solo texto plano.',
    });

    const { subject, body } = service.resolve(template, makeContext());

    expect(subject).toBe('Mensaje sin variables');
    expect(body).toBe('Cuerpo sin variables. Solo texto plano.');
  });
});
