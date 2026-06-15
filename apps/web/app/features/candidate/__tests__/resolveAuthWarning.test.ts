import { describe, it, expect } from 'vitest';
import type { Employee } from '@ats/shared-types';
import { resolveAuthWarning } from '../utils/candidateProfile.utils';

const makeEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  name: 'Laura Gómez',
  email: 'laura@temaconsulting.com.ar',
  role: 'hr',
  department: 'RRHH',
  active: true,
  gmailStatus: 'connected',
  calendarStatus: 'connected',
  calendarLink: 'https://calendar.google.com/calendar/appointments/123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Stages sin email ─────────────────────────────────────────────────────────

describe('resolveAuthWarning — stages sin email', () => {
  it('retorna null para screening (sin email, sin calendar)', () => {
    expect(resolveAuthWarning('screening', null)).toBeNull();
  });

  it('retorna null para hr_1_done aunque Gmail esté desconectado', () => {
    const employee = makeEmployee({ gmailStatus: 'disconnected' });
    expect(resolveAuthWarning('hr_1_done', employee)).toBeNull();
  });
});

// ─── Gmail desconectado ───────────────────────────────────────────────────────

describe('resolveAuthWarning — Gmail desconectado', () => {
  it('necesita Gmail para una etapa con email (hired)', () => {
    const employee = makeEmployee({ gmailStatus: 'disconnected' });
    const warning = resolveAuthWarning('hired', employee);
    expect(warning).toMatchObject({ needsGmail: true });
  });

  it('necesita Gmail para send_offer', () => {
    const employee = makeEmployee({ gmailStatus: 'disconnected' });
    const warning = resolveAuthWarning('send_offer', employee);
    expect(warning).toMatchObject({ needsGmail: true });
  });

  it('necesita Gmail para rejected', () => {
    const employee = makeEmployee({ gmailStatus: 'disconnected' });
    const warning = resolveAuthWarning('rejected', employee);
    expect(warning).toMatchObject({ needsGmail: true });
  });

  it('retorna null cuando Gmail está conectado y la etapa tiene email', () => {
    const employee = makeEmployee({ gmailStatus: 'connected' });
    expect(resolveAuthWarning('hired', employee)).toBeNull();
  });

  it('employee null cuenta como Gmail desconectado en stages con email', () => {
    const warning = resolveAuthWarning('hired', null);
    expect(warning).toMatchObject({ needsGmail: true });
  });
});

// ─── Stages de agenda (schedule_*) ───────────────────────────────────────────

describe('resolveAuthWarning — etapas schedule_*', () => {
  it('no hay warning cuando todo está conectado y hay calendarLink', () => {
    const employee = makeEmployee();
    expect(resolveAuthWarning('schedule_hr_1', employee)).toBeNull();
  });

  it('necesita Gmail cuando está desconectado en schedule_hr_1', () => {
    const employee = makeEmployee({ gmailStatus: 'disconnected' });
    const warning = resolveAuthWarning('schedule_hr_1', employee);
    expect(warning).toMatchObject({ needsGmail: true, needsCalendar: false });
  });

  it('necesita Calendar cuando está desconectado en schedule_hr_1', () => {
    const employee = makeEmployee({ calendarStatus: 'disconnected' });
    const warning = resolveAuthWarning('schedule_hr_1', employee);
    expect(warning).toMatchObject({ needsCalendar: true });
  });

  it('necesita calendarLink cuando está vacío en schedule_tech_1', () => {
    const employee = makeEmployee({ calendarLink: '' });
    const warning = resolveAuthWarning('schedule_tech_1', employee);
    expect(warning).toMatchObject({ needsCalendarLink: true });
  });

  it('necesita calendarLink cuando el campo es undefined en schedule_tech_2', () => {
    const employee = makeEmployee({ calendarLink: undefined });
    const warning = resolveAuthWarning('schedule_tech_2', employee);
    expect(warning).toMatchObject({ needsCalendarLink: true });
  });

  it('acumula múltiples problemas: Gmail + Calendar + Link', () => {
    const employee = makeEmployee({
      gmailStatus: 'disconnected',
      calendarStatus: 'disconnected',
      calendarLink: '',
    });
    const warning = resolveAuthWarning('schedule_hr_2', employee);
    expect(warning).toEqual({
      needsGmail: true,
      needsCalendar: true,
      needsCalendarLink: true,
    });
  });

  it('onsite_interview no bloquea aunque Calendar esté desconectado y falte el link', () => {
    const employee = makeEmployee({
      gmailStatus: 'connected',
      calendarStatus: 'disconnected',
      calendarLink: '',
    });
    expect(resolveAuthWarning('onsite_interview', employee)).toBeNull();
  });
});
