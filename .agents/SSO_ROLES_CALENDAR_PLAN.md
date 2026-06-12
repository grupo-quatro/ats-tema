# Plan: SSO + Role Onboarding + Calendar Link + Event Monitoring

## Context

Actualmente los nuevos usuarios que hacen login con Google SSO quedan en estado "Acceso pendiente" hasta que un admin les asigna un rol manualmente vía Cloud Function. No existe UI de selección de rol, ni campo de link de calendario, ni integración con Google Calendar para detectar eventos agendados.

Se necesita:

1. Que los usuarios se auto-asignen su rol (recruiter / manager) en el primer login.
2. Para recruiters: un campo `calendarLink` (URL de su agenda personalizada, ej. Calendly o Google Appointments) que se use en las comunicaciones automáticas a candidatos.
3. Que ese link se pueda editar desde el front asociado al usuario (ABM mínimo).
4. (Segunda funcionalidad) Acceso a Google Calendar OAuth para detectar eventos agendados y asociarlos a un candidato.

---

## Mapeo de roles

| Término usuario | `EmployeeRole` | Cómo se asigna                        |
| --------------- | -------------- | ------------------------------------- |
| Recruiter       | `hr`           | Auto-selección en primer login (SSO)  |
| Área líder      | `area_leader`  | Auto-selección en primer login (SSO)  |
| Admin           | `admin`        | Cuenta manual email/password — no SSO |

> **Cambio de modelo:** `hiring_manager` → `area_leader`. `admin` existe pero NO es auto-asignable: es una cuenta separada creada manualmente con email/password que actúa como moderador.

---

## Fase 1 — Auto-selección de rol en primer login

### Backend: nuevo callable `setUserRoleOnboarding`

**Archivo nuevo:** `apps/functions/src/callables/setUserRoleOnboarding.ts`

Lógica:

- Autenticado (requiere `requireAuthenticatedUser`)
- Solo acepta roles `['hr', 'area_leader']`
- Verifica en Firestore que `employees/{uid}.role === null` antes de actuar (evita re-escalación)
- Llama a `adminAuth.setCustomUserClaims(uid, { role })`
- Hace `ref.update({ role, active: true, updatedAt: new Date() })`
- Exportar en `apps/functions/src/index.ts`

**Contrato en shared-types:** `packages/shared-types/src/contracts/auth.ts`

```typescript
interface SetUserRoleOnboardingRequest {
  role: 'hr' | 'area_leader';
}
interface SetUserRoleOnboardingResponse {
  success: boolean;
}
```

### Frontend: nueva página de selección de rol

**Archivo nuevo:** `apps/web/app/login/select-role/page.tsx`

- Protegida: solo accesible si `user !== null && role === null`
- Muestra dos cards: **Recruiter** y **Manager**
- Al seleccionar:
  1. POST a `setUserRoleOnboarding` con el rol elegido
  2. Fuerza refresh del token: `await firebaseUser.getIdToken(true)`
  3. Llama a `setSessionCookie(newToken, selectedRole)` (función existente en authContext)
  4. Si recruiter → redirect a `/login/connect-calendar` (Fase 3)
  5. Si manager → redirect a `/dashboard/positions`

### Cambios en `authContext.tsx`

**Archivo:** `apps/web/app/shared/lib/authContext.tsx`

- Agregar `needsRoleSelection: boolean` al contexto (actualmente se llama `isPendingApproval`)
- Exponer función `completeRoleOnboarding(role)` que ejecuta los pasos 1-3 del punto anterior

### Cambios en `login/page.tsx`

**Archivo:** `apps/web/app/login/page.tsx`

- Eliminar completamente `PendingApprovalCard` y el estado `isPendingApproval`
- Cuando el usuario se loguea sin rol existente → redirect directo a `/login/select-role`
- Agregar segunda sección en la página: **login con email/password para admin** (debajo del botón Google, colapsado o en link "Acceso administrador")

### Admin con email/password

