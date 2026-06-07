# Pipeline & Comunicaciones — Plan Maestro

## Contexto

Este documento integra dos fases de trabajo sobre el sistema de stages y comunicaciones del ATS:

- **Fase 1 ✅ Completada:** infraestructura de email (Gmail OAuth, templates en Firestore, envío automático, historial de logs)
- **Fase 2 → Pendiente:** refactorización del modelo de stages para que cada stage sea su propia fuente de verdad (config-driven pipeline)

---

## Fase 1 — Email Templates + Gmail (COMPLETADA ✅)

> Implementación completa. 196 tests, 0 errores de tipo.

### Qué se construyó

| Etapa | Descripción                                                                               | Estado |
| ----- | ----------------------------------------------------------------------------------------- | ------ |
| 1     | Shared types: `EmailLog`/DTOs, `APPLICATION_TO_EMAIL_STAGE_MAP`, `TEMPLATE_VARIABLES`     | ✅     |
| 2     | Gmail OAuth con refresh token — `POST /exchangeGmailCode`, `google-auth-library`          | ✅     |
| 3     | `TemplateResolverService` — inmutable, fallback `''` para campos faltantes                | ✅     |
| 4     | `GmailSenderService` — Gmail REST API, MIME base64url, `GMAIL_MOCK=true` para emulator    | ✅     |
| 5     | `StageEmailService` — orquesta trigger post-stage; nunca bloquea la transición            | ✅     |
| 5     | `RetryEmailSendService` — reintenta con body/subject ya resuelto del log                  | ✅     |
| 6     | `CommunicationHistoryCard` en perfil de candidato — chips MUI, botón "Reenviar"           | ✅     |
| 6     | `GET /getEmailLogs` + `POST /retryEmailSend`                                              | ✅     |
| 7     | `emailTemplates.service.ts` migrado de localStorage a Firestore; `seedDefaultTemplates()` | ✅     |
| —     | Swagger actualizado; 196 tests (129 functions + 67 web), 0 errores de tipo                | ✅     |

### Endpoints activos (Fase 1)

| Método | Path                 | Descripción                                            |
| ------ | -------------------- | ------------------------------------------------------ |
| `POST` | `/exchangeGmailCode` | Intercambia authorization code por refresh token Gmail |
| `GET`  | `/getEmailLogs`      | Historial por `candidateId`                            |
| `POST` | `/retryEmailSend`    | Reintenta un `EmailLog` con `status='failed'`          |

### Arquitectura vigente (antes de Fase 2)

```
updateApplicationService
  └─ stageEmailService.sendIfTemplateExists()
       ├─ APPLICATION_TO_EMAIL_STAGE_MAP[stage] → EmailTemplateStage | null
       ├─ emailTemplateRepository.findByStage()
       ├─ templateResolverService.resolve()
       ├─ gmailSenderService.send()
       └─ emailLogRepository.create() / updateStatus()
```

**Limitaciones que Fase 2 resuelve:**

- `APPLICATION_TO_EMAIL_STAGE_MAP` vive en `emailTemplate.ts`, desacoplado del concepto de stage
- No hay validación de que las transiciones sean hacia adelante
- No hay concepto de transición automática ni de stages condicionales
- Solo 12 stages — el flujo real tiene más granularidad (invitación, confirmación, realización por ronda y tipo)

---

## Fase 2 — Stage-Driven Config (COMPLETADA ✅)

### Stages consolidados (21 stages)

