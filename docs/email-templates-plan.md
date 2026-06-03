# Plan: Email Templates — Persistencia + Envío Automático por Gmail

## Contexto

Las plantillas de email existen en el frontend (localStorage) pero no están conectadas a ningún flujo real. El objetivo es:

1. Persistirlas en Firestore (globales para la organización, editables por HR/admin)
2. Disparar un envío de correo automático cuando un candidato cambia a ciertas etapas
3. El correo sale desde la cuenta Gmail/Workspace del usuario HR que realizó el cambio
4. Variables dinámicas en el template se resuelven con datos del candidato, puesto y reclutador
5. Los envíos fallidos se registran y pueden reintentarse desde la UI

---

## Etapa 1 — Modelo de datos (shared-types)

### 1.1 Stage mapping

No todos los `ApplicationStage` tienen template asociado. Dos estados de entrevista envían email (el "scheduled"), el "\_done" no envía nada.

**Archivo:** `packages/shared-types/src/models/emailTemplate.ts`

Agregar `APPLICATION_TO_EMAIL_STAGE_MAP`:

```
applied                → application_received
profile_pending        → null
screening              → screening
cv_submitted           → null
interview_1_scheduled  → interview_hr     ← envía confirmación con link de agenda
interview_1_done       → null
interview_2_scheduled  → interview_technical  ← ídem
interview_2_done       → null
offer_sent             → offer
hired                  → hired
rejected               → rejected
withdrawn              → withdrawn
```

### 1.2 Sistema de variables extensible

Definir un registry de variables en shared-types:

```ts
export const TEMPLATE_VARIABLES = {
  CANDIDATE_NAME: {
    label: '[Nombre del Candidato]',
    description: 'Nombre completo',
  },
  POSITION_NAME: {
    label: '[Nombre de la Posición]',
    description: 'Título del puesto',
  },
  RECRUITER_NAME: {
    label: '[Nombre del Reclutador]',
    description: 'Nombre del HR responsable',
  },
  RECRUITER_EMAIL: {
    label: '[Email del Reclutador]',
    description: 'Email del reclutador',
  },
  CALENDAR_LINK: {
    label: '[Link de Agenda]',
    description: 'URL para agendar entrevista',
  },
  COMPANY_NAME: {
    label: '[Nombre de la Empresa]',
    description: 'Nombre de la organización',
  },
} as const;
```

Agregar nuevas variables = extender este objeto + implementar el resolver en `templateResolverService`.

**Campo nuevo en `users/{uid}`:** `calendarLink?: string` y `displayName: string` (ya debería existir via Firebase Auth).

### 1.3 Firestore schemas

**Colección:** `emailTemplates/{id}` — mismo shape que `EmailTemplate` en shared-types. Global.

**Colección nueva:** `emailLogs/{id}` — registro de envíos:

```ts
interface EmailLog {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateEmail: string;
  jobId: string;
  templateId: string;
  templateName: string;
  stage: ApplicationStage;
  subject: string; // resuelto (sin variables)
  body: string; // resuelto
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  recruiterId: string;
  recruiterEmail: string;
  attemptedAt: Timestamp;
  sentAt?: Timestamp;
}
```

Agregar `EmailLog` y `CreateEmailLogDTO` a `packages/shared-types`.

---

## Etapa 2 — Gmail OAuth con Refresh Token

Para tener refresh token (survives token expiry), Firebase Auth no es suficiente — se necesita el authorization code flow con `access_type=offline`.

### Flujo:

1. Frontend: el HR hace click en "Conectar Gmail" (una sola vez, desde Configuración o modal)
2. Frontend abre popup OAuth de Google con scopes `gmail.send` + `email` + `access_type=offline&prompt=consent`
3. Google retorna un **authorization code** (no access token directamente)
4. Frontend envía el code a un nuevo callable `exchangeGmailCode({ code, redirectUri })`
5. Cloud Function intercambia el code por `{ access_token, refresh_token, expires_in }` usando `google-auth-library` y las credenciales OAuth2 del servidor (env vars)
6. Guarda en Firestore `users/{uid}.gmailCredential: { accessToken, refreshToken, expiresAt }`

