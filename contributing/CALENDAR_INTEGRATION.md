# Integración Google Calendar — Documentación y puntos de coordinación

## Qué hace esta feature

Cuando un reclutador cambia el stage de una postulación a `interview_1_scheduled` o
`interview_2_scheduled`, el sistema crea automáticamente un evento en Google Calendar
del reclutador que realizó el cambio, con un link de Google Meet incluido y con el
candidato como invitado.

---

## Archivos creados / modificados

### `packages/shared-types/src/models/employee.ts` — modificado

Se agregó el campo `calendarLink?: string` al interface `Employee`:

```typescript
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  active: boolean;
  calendarLink?: string; // URL de Agenda de Citas de Google Calendar del reclutador
  createdAt: Date;
  updatedAt: Date;
}
```

Cada reclutador configura su link de Agenda de Citas de Google Calendar una sola vez
en su perfil. El campo es opcional — si no está configurado, el sistema loguea una
advertencia y continúa sin crear el evento.

---

### `apps/functions/src/repositories/employeeRepository.ts` — nuevo

Repositorio para leer documentos de la colección `employees`. Por ahora expone
un solo método:

```typescript
findById(employeeId: string): Promise<Employee | null>
```

---

### `apps/functions/src/repositories/applicationRepository.ts` — modificado

Se agregó el método `getLatestStageHistoryEntry` que retorna el entry más reciente
de la subcolección `stageHistory` de una postulación:

```typescript
getLatestStageHistoryEntry(applicationId: string): Promise<StageHistoryEntry | null>
```

Este método es el que permite identificar **quién realizó el último cambio de stage**
(campo `changedBy` = uid del HR, campo `changedByEmail` = email del HR).

---

### `apps/functions/src/services/calendarService.ts` — nuevo

Servicio principal de la integración. Dado un `applicationId`:

1. Lee la postulación → obtiene `candidateId`
2. Lee el candidato → obtiene `email` y `fullName`
3. Lee el último entry de `stageHistory` → obtiene `changedBy` (uid) y `changedByEmail`
4. Lee el empleado con `changedBy` → obtiene `calendarLink`
5. Crea el evento en Google Calendar usando la Google Calendar API con
   Domain-Wide Delegation (impersonando al reclutador via su email)

**Errores manejados:**
- `CalendarServiceMissingDataError` — dato faltante (postulación, candidato, reclutador no encontrado)
- `CalendarServiceError` — fallo en la API de Google Calendar

Ninguno de estos errores revierte el cambio de stage.

---

### `apps/functions/src/triggers/onApplicationUpdated.ts` — nuevo

Trigger Firestore que escucha actualizaciones en `applications/{applicationId}`.
Solo actúa cuando el stage cambia a `interview_1_scheduled` o `interview_2_scheduled`.
Delega toda la lógica al `CalendarService`.

---

### `apps/functions/src/index.ts` — modificado

Se agregó el export del nuevo trigger:

```typescript
export { onApplicationUpdated } from './triggers/onApplicationUpdated';
```

---

### `apps/functions/.env` — nuevo (no se commitea)

Variables de entorno necesarias para la Google Calendar API:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=...
```

---

## Cómo conviven las dos features

```
HR llama a updateApplicationStage({ stage: 'interview_1_scheduled' })
        ↓
UpdateApplicationStageService escribe el nuevo stage en Firestore
        ↓
        ├── StageEmailService (tu feature)
        │     Lee APPLICATION_TO_EMAIL_STAGE_MAP
        │     Resuelve variables del template
        │     Envía email al candidato
        │
        └── onApplicationUpdated trigger (nuestra feature)
              Lee stageHistory → identifica al reclutador
              Crea evento en Google Calendar
              Candidato recibe invitación con Meet link
```

Los dos flujos son **completamente independientes**. Ninguno espera ni depende del otro.
Un fallo en uno no afecta al otro.

---

## Punto de coordinación: `[Link de Agenda]`

Tu `TEMPLATE_VARIABLES` define la variable `[Link de Agenda]`. Para resolverla,
el `TemplateResolverService` necesita el `calendarLink` del reclutador.

**Ese valor vive en `employees/{uid}.calendarLink`** — campo que ya agregamos
al modelo `Employee`.

### Cómo obtenerlo en tu TemplateResolverService

El `recruiter` que pasás al resolver debería incluir `calendarLink`:

```typescript
// En StageEmailService, al construir el recruiter para el resolver:
const recruiter = await employeesRepository.findById(changedBy);

resolve(template, candidate, job, {
  displayName: recruiter.name,
  email:       recruiter.email,
  calendarLink: recruiter.calendarLink ?? '',  // ← viene de employees
}, companyName)
```

### Fuente del `changedBy`

Para que `[Link de Agenda]` y `[Nombre del Reclutador]` correspondan al HR que
**realmente hizo el cambio** (no al `hiringManagerId` del job), recomendamos
leerlo del último entry de `stageHistory`:

```typescript
const latestEntry = await applicationsRepository.getLatestStageHistoryEntry(applicationId);
// latestEntry.changedBy    → uid del HR
// latestEntry.changedByEmail → email del HR
```

El método `getLatestStageHistoryEntry` ya existe en `ApplicationsRepository`
(lo agregamos nosotros). No necesitás implementarlo.

---

## Repositorios disponibles para reutilizar

| Repositorio | Método útil |
|---|---|
| `ApplicationsRepository` | `getLatestStageHistoryEntry(applicationId)` |
| `EmployeesRepository` | `findById(employeeId)` |

Ambos ya están implementados y siguen el patrón del proyecto.

---

## Variables de entorno necesarias (solo para nuestra feature)

Estas variables las manejamos nosotros. No necesitás configurar nada extra
para que tu feature funcione.

```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
```