| ApplicationStage   | `emailTemplateStage`   | `transitionMode`           | `nextStage`  |
| ------------------ | ---------------------- | -------------------------- | ------------ |
| `profile_pending`  | `null`                 | `on_cv_uploaded`           | `applied`    |
| `applied`          | `application_received` | `on_application_submitted` | —            |
| `screening`        | `null`                 | `recruiter_action`         | —            |
| `cv_submitted`     | `null`                 | `recruiter_action`         | —            |
| `schedule_hr_1`    | `sch_interview_hr_1`   | `recruiter_action`         | —            |
| `hr_1_scheduled`   | `interview_hr_1`       | `on_calendar_event`        | —            |
| `hr_1_done`        | `null`                 | `on_interview_submision`   | —            |
| `schedule_hr_2`    | `sch_interview_hr_2`   | `recruiter_action`         | —            |
| `hr_2_scheduled`   | `interview_hr_2`       | `on_calendar_event`        | —            |
| `hr_2_done`        | `null`                 | `on_interview_submision`   | —            |
| `schedule_tech_1`  | `sch_interview_tech_1` | `recruiter_action`         | —            |
| `tech_1_scheduled` | `interview_tech_1`     | `on_calendar_event`        | —            |
| `tech_1_done`      | `null`                 | `on_interview_submision`   | —            |
| `schedule_tech_2`  | `sch_interview_tech_2` | `recruiter_action`         | —            |
| `tech_2_scheduled` | `interview_tech_2`     | `on_calendar_event`        | —            |
| `tech_2_done`      | `null`                 | `on_interview_submision`   | —            |
| `send_offer`       | `offer`                | `recruiter_action`         | `offer_sent` |
| `offer_sent`       | `null`                 | `on_offer_sent`            | —            |
| `hired`            | `hired`                | `recruiter_action`         | —            |
| `rejected`         | `rejected`             | `recruiter_action` (jump)  | —            |
| `withdrawn`        | `withdrawn`            | `recruiter_action` (jump)  | —            |

> **`cv_submitted`** se mantiene sin email, transición manual — importante para el flujo de CV upload.
> **`screening`** deja de enviar email — es revisión interna, el candidato no es notificado.

---

### Nuevo archivo: `packages/shared-types/src/models/stageConfig.ts`

#### TransitionMode — qué evento dispara la entrada a este stage

Todo stage tiene un `transitionMode` que describe el **origen del evento** que lo activa:

```typescript
export type TransitionMode =
  | 'recruiter_action' // recruiter autenticado actúa en la UI → changedBy = recruiter uid
  | 'on_application_submitted' // candidato completa y envía su postulación
  | 'on_cv_uploaded' // CV upload completado → encadena a applied
  | 'on_calendar_event' // candidato agenda via link de calendario
  | 'on_interview_submision' // entrevistador envía evaluación post-entrevista
  | 'on_offer_sent'; // email de oferta confirmado como enviado exitosamente

export interface StageConfig {
  label: string;
  emailTemplateStage: EmailTemplateStage | null; // null = no envía; valor = qué template usar
  transitionMode: TransitionMode;
  nextStage?: ApplicationStage; // encadena automáticamente cuando aplica
}

// Orden lineal — solo se puede avanzar en este array
export const PIPELINE_ORDER: ApplicationStage[] = [
  'profile_pending',
  'applied',
  'screening',
  'cv_submitted',
  'schedule_hr_1',
  'hr_1_scheduled',
  'hr_1_done',
  'schedule_hr_2',
  'hr_2_scheduled',
  'hr_2_done',
  'schedule_tech_1',
  'tech_1_scheduled',
  'tech_1_done',
  'schedule_tech_2',
  'tech_2_scheduled',
  'tech_2_done',
  'send_offer',
  'offer_sent',
  'hired',
];

// Accesibles desde cualquier stage activo, sin respetar el orden lineal
export const JUMP_STAGES: ApplicationStage[] = [
  'rejected',
  'withdrawn',
  'send_offer',
];

// Solo el sistema puede llegar aquí (no el recruiter directamente)
export const SYSTEM_ONLY_STAGES: ApplicationStage[] = ['offer_sent'];

export const STAGE_CONFIG: Record<ApplicationStage, StageConfig> = {
  profile_pending: {
    label: 'En proceso de registro',
    emailTemplateStage: null,
    transitionMode: 'on_cv_uploaded',
    nextStage: 'applied',
  },
  applied: {
    label: 'Postulación recibida',
    emailTemplateStage: 'application_received',
    transitionMode: 'on_application_submitted',
  },
  screening: {
    label: 'CV en revisión',
    emailTemplateStage: null,
    transitionMode: 'recruiter_action',
  },
  cv_submitted: {
    label: 'CV presentado a área',
    emailTemplateStage: null,
    transitionMode: 'recruiter_action',
  },
  schedule_hr_1: {
    label: 'Agendar Entrevista RRHH R1',
    emailTemplateStage: 'sch_interview_hr_1',
    transitionMode: 'recruiter_action',
  },
  hr_1_scheduled: {
    label: 'Entrevista RRHH R1 Agendada',
    emailTemplateStage: 'interview_hr_1',
    transitionMode: 'on_calendar_event',
  },
  hr_1_done: {
    label: 'Entrevista RRHH R1 Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  schedule_hr_2: {
    label: 'Agendar Entrevista RRHH R2',
    emailTemplateStage: 'sch_interview_hr_2',
    transitionMode: 'recruiter_action',
  },
  hr_2_scheduled: {
    label: 'Entrevista RRHH R2 Agendada',
    emailTemplateStage: 'interview_hr_2',
    transitionMode: 'on_calendar_event',
  },
  hr_2_done: {
    label: 'Entrevista RRHH R2 Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  schedule_tech_1: {
    label: 'Agendar Entrevista Técnica R1',
    emailTemplateStage: 'sch_interview_tech_1',
    transitionMode: 'recruiter_action',
  },
  tech_1_scheduled: {
    label: 'Entrevista Técnica R1 Agendada',
    emailTemplateStage: 'interview_tech_1',
    transitionMode: 'on_calendar_event',
  },
  tech_1_done: {
    label: 'Entrevista Técnica R1 Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  schedule_tech_2: {
    label: 'Agendar Entrevista Técnica R2',
    emailTemplateStage: 'sch_interview_tech_2',
    transitionMode: 'recruiter_action',
  },
  tech_2_scheduled: {
    label: 'Entrevista Técnica R2 Agendada',
    emailTemplateStage: 'interview_tech_2',
    transitionMode: 'on_calendar_event',
  },
  tech_2_done: {
    label: 'Entrevista Técnica R2 Realizada',
    emailTemplateStage: null,
    transitionMode: 'on_interview_submision',
  },
  send_offer: {
    label: 'Enviar Oferta',
    emailTemplateStage: 'offer',
    transitionMode: 'recruiter_action',
    nextStage: 'offer_sent',
  },
  offer_sent: {
    label: 'Oferta enviada',
    emailTemplateStage: null,
    transitionMode: 'on_offer_sent',
  },
  hired: {
    label: 'Contratado',
    emailTemplateStage: 'hired',
    transitionMode: 'recruiter_action',
  },
  rejected: {
    label: 'Rechazado',
    emailTemplateStage: 'rejected',
    transitionMode: 'recruiter_action',
  },
  withdrawn: {
    label: 'Retirado',
    emailTemplateStage: 'withdrawn',
    transitionMode: 'recruiter_action',
  },
};
```