**Nuevo callable:** `apps/functions/src/callables/exchangeGmailCode.ts`  
**Nueva dependencia:** `google-auth-library` en `apps/functions`  
**Env vars necesarias:** `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

### En GmailSenderService:

- Leer `users/{uid}.gmailCredential`
- Si `expiresAt < now`, usar `refreshToken` para obtener nuevo `accessToken` via `OAuth2Client.refreshAccessToken()`
- Actualizar `gmailCredential` en Firestore con el nuevo accessToken + expiresAt
- Enviar email

---

## Etapa 3 — TemplateResolverService (backend)

**Archivo nuevo:** `apps/functions/src/services/templateResolverService.ts`

```ts
class TemplateResolverService {
  resolve(
    template: EmailTemplate,
    candidate: Candidate,
    job: Job,
    recruiter: { displayName: string; email: string; calendarLink?: string },
    companyName: string,
  ): { subject: string; body: string };
}
```

Itera `TEMPLATE_VARIABLES` y hace `str.replaceAll(variable.label, resolvedValue)`.  
Campo `companyName` viene de una config global en Firestore (ej: `config/org`).

---

## Etapa 4 — GmailSenderService (backend)

**Archivo nuevo:** `apps/functions/src/services/gmailSenderService.ts`

- Llama `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
- Construye mensaje MIME (`To`, `Subject`, `Content-Type: text/html; charset=utf-8`, body base64url)
- Recibe `{ accessToken, to, subject, htmlBody }`
- Lanza excepción tipada en fallo (el caller registra el log)

---

## Etapa 5 — Trigger en cambio de etapa + EmailLog

**Archivo a modificar:** `apps/functions/src/services/updateApplicationService.ts`

Tras el `update()` exitoso:

```
1. Mapear newStage → emailTemplateStage usando APPLICATION_TO_EMAIL_STAGE_MAP
2. Si null → skip, no log
3. Buscar emailTemplate por stage en emailTemplates collection
4. Si no hay template configurado → skip, no log
5. Crear EmailLog con status='pending' (registrar intent)
6. Fetch candidate (email), job (title), recruiter (displayName, calendarLink) y config/org (companyName)
7. Resolver variables con TemplateResolverService
8. Leer users/{changedBy}.gmailCredential + refresh si expirado
9. Enviar con GmailSenderService
10. Actualizar EmailLog a status='sent' con sentAt
11. Si fallo: actualizar EmailLog a status='failed' con error message
    → El cambio de etapa NO se revierte
```

**Nuevo repositorio:** `apps/functions/src/repositories/emailLogRepository.ts`  
**Actualizar:** `apps/functions/src/repositories/userRepository.ts` → agregar `getGmailCredential(uid)`, `updateGmailCredential(uid, credential)`

---

## Etapa 6 — UI: Historial de comunicaciones + Reintento

### 6.1 Vista per-candidato (acceso principal para el reclutador)

Dentro del perfil del candidato (mismo panel que el historial de etapas), agregar tab o sección **"Comunicaciones"**:

- Lista de `emailLogs` filtrada por `candidateId`
- Columnas: fecha, etapa, asunto, estado (chip: Enviado / Fallido / Pendiente)
- Si `status='failed'`: mostrar el error y botón **"Reenviar"**
- Hooks: `useEmailLogs(candidateId)` + `useRetryEmailSend(logId)`

### 6.2 Vista global (admin / auditoría)

**Configuración → "Correos" → Historial**

- Tabla de todos los `emailLogs` con filtros por estado y fecha
- Misma acción "Reenviar" para los fallidos

**Nuevo callable:** `apps/functions/src/callables/retryEmailSend.ts`

- Carga el `EmailLog` por `logId`, usa el `subject` y `body` ya resueltos (no re-resuelve variables)
- Re-intenta el envío y actualiza el log a `sent` o `failed`

---

## Etapa 7 — Migrar emailTemplates.service.ts a Firestore

**Archivo a modificar:** `apps/web/app/features/email-templates/emailTemplates.service.ts`

- Reemplazar localStorage por Firestore SDK (colección `emailTemplates`)
- Los hooks no cambian (siguen usando React Query)

**Seed:** Los templates por defecto del servicio se pueden cargar con un script único o desde la propia UI.

**Firestore security rules:** Agregar regla para `emailTemplates` (read: all auth; write: admin/hr) y `emailLogs` (read: admin/hr; write: functions only).

---

## Archivos críticos