**Sin cambios en SSO.** El admin usa email/password de Firebase Auth, creado manualmente:

```bash
# Crear admin en Firebase Console → Authentication → Add user
# Luego setear custom claim desde script:
adminAuth.setCustomUserClaims(uid, { role: 'admin' })
```

**Capacidades del admin (nuevas pantallas a crear):**

- Ver listado de todos los empleados (`/dashboard/admin/employees`)
- Eliminar un empleado: elimina doc de `employees/{uid}` + revoca la cuenta de Firebase Auth (`adminAuth.deleteUser(uid)`)

**Callable nuevo:** `apps/functions/src/callables/deleteEmployee.ts`

- Requiere rol `admin`
- `adminAuth.deleteUser(targetUid)`
- `db.collection('employees').doc(targetUid).delete()`

### Cambios en `middleware.ts`

**Archivo:** `apps/web/middleware.ts`

- Permitir `/login/select-role` y `/login/connect-calendar` para usuarios con sesión activa pero sin rol (`ats-session` presente, `ats-role` ausente)
- Redirigir a `/login/select-role` si `ats-session` existe pero `ats-role` no (en lugar de dejar caer al usuario en login)

---

## Fase 2 — Campo `calendarLink` en empleado

### shared-types

**Archivo:** `packages/shared-types/src/models/employee.ts`

```typescript
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  active: boolean;
  calendarLink?: string; // ← NUEVO: URL de agenda personalizada del recruiter
  createdAt: Date;
  updatedAt: Date;
}
```

### Backend: callable `updateEmployeeCalendarLink`

**Archivo nuevo:** `apps/functions/src/callables/updateEmployeeCalendarLink.ts`

Lógica:

- Requiere autenticación
- Solo puede actualizar el link del propio `uid`
- Valida que `calendarLink` sea una URL válida (o cadena vacía para borrar)
- Hace `db.collection('employees').doc(uid).update({ calendarLink, updatedAt })`

**Contrato en shared-types:** `packages/shared-types/src/contracts/employee.ts` (crear si no existe)

```typescript
interface UpdateCalendarLinkRequest {
  calendarLink: string;
}
```

### Resolver de templates — resolver el TODO

**Archivo:** `apps/functions/src/services/stageEmailService.ts` — línea 74

Actualmente:

```typescript
calendarLink: '', //TODO: add calenndar link variable from logged user
```

Cambio:

1. El `userRepository` (existente) necesita un método `getCalendarLink(uid): Promise<string>` que lea `employees/{uid}.calendarLink`
2. En `StageEmailService.sendIfTemplateExists`, hacer fetch del campo y pasarlo al contexto:

```typescript
const [orgConfig, credential, calendarLink] = await Promise.all([
  this.orgConfigRepository.get(),
  this.userRepository.getGmailCredential(recruiterId),
  this.employeeRepository.getCalendarLink(recruiterId),   // ← NUEVO
]);
// ...
calendarLink: calendarLink ?? '',
```

**Repositorio afectado:** `apps/functions/src/repositories/employeeRepository.ts` (o crear si no existe separado)

- Agregar `getCalendarLink(uid: string): Promise<string | null>`

### Botón de "Reservar una cita" en email templates

Los clientes de email **no ejecutan JavaScript**, por lo que el snippet de Google Calendar Scheduling Button (`<script>`) no puede usarse en emails.

**Solución:** Los templates de entrevista (ej: `sch_interview_hr_1`) deben incluir un link HTML estilizado como botón que apunte a `[CALENDAR_LINK]`:

```html
<a
  href="[CALENDAR_LINK]"
  style="display:inline-block;background-color:#F4511E;color:#ffffff;
          font-family:sans-serif;font-size:14px;font-weight:600;
          text-decoration:none;padding:12px 24px;border-radius:6px;"
>
  Reservar una cita
</a>
```

La URL almacenada en `calendarLink` es la URL de Google Calendar Appointments del tipo:
`https://calendar.google.com/calendar/appointments/schedules/AcZssZ...?gv=true`