---

### `changedBy` — auditoría y Gmail sender

El campo `changedBy` en `StageHistoryEntry` cumple dos roles:

1. **Auditoría** — quién o qué sistema generó el cambio de stage
2. **Gmail sender** — el `uid` en `changedBy` determina desde qué cuenta Gmail sale el correo

Para transiciones automáticas encadenadas (ej: `send_offer → offer_sent`), `changedBy` se hereda del recruiter que disparó el evento raíz. Para triggers de sistema (`on_cv_uploaded`, `on_calendar_event`, etc.), `changedBy` es el `actorId` que incluye el evento.

---

### Cómo el servicio resuelve el target de transiciones automáticas

Cuando múltiples stages comparten el mismo `transitionMode` (ej: `on_calendar_event` se repite para `hr_1_scheduled`, `hr_2_scheduled`, `tech_1_scheduled`, `tech_2_scheduled`), el servicio deriva el target usando el stage actual + `PIPELINE_ORDER`:

```typescript
function findNextStageForTrigger(
  currentStage: ApplicationStage,
  trigger: TransitionMode,
): ApplicationStage | null {
  const currentIdx = PIPELINE_ORDER.indexOf(currentStage);
  for (let i = currentIdx + 1; i < PIPELINE_ORDER.length; i++) {
    const candidate = PIPELINE_ORDER[i];
    if (STAGE_CONFIG[candidate].transitionMode === trigger) {
      return candidate;
    }
  }
  return null;
}
```

Ejemplo en ejecución:

```
App en schedule_hr_1  → llega on_calendar_event → next = hr_1_scheduled  ✓
App en schedule_tech_2 → llega on_calendar_event → next = tech_2_scheduled ✓
```

---

### Validación de transiciones

```typescript
// apps/functions/src/validators/updateApplicationValidator.ts

export function isValidTransition(
  current: ApplicationStage,
  next: ApplicationStage,
): boolean {
  if (SYSTEM_ONLY_STAGES.includes(next)) return false;
  if (JUMP_STAGES.includes(next)) return true;
  const ci = PIPELINE_ORDER.indexOf(current);
  const ni = PIPELINE_ORDER.indexOf(next);
  return ni > ci;
}
```