| Archivo                                                           | Acción                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/shared-types/src/models/emailTemplate.ts`               | Agregar `APPLICATION_TO_EMAIL_STAGE_MAP`, `TEMPLATE_VARIABLES` |
| `packages/shared-types/src/models/emailLog.ts`                    | Nuevo: `EmailLog`, `CreateEmailLogDTO`                         |
| `packages/shared-types/src/index.ts`                              | Exportar nuevos modelos                                        |
| `apps/web/app/features/email-templates/emailTemplates.service.ts` | localStorage → Firestore                                       |
| `apps/web/app/features/auth/`                                     | Agregar flujo OAuth code + llamada a `exchangeGmailCode`       |
| `apps/web/app/features/email-logs/`                               | Nueva feature: vista de historial + retry                      |
| `apps/functions/src/callables/exchangeGmailCode.ts`               | Nuevo callable                                                 |
| `apps/functions/src/callables/retryEmailSend.ts`                  | Nuevo callable                                                 |
| `apps/functions/src/services/templateResolverService.ts`          | Nuevo servicio                                                 |
| `apps/functions/src/services/gmailSenderService.ts`               | Nuevo servicio                                                 |
| `apps/functions/src/services/updateApplicationService.ts`         | Extender con trigger de email                                  |
| `apps/functions/src/repositories/emailTemplateRepository.ts`      | Nuevo repositorio                                              |
| `apps/functions/src/repositories/emailLogRepository.ts`           | Nuevo repositorio                                              |
| `apps/functions/src/repositories/userRepository.ts`               | Agregar métodos de gmail credential                            |
| Firestore security rules                                          | Agregar `emailTemplates`, `emailLogs`                          |

---

## Tests (Vitest, patrón del proyecto)

**Servicios — unit tests** (`src/services/__tests__/`):

- `templateResolverService.test.ts` — cada variable, campos faltantes (undefined → string vacío), sin mutar el template original
- `gmailSenderService.test.ts` — mock de fetch, error HTTP 401, error de red
- `updateApplicationService.test.ts` — extender los tests existentes: caso con template, sin template, fallo en envío (etapa se actualiza igual)

**Repositorios — unit tests** (`src/repositories/__tests__/`):

- `emailLogRepository.test.ts` — create, updateStatus, findFailed
- `emailTemplateRepository.test.ts` — findByStage, CRUD

**Callables — unit tests** (`src/callables/__tests__/`):

- `exchangeGmailCode.test.ts` — intercambio exitoso, code inválido, token guardado
- `retryEmailSend.test.ts` — log no encontrado, reintento exitoso, reintento fallido

**Integración:**

- `updateStageWithEmail.integration.test.ts` — flujo completo con Firestore emulator: cambio de etapa → email log creado → estado correcto

---

## Estado de implementación

| Etapa                                             | Estado | Tests    |
| ------------------------------------------------- | ------ | -------- |
| 1 — Shared types (stage map, variables, EmailLog) | ✅     | —        |
| 2 — Gmail OAuth con refresh token                 | ✅     | 6 tests  |
| 3 — TemplateResolverService                       | ✅     | 6 tests  |
| 4 — GmailSenderService + mock mode                | ✅     | 6 tests  |
| 5 — Trigger de etapa + EmailLog                   | ✅     | 12 tests |
| 6 — UI historial de comunicaciones + reintento    | ✅     | 7 tests  |
| 7 — Migración emailTemplates a Firestore          | ✅     | —        |

**Total: 196 tests (129 functions + 67 web), 0 errores de tipo.**

---

## Verificación end-to-end

1. El usuario HR conecta su cuenta Gmail desde Configuración (flujo OAuth)
2. Se crea una plantilla para `screening` con variable `[Nombre del Reclutador]`
3. Se cambia un candidato a la etapa `screening`
4. En Cloud Functions logs: confirmar que el template fue encontrado, variables resueltas, email enviado
5. El candidato recibe el correo con el nombre del reclutador resuelto
6. Si el access token está vencido: se refresca automáticamente y el envío ocurre igual
7. Si Gmail retorna error: el `EmailLog` queda en `failed`, visible en la UI de historial
8. El reclutador ve el correo fallido y presiona "Reintentar" → correo entregado, log actualizado a `sent`

---

## Guía de prueba por entorno

### Con emulator local (sin cuenta Gmail configurada)

Requiere: Firebase emulator corriendo (`firebase emulators:start ...`), `GMAIL_MOCK=true` en `apps/functions/.env`.

```bash
# 1. Levantar emuladores
firebase emulators:start --only auth,functions,firestore,storage --import=./emulator-data --export-on-exit

# 2. Compilar functions en watch mode (otra terminal)
pnpm compile-fn -- --watch