**Cambios en Fase 2:**

- Actualizar los templates de email por defecto (seed data) para las etapas de scheduling que incluyan el snippet de botón con `[CALENDAR_LINK]`
- En el editor de templates del front, el botón "Insertar variable" para `[CALENDAR_LINK]` debe insertar el snippet HTML completo del botón (no solo el texto del link)

### Frontend: edición del link (ABM mínimo)

**Dónde:** Nuevo componente `CalendarLinkEditor` que se monta en la sección de perfil/settings del Sidebar (junto al botón `ConnectGmailButton` existente).

**Archivo nuevo:** `apps/web/app/features/calendar/components/CalendarLinkEditor.tsx`

UI:

- Input de texto con label "Link de agenda"
- Botón Guardar
- Llama a `updateEmployeeCalendarLink` vía `shared/api/`
- Visible solo para usuarios con rol `hr`

**Sidebar:** `apps/web/app/components/sidebar/Sidebar.tsx`

- Agregar `<CalendarLinkEditor />` debajo de `<ConnectGmailButton />`, condicionado a `role === 'hr'`

---

## Fase 3 — Google Calendar OAuth (recruiters)

### ¿Se pueden pedir los permisos durante el SSO?

**Respuesta corta: sí podemos pedir los scopes en el mismo popup de Google, pero no obtenemos `refreshToken`.**

Firebase `signInWithPopup` con `googleProvider.addScope(...)` muestra todos los permisos en un solo consentimiento. Sin embargo, el resultado solo expone un `accessToken` de corta duración (~1 hora). Para que el backend pueda enviar emails y leer el calendario 24/7 (incluso cuando el usuario no está logueado), necesitamos un `refreshToken` persistente — que requiere un flujo OAuth separado con `access_type: 'offline'`.

**Diseño propuesto (UX fluida, dos flows técnicos):**

1. SSO popup: autenticación + datos de identidad (igual que hoy)
2. Inmediatamente después de seleccionar rol recruiter → **sin nueva pantalla**, mostrar automáticamente el Google OAuth consent para Gmail + Calendar. El usuario solo ve una segunda ventana de permisos que aparece enseguida — se siente como parte del mismo flujo.

Esta segunda ventana usa el flow existente `exchangeGmailCode` (extendido para incluir scopes de Calendar).

### Flujo UX

Al seleccionar "Recruiter" en la pantalla de selección de rol → se lanza automáticamente el OAuth consent de Google con todos los scopes juntos (Gmail + Calendar). El usuario ve una segunda ventana de Google que aparece inmediatamente sin cambiar de pantalla.

**Scopes solicitados en el OAuth consent (extendiendo el flow existente):**

```
https://mail.google.com/                                       (Gmail — ya existe)
https://www.googleapis.com/auth/calendar.readonly              (leer eventos)
https://www.googleapis.com/auth/calendar.events.readonly       (leer detalles de eventos)
```

**Cambio en `exchangeGmailCode`:** Extender este callable existente para que también guarde `calendarCredential` si los scopes de Calendar están presentes en la respuesta. Alternativamente, crear `exchangeGoogleCode` que unifica los dos.

**Nuevo callable (opción unificada):** `apps/functions/src/callables/exchangeGoogleCode.ts`

- Recibe `{ code, redirectUri }`
- Intercambia por tokens (access + refresh) que incluyen todos los scopes
- Guarda `users/{uid}.gmailCredential` + `users/{uid}.calendarCredential` en el mismo write

**shared-types:** `User` model → agregar `calendarCredential?: GmailCredential` (mismo tipo, distinto campo)

### Frontend

**`apps/web/app/login/select-role/page.tsx`:**

- Al seleccionar "Recruiter" → disparar el OAuth popup de Google con todos los scopes antes de redirigir al dashboard
- Al seleccionar "Área Líder" → redirigir directo al dashboard (sin OAuth de calendario)