---

### Lógica de transiciones automáticas en el callable

El callable (`updateApplication.ts`) orquesta la secuencia completa:

```
── Para recruiter_action (UI):
1. Recruiter llama updateApplicationStage({ applicationId, stage })
2. isValidTransition(current, new) → 403 si inválida
3. updateApplicationService.transition(stage, changedBy) → Firestore + stageHistory
4. emailSent = await stageEmailService.sendIfTemplateExists(stage, changedBy, ...)
   ├─ STAGE_CONFIG[stage].emailTemplateStage → null: skip
   └─ valor: busca template, resuelve variables, envía desde Gmail de changedBy, loguea
5. Si STAGE_CONFIG[stage].nextStage existe && emailSent:
   → encadenar transición a nextStage con changedBy heredado (ej: send_offer → offer_sent)

── Para triggers automáticos (on_cv_uploaded, on_calendar_event, etc.):
1. Evento llega al handler con { applicationId, trigger, actorId }
2. nextStage = findNextStageForTrigger(currentStage, trigger)
3. isValidTransition(current, nextStage) → descartar si inválida
4. Mismo flujo desde paso 3 de arriba, con changedBy = actorId del evento
```

---

### Historial: stageHistory como fuente única

El historial de la aplicación muestra **solo `stageHistory`**. No se mergea con `emailLogs`.

La progresión de stages es autosuficiente para contar la historia de comunicaciones:

- `schedule_hr_1` en historial → se envió la invitación RRHH R1
- `hr_1_scheduled` en historial → candidato recibió y agendó la entrevista
- `send_offer` en historial → se inició envío de oferta
- `offer_sent` en historial → email de oferta llegó exitosamente (auto-transición confirmada)

Para stages con `emailTemplateStage !== null`, el frontend muestra un ícono de email en la entrada del historial, derivado de `STAGE_CONFIG` (sin consulta adicional a `emailLogs`).

**Comunicaciones fallidas (panel separado):**

- Query: `emailLogs` donde `applicationId = X` AND `status = 'failed'`
- Muestra: nombre del template, fecha del intento, mensaje de error
- Acción: botón **Reintentar** por entrada

---

### `EmailTemplateStage` actualizado

```typescript
// packages/shared-types/src/models/emailTemplate.ts

export type EmailTemplateStage =
  | 'application_received'
  | 'sch_interview_hr_1'
  | 'interview_hr_1'
  | 'sch_interview_hr_2'
  | 'interview_hr_2'
  | 'sch_interview_tech_1'
  | 'interview_tech_1'
  | 'sch_interview_tech_2'
  | 'interview_tech_2'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

// Eliminados respecto a Fase 1: 'screening', 'interview_hr', 'interview_technical'
// APPLICATION_TO_EMAIL_STAGE_MAP eliminado — reemplazado por STAGE_CONFIG[stage].emailTemplateStage
```

---

## Archivos a modificar (Fase 2)

### Shared types

| Archivo                                             | Cambio                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/shared-types/src/models/application.ts`   | Reemplazar `ApplicationStage` con 21 stages                                                     |
| `packages/shared-types/src/models/emailTemplate.ts` | Actualizar `EmailTemplateStage`; eliminar `APPLICATION_TO_EMAIL_STAGE_MAP`                      |
| `packages/shared-types/src/models/stageConfig.ts`   | **Nuevo:** `StageConfig`, `STAGE_CONFIG`, `PIPELINE_ORDER`, `JUMP_STAGES`, `SYSTEM_ONLY_STAGES` |
| `packages/shared-types/src/index.ts`                | Exportar `stageConfig`                                                                          |

### Backend (functions)

| Archivo                                                       | Cambio                                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/functions/src/services/stageEmailService.ts`            | Usar `STAGE_CONFIG[stage].emailTemplateStage`; retornar `boolean` de éxito                                                              |
| `apps/functions/src/services/updateApplicationService.ts`     | Encadenar `immediate` y `on_email_sent` automáticamente                                                                                 |
| `apps/functions/src/validators/updateApplicationValidator.ts` | Agregar `isValidTransition()`; rechazar `SYSTEM_ONLY_STAGES`                                                                            |
| `apps/functions/src/repositories/emailLogRepository.ts`       | Agregar `findFailedByApplication(applicationId)`                                                                                        |
| Seed services                                                 | Reescribir seed con nuevos stages; aplicaciones avanzadas incluyen `stageHistory` completo + `emailLogs` por cada stage que envió email |