# 3. Levantar frontend
pnpm dev-web
```

**Qué se puede probar con emulator:**

- CRUD de templates en Firestore (Etapa 7)
- Trigger de etapa → EmailLog creado con `status='sent'` (mock) (Etapa 5)
- Resolución de variables en el log guardado (Etapa 3)
- Vista de historial de comunicaciones en el perfil del candidato (Etapa 6)
- Tests unitarios de todos los servicios: `pnpm test`

**Qué NO funciona en emulator:**

- El consent screen real de Google OAuth
- El intercambio real de authorization code
- El envío efectivo de email

---

### Con cuenta Gmail real (para probar el OAuth y el envío)

No necesitás Google Workspace. Una cuenta `@gmail.com` personal alcanza.

#### Paso 1 — Crear credenciales OAuth en Google Cloud Console

1. Ir a [console.cloud.google.com](https://console.cloud.google.com) → proyecto Firebase existente
2. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
3. Tipo: **Web application**
4. Authorized redirect URIs: agregar `http://localhost:3000` (y la URL de producción cuando corresponda)
5. Bajar el JSON → copiar `client_id` y `client_secret`

#### Paso 2 — Habilitar la Gmail API

1. **APIs & Services → Library → buscar "Gmail API" → Enable**

#### Paso 3 — Configurar env vars en functions

Editar `apps/functions/.env`:

```
GOOGLE_OAUTH_CLIENT_ID=<tu_client_id>
GOOGLE_OAUTH_CLIENT_SECRET=<tu_client_secret>
GMAIL_MOCK=false
```

> ⚠️ No commitear `.env` con valores reales. Está en `.gitignore` (verificar que esté).

#### Paso 4 — Configurar OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**
2. User type: **External** (para desarrollo)
3. Agregar tu email como **Test user**
4. Scopes: agregar `https://www.googleapis.com/auth/gmail.send`

#### Paso 5 — Probar el flujo completo

1. Login en la app → click "Conectar Gmail" → consent screen de Google
2. Autorizar → verificar en Firestore emulator que `users/{uid}.gmailCredential` tiene `accessToken`, `refreshToken` y `expiresAt`
3. Cambiar un candidato a una etapa con template configurado (ej: `screening`)
4. Verificar en Functions logs que el email fue procesado
5. Verificar recepción en la casilla del candidato

#### Verificar refresh token automático

```js
// En la consola del emulator, setear expiresAt en el pasado:
// Firestore emulator UI → users/{uid} → gmailCredential.expiresAt = 1
// Luego cambiar etapa → el service debe refrescar el token y enviar igual
```

---

### Prueba de Etapa 7 — Templates en Firestore (con emulator)

#### Seed de templates por defecto

La primera vez que uses el sistema con el emulator, la colección `emailTemplates` estará vacía. Cargar los templates por defecto desde la consola del navegador o desde un script:

```ts
// En la consola del browser con emulator activo:
import { seedDefaultTemplates } from '@/features/email-templates/emailTemplates.service';
await seedDefaultTemplates();
// Solo inserta si la colección está vacía
```

O desde la UI: crear templates manualmente desde la sección de Email Templates.

#### Verificar CRUD en Firestore

1. Crear una plantilla desde la UI → verificar en Firestore Emulator UI (`http://localhost:4000`) que aparece en `emailTemplates/{id}`
2. Editar la plantilla → verificar que `updatedAt` cambió
3. Eliminar → verificar que el documento desaparece
4. Verificar que los templates persisten entre recargas (ya no usa localStorage)

#### Verificar reglas de Firestore

```bash
# Desde la Emulator UI → Rules Playground
# Caso 1: usuario autenticado lee emailTemplates → debe permitir
# Caso 2: usuario con rol 'hr' escribe emailTemplates → debe permitir
# Caso 3: usuario sin rol escribe emailTemplates → debe denegar
# Caso 4: cliente intenta escribir emailLogs → debe denegar (solo Admin SDK puede)
# Caso 5: usuario con rol 'hr' lee emailLogs → debe permitir
```

#### Verificar flujo completo con mock

1. Emulator corriendo con `GMAIL_MOCK=true`
2. Crear template para stage `screening`
3. Cambiar candidato a `screening`
4. Verificar en Firestore Emulator: colección `emailLogs` tiene un nuevo documento con `status='sent'`
5. Abrir perfil del candidato → sección "Comunicaciones" → el email aparece con chip verde "Enviado"

#### Simular fallo y reintento

1. En `apps/functions/.env` setear temporalmente `GMAIL_MOCK=false` y credenciales inválidas
2. Cambiar etapa de un candidato → el EmailLog queda en `status='failed'`
3. En el perfil del candidato → "Comunicaciones" → aparece chip rojo "Fallido" con el error
4. Volver a poner credenciales válidas (`GMAIL_MOCK=true`)
5. Presionar "Reenviar" → el chip cambia a verde "Enviado"
