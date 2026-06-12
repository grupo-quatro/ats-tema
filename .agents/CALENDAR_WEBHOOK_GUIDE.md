# Fase 4: Detección de eventos de Google Calendar

**Estado:** Pendiente de implementación — esta guía está pensada para que una nueva persona pueda implementarla de forma independiente.

**Prerequisito:** La Fase 3 (Google Calendar OAuth) debe estar completa. El recruiter debe tener `users/{uid}.calendarCredential` guardado en Firestore.

---

## Objetivo

Cuando un recruiter envía el email de coordinación de entrevista a un candidato (ej: etapa `schedule_hr_1`), el email contiene el link de agenda del recruiter (`calendarLink`). El candidato hace click y reserva un horario. El sistema debe **detectar automáticamente** cuando ese evento fue agendado y transicionar la aplicación a la etapa siguiente (`hr_1_scheduled`), sin que el recruiter tenga que hacerlo manualmente.

---

## Lógica de funcionamiento

### Flujo completo

```
1. Recruiter mueve candidato a etapa "schedule_hr_1"
2. Sistema envía email con calendarLink (ej: https://calendar.google.com/calendar/appointments/...)
3. Candidato hace click en el link y reserva un horario
4. Google Calendar crea un evento en el calendario del recruiter
5. Google Calendar envía notificación push a nuestro webhook (Cloud Function)
6. Webhook detecta el nuevo evento
7. Webhook busca el candidato por email en los asistentes del evento
8. Webhook encuentra la aplicación activa en etapa de scheduling
9. Webhook llama a updateApplicationStage → transición a "hr_1_scheduled"
10. Sistema envía email de confirmación al candidato
```

### Cómo asociar el evento al candidato

**Opción A (recomendada): match por email del asistente**

Cuando el candidato reserva en la agenda del recruiter, Google Calendar crea el evento con el email del candidato como asistente. El webhook busca en Firestore:

```
candidates WHERE email == attendee.email
→ applications WHERE candidateId == candidate.id AND status == 'active' AND stage IN scheduling_stages
```

**Opción B: applicationId en el link (más precisa)**

Al generar el `calendarLink` en el email, se agrega el `applicationId` como parámetro de URL. Google Appointments/Calendar permite pre-poblar el campo "notas" del evento. El webhook lee ese campo para identificar la aplicación exacta.

Ejemplo de link generado:

```
https://calendar.google.com/calendar/appointments/xxx?description=ats-app-{applicationId}
```

Se recomienda implementar Opción A primero y migrar a B si hay colisiones (candidato con múltiples aplicaciones activas simultáneas).

---

## Archivos a crear

### 1. `apps/functions/src/callables/registerCalendarWatch.ts`

Registra un canal de notificaciones push de Google Calendar para el calendario de un recruiter. Debe llamarse una vez cuando el recruiter conecta su calendario (Fase 3).

```typescript
// Lógica:
// 1. requireAuthenticatedUser(request) → uid
// 2. Leer calendarCredential de users/{uid} y refreshear si expiró
//    (mismo patrón refreshIfNeeded que stageEmailService.ts)
// 3. Llamar Google Calendar API: calendar.channels.watch({
//      calendarId: 'primary',
//      requestBody: {
//        id: uid + '-channel',  // id único del canal
//        type: 'web_hook',
//        address: 'https://{region}-{projectId}.cloudfunctions.net/calendarWebhook',
//        expiration: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 días
//      }
//    })
// 4. Guardar channelId + resourceId en users/{uid}.calendarWatch para poder renovar/cancelar
// 5. Nota: los canales de Google Calendar expiran en max 30 días → necesita renovación
```

**Renovación:** Usar un Cloud Function scheduled (`onSchedule`) que corra cada 29 días y renueve todos los canales activos. Ejemplo: `apps/functions/src/scheduled/renewCalendarWatches.ts`.

---

### 2. `apps/functions/src/callables/calendarWebhook.ts`

Endpoint receptor de las notificaciones push de Google Calendar.

```typescript
// Este handler es llamado por Google, no por el frontend.
// Headers importantes que envía Google:
//   X-Goog-Channel-ID: el channelId que registramos
//   X-Goog-Resource-State: 'sync' (primera notif) | 'exists' (evento creado/modificado)
//   X-Goog-Channel-Token: token de seguridad opcional (si lo configuramos)

// Lógica:
// 1. Verificar que viene de Google (validar X-Goog-Channel-ID en nuestra colección)
// 2. Si resourceState === 'sync': responder 200 sin hacer nada (notif de setup)
// 3. Obtener el channelId → resolver el uid del recruiter desde users/{uid}.calendarWatch
// 4. Obtener el access token (calendarCredential) y refreshear si expiró.
//    Usar el mismo patrón de refreshIfNeeded que tiene stageEmailService.ts:
//      - Si credential.expiresAt <= Date.now() + BUFFER_MS:
//          oauth2Client.setCredentials({ refresh_token: credential.refreshToken })
//          const { tokens } = await oauth2Client.refreshAccessToken()
//          await userRepository.updateCalendarCredential(uid, { ...tokens })
//    El refresh es automático — el recruiter no necesita reconectar Calendar
//    salvo que revoque el acceso en myaccount.google.com o que el refreshToken
//    expire por inactividad (política de Google: 6 meses sin uso).
// 5. Llamar Calendar API: calendar.events.list({
//      calendarId: 'primary',
//      updatedMin: hace 2 minutos,
//      singleEvents: true
//    })
// 6. Para cada evento nuevo: buscar candidato por email del asistente
// 7. Si se encuentra candidato con aplicación activa en etapa de scheduling:
//    → llamar updateApplicationStage(applicationId, trigger: 'on_calendar_event')
// 8. Guardar calendarEventId en applications/{id}
```