### Frontend (web)

| Archivo                                                   | Cambio                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/app/features/pipeline/constants/stageLabels.ts` | Derivar desde `STAGE_CONFIG` (eliminar mapa hardcodeado)                                           |
| History component/hook                                    | Mostrar `stageHistory` con ícono de email cuando `STAGE_CONFIG[stage].emailTemplateStage !== null` |
| Panel de comunicaciones fallidas                          | Componente nuevo con botón de reintento por entrada fallida                                        |

---

## Estado de implementación

| Fase       | Etapa                                                                                  | Estado |
| ---------- | -------------------------------------------------------------------------------------- | ------ |
| **Fase 1** | 1 — Shared types (stage map, variables, EmailLog)                                      | ✅     |
| **Fase 1** | 2 — Gmail OAuth con refresh token                                                      | ✅     |
| **Fase 1** | 3 — TemplateResolverService                                                            | ✅     |
| **Fase 1** | 4 — GmailSenderService + mock mode                                                     | ✅     |
| **Fase 1** | 5 — Trigger de etapa + EmailLog                                                        | ✅     |
| **Fase 1** | 6 — UI historial de comunicaciones + reintento                                         | ✅     |
| **Fase 1** | 7 — Migración emailTemplates a Firestore                                               | ✅     |
| **Fase 2** | 8 — `stageConfig.ts`: `STAGE_CONFIG`, `PIPELINE_ORDER`, tipos                          | ✅     |
| **Fase 2** | 9 — `ApplicationStage` expandido a 21 stages                                           | ✅     |
| **Fase 2** | 10 — `EmailTemplateStage` actualizado; eliminar `APPLICATION_TO_EMAIL_STAGE_MAP`       | ✅     |
| **Fase 2** | 11 — Validación forward-only + jump stages en backend                                  | ✅     |
| **Fase 2** | 12 — Transiciones automáticas (`findNextStageForTrigger`, `on_offer_sent`) en callable | ✅     |
| **Fase 2** | 13 — `stageEmailService` consume `STAGE_CONFIG`                                        | ✅     |
| **Fase 2** | 14 — Frontend: `stageLabels` derivado de `STAGE_CONFIG` + ícono email                  | ✅     |
| **Fase 2** | 15 — Panel de comunicaciones fallidas (reemplaza/extiende historial Fase 1)            | ✅     |
| **Fase 2** | 16 — Nuevo seed data con 21 stages + historial completo                                | ✅     |

---

## Verificación end-to-end (Fase 2)

1. `tsc --noEmit` en `packages/shared-types` y `apps/functions` — sin errores de tipo
2. `profile_pending` → auto-transiciona a `applied` → `emailLogs` con `status='sent'` template `application_received`
3. `screening` → no crea `emailLog` (cambio de comportamiento respecto a Fase 1)
4. `schedule_hr_1` → crea `emailLog` con template `sch_interview_hr_1`
5. Intentar retroceder (ej: `hr_1_done` → `applied`) → 400 error de validación
6. Desde `hr_1_done` mover a `rejected` → válido (jump stage)
7. Intentar mover directamente a `offer_sent` → rechazado (SYSTEM_ONLY)
8. `send_offer` → email enviado → auto-transición a `offer_sent` — dos entradas en `stageHistory`
9. Email fallido: aparece en panel de "Comunicaciones fallidas", **no** en el timeline del historial
10. Seed con aplicación en `tech_1_done`: historial tiene entradas para todos los stages previos + `emailLogs` para cada stage que envió email en ese camino

---

## Guía de prueba en emulator

```bash
firebase emulators:start --only auth,functions,firestore,storage --import=./emulator-data --export-on-exit
pnpm compile-fn -- --watch
pnpm dev-web
```

Con `GMAIL_MOCK=true` en `apps/functions/.env` se puede probar el flujo completo sin cuenta Gmail real. Ver `docs/email-templates-plan.md` para la guía detallada de OAuth real y pruebas de retry.