No se necesita página `connect-calendar` separada. Los botones de conectar Gmail/Calendar en el sidebar quedan como fallback si el usuario omite u omitió el paso.

### Detección de refresh token revocado (mejora de alta valor)

El sistema ya refresca el `accessToken` automáticamente en cada envío de email (`refreshIfNeeded` en `stageEmailService.ts`). El recruiter **nunca necesita hacer nada** en el uso diario.

El único caso que requiere acción es si el `refreshToken` fue revocado (cambio de contraseña de Google, revocación manual, o +6 meses de inactividad). Hoy eso solo queda registrado como `emailLog.status = 'failed'` y el recruiter no recibe ninguna alerta activa.

**Cambios a incluir en Fase 3:**

1. **Backend — identificar el error de token revocado:**
   En `stageEmailService.ts`, en el `catch` de `refreshIfNeeded`, detectar si el error es de tipo `invalid_grant` (token revocado) vs. error de red u otro. Marcar el `emailLog` con un campo extra: `error: 'TOKEN_REVOKED'`.

2. **Backend — nuevo campo en Employee:**
   `gmailStatus?: 'connected' | 'disconnected'` en `employees/{uid}`. Se setea a `'disconnected'` cuando se detecta `TOKEN_REVOKED`. Se resetea a `'connected'` cuando el recruiter reconecta.

3. **Frontend — banner en Sidebar:**
   Leer `gmailStatus` del employee actual. Si es `'disconnected'`, mostrar un banner de advertencia sobre el `ConnectGmailButton` existente:

   ```
   ⚠ Tu cuenta de Gmail fue desconectada. Reconectá para continuar enviando emails.
   [Reconectar Gmail]
   ```

   El botón dispara el mismo flow OAuth que el onboarding inicial.

4. **Archivos afectados:**
   - `apps/functions/src/services/stageEmailService.ts` — detectar `invalid_grant`
   - `packages/shared-types/src/models/employee.ts` — campo `gmailStatus?`
   - `apps/web/app/features/calendar/hooks/useEmployeeProfile.ts` — exponer `gmailStatus`
   - `apps/web/app/components/sidebar/Sidebar.tsx` — mostrar banner condicional

---

## Fase 4 — Detección de eventos de calendario (segunda funcionalidad)

Esta fase puede implementarse independientemente. Depende de que Fase 3 esté completa (OAuth guardado).

### Mecanismo propuesto: Google Calendar Push Notifications (webhook)

Cuando el recruiter envía el email de entrevista con el `calendarLink`:

1. La aplicación genera una URL única por invitación que incluye el `applicationId` como parámetro, si la herramienta lo permite (Google Appointments soporta parámetros en la URL).
2. Alternativamente: el webhook matchea el evento por **email del candidato** en los asistentes.

**Cloud Function (trigger):** `apps/functions/src/callables/registerCalendarWatch.ts`

- Registra un canal de notificaciones en la API de Google Calendar para el calendario del recruiter
- Endpoint receptor: nuevo `onRequest` en `apps/functions/src/callables/calendarWebhook.ts`

**Webhook handler:** `apps/functions/src/callables/calendarWebhook.ts`

- Recibe notificaciones de Google Calendar
- Obtiene el evento nuevo/modificado via Calendar API
- Busca en `candidates` por email del asistente externo del evento
- Si encuentra match + existe aplicación activa en etapa de scheduling → llama a `updateApplicationStage` con el trigger `on_calendar_event`
- Registra el `eventId` en `applications/{id}` para auditoría

**Nuevo campo en Application:** `calendarEventId?: string`

> **Nota:** Esta fase requiere una decisión sobre cómo asociar el evento al `candidateId`. La opción más robusta es pasar el `applicationId` como parámetro en el link de agenda enviado al candidato.

---

## Renombre global: `hiring_manager` → `area_leader`

El cambio de enum afecta varios archivos existentes:

| Archivo                                        | Cambio                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/shared-types/src/models/employee.ts` | `EmployeeRole`: reemplazar `'hiring_manager'` por `'area_leader'`, eliminar `'admin'`        |
| `apps/web/app/shared/lib/internalRoles.ts`     | `INTERNAL_ROLES`: reemplazar `'hiring_manager'` → `'area_leader'`, eliminar `'admin'`        |
| `apps/web/app/shared/lib/authContext.tsx`      | Dev account `hiring_manager` → `area_leader`, token `dev-hiring-manager` → `dev-area-leader` |
| `apps/functions/src/callables/setUserRole.ts`  | Roles válidos: reemplazar `'hiring_manager'` → `'area_leader'`, eliminar `'admin'`           |
| `apps/functions/src/core/httpAuth.ts`          | Dev UID mapping si existe `hiring-manager-dev` → `area-leader-dev`                           |
| `firestore.rules`                              | Cualquier referencia a `hiring_manager` en reglas                                            |
| `apps/web/middleware.ts`                       | Cualquier check de `hiring_manager` en cookie `ats-role`                                     |

---

## Orden de implementación recomendado

1. **Fase 2 primero** — es independiente, resuelve el TODO existente y tiene valor inmediato (los emails empiezan a incluir el link real)
2. **Fase 1** — cambia el UX de primer login (requiere probar con emulador)
3. **Fase 3** — OAuth de Calendar (sobre la base de Fase 1)
4. **Fase 4** — webhook de detección (funcionalidad avanzada, puede ser sprint separado)

---

## Archivos afectados / creados

| Archivo                                                               | Acción                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/shared-types/src/models/employee.ts`                        | Agregar `calendarLink?`                                    |
| `packages/shared-types/src/contracts/auth.ts`                         | Agregar `SetUserRoleOnboardingRequest/Response`            |
| `apps/functions/src/callables/setUserRoleOnboarding.ts`               | Crear                                                      |
| `apps/functions/src/callables/updateEmployeeCalendarLink.ts`          | Crear                                                      |
| `apps/functions/src/callables/exchangeGoogleCode.ts`                  | Crear — unifica Gmail + Calendar en un solo OAuth (Fase 3) |
| `apps/functions/src/callables/deleteEmployee.ts`                      | Crear — admin modera/elimina usuarios                      |
| `apps/functions/src/callables/calendarWebhook.ts`                     | Crear (Fase 4)                                             |
| `apps/functions/src/repositories/employeeRepository.ts`               | Agregar `getCalendarLink`                                  |
| `apps/functions/src/services/stageEmailService.ts`                    | Resolver TODO calendarLink (línea 74)                      |
| `apps/functions/src/index.ts`                                         | Exportar nuevos callables                                  |
| `apps/web/app/shared/lib/authContext.tsx`                             | Agregar `completeRoleOnboarding`, `needsRoleSelection`     |
| `apps/web/app/login/page.tsx`                                         | Redirigir a `/login/select-role` cuando sin rol            |
| `apps/web/app/login/select-role/page.tsx`                             | Crear                                                      |
| `apps/web/app/login/page.tsx`                                         | Agregar sección login email/password para admin            |
| `apps/web/app/features/calendar/components/CalendarLinkEditor.tsx`    | Crear                                                      |
| `apps/web/app/features/calendar/components/ConnectCalendarButton.tsx` | Crear (Fase 3)                                             |
| `apps/web/app/components/sidebar/Sidebar.tsx`                         | Agregar `CalendarLinkEditor` para role hr                  |
| `apps/web/middleware.ts`                                              | Permitir rutas de onboarding sin rol                       |

---

## Verificación

- **Emulador:** login con dev button "Recruiter" → debe aparecer pantalla de selección de rol → seleccionar → custom claim seteado → redirect correcto
- **Email test:** cambiar etapa de aplicación a `schedule_hr_1` → email enviado con el `calendarLink` del recruiter en lugar de cadena vacía
- **TypeScript:** `pnpm check-types` sin errores
- **Tests:** `pnpm test` — agregar test para `setUserRoleOnboarding` que valide el bloqueo de escalación a admin