---

### 3. `packages/shared-types/src/models/application.ts`

Agregar campo:

```typescript
interface Application {
  // ... campos existentes ...
  calendarEventId?: string; // ID del evento de Google Calendar asociado
}
```

---

### 4. `apps/functions/src/repositories/userRepository.ts`

Agregar métodos:

```typescript
interface IUserRepository {
  // ... métodos existentes (getGmailCredential, updateGmailCredential) ...
  getCalendarCredential(uid: string): Promise<CalendarCredential | null>;
  updateCalendarCredential(
    uid: string,
    credential: CalendarCredential,
  ): Promise<void>;
  saveCalendarWatch(uid: string, watch: CalendarWatch): Promise<void>;
  getCalendarWatchByChannelId(
    channelId: string,
  ): Promise<{ uid: string; watch: CalendarWatch } | null>;
}

interface CalendarWatch {
  channelId: string;
  resourceId: string;
  expiresAt: number;
}
```

---

## Etapas de scheduling y sus siguientes etapas

El webhook debe saber qué etapa asignar según la etapa actual de la aplicación:

| Etapa actual (candidato pendiente de confirmar) | Trigger             | Siguiente etapa    |
| ----------------------------------------------- | ------------------- | ------------------ |
| `schedule_hr_1`                                 | `on_calendar_event` | `hr_1_scheduled`   |
| `schedule_hr_2`                                 | `on_calendar_event` | `hr_2_scheduled`   |
| `schedule_tech_1`                               | `on_calendar_event` | `tech_1_scheduled` |
| `schedule_tech_2`                               | `on_calendar_event` | `tech_2_scheduled` |

Esta lógica ya existe en `STAGE_CONFIG` — usar `findNextStageForTrigger(currentStage, 'on_calendar_event')` de `packages/shared-types/src/models/stageConfig.ts`.

---

## Detección de token revocado (mismo patrón que Gmail)

Al igual que con Gmail, el `refreshToken` de Calendar puede ser revocado por el recruiter o invalidado por Google (+6 meses sin uso). Implementar el mismo patrón que ya existe en `stageEmailService.ts`:

**shared-types — `packages/shared-types/src/models/employee.ts`:**

```typescript
// Agregar junto a gmailStatus:
calendarStatus?: GmailStatus; // reutilizar el mismo tipo y GMAIL_STATUS
```

**`employeeRepository.ts` — `apps/functions/src/repositories/employeeRepository.ts`:**

```typescript
setCalendarStatus(uid: string, status: GmailStatus): Promise<void>;
```

**`calendarWebhook.ts`** — en el `catch` del refresh del token (paso 4):

```typescript
const isRevoked =
  error instanceof Error && error.message.includes('invalid_grant');
if (isRevoked) {
  await employeeRepository.setCalendarStatus(uid, GMAIL_STATUS.DISCONNECTED);
}
```

**`exchangeCalendarCodeService.ts`** — al reconectar exitosamente:

```typescript
await employeeRepository?.setCalendarStatus(uid, GMAIL_STATUS.CONNECTED);
```

**Sidebar** — mostrar banner similar al de Gmail cuando `employee.calendarStatus === GMAIL_STATUS.DISCONNECTED`, sobre el `ConnectCalendarButton`.

---

## Consideraciones de seguridad

- Los webhooks de Google Calendar son públicos (no tienen autenticación Bearer). **Validar siempre** que el `X-Goog-Channel-ID` existe en nuestra colección `users/{uid}.calendarWatch` antes de procesar.
- Configurar `X-Goog-Channel-Token` en el registro del canal como capa adicional de verificación.
- No loguear el contenido completo de los eventos (pueden tener información privada del candidato).

---

## Variables de entorno necesarias

Las mismas que para Calendar OAuth (Fase 3):

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

El `WEBHOOK_URL` del Cloud Function se obtiene automáticamente del deploy de Firebase Functions. Para desarrollo local con el emulador, usar `ngrok` o similar para exponer el endpoint.

---

## Testing

1. **Emulador:** Google no puede hacer push a localhost. Simular la llamada al webhook manualmente:

```bash
curl -X POST http://localhost:5001/{projectId}/{region}/calendarWebhook \
  -H "X-Goog-Channel-ID: test-channel-id" \
  -H "X-Goog-Resource-State: exists" \
  -H "Content-Type: application/json"
```

2. **Tests unitarios:** mockear el Calendar API client y verificar que:
   - Un evento con email de candidato conocido actualiza la etapa correctamente
   - Un evento sin candidato asociado no genera cambios
   - La renovación del canal funciona antes de la expiración

---

## Orden de implementación sugerido

1. Agregar `calendarEventId` a `Application` en shared-types
2. Agregar métodos de `calendarWatch` a `userRepository`
3. Crear `registerCalendarWatch` callable + llamarlo al completar OAuth de Calendar (Fase 3)
4. Crear `calendarWebhook` handler
5. Crear `renewCalendarWatches` scheduled function
6. Tests
