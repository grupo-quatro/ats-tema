# Configuración de Google Calendar en producción

Guía para activar el flujo de scheduling automático (FB-65/67) en el entorno de producción (`ats-tema-ort`).

---

## Prerequisitos

- Firebase Functions desplegadas al menos una vez (`firebase deploy --only functions`)
- Acceso al proyecto `ats-tema-ort` en Firebase Console
- `firebase-tools` instalado y logueado (`firebase login`)

---

## Paso 1 — Secrets en Firebase

Los secrets se guardan cifrados en Secret Manager de Google Cloud. **No van en ningún archivo del repo.**

```bash
# Si OAUTH_ENCRYPTION_KEY no existe todavía:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | firebase functions:secrets:set OAUTH_ENCRYPTION_KEY

# Secret para validar notificaciones push de Google Calendar:
firebase functions:secrets:set CALENDAR_WEBHOOK_SECRET
# → te pide que escribas el valor. Usá algo aleatorio, ej:
#   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

> Si `OAUTH_ENCRYPTION_KEY` ya estaba configurado (para Gmail), **no lo regeneres** — invalidaría todos los tokens OAuth existentes en Firestore.

---

## Paso 2 — Obtener la URL del webhook

La URL de `calendarWebhook` la asigna Firebase al deployar. Para obtenerla:

```bash
pnpm compile-fn
firebase deploy --only functions
```

Al finalizar, Firebase imprime las URLs de cada función:

```
✔  functions[calendarWebhook]: Successful create operation.
   Function URL (calendarWebhook): https://calendarwebhook-xxxxxxxxxx-uc.a.run.app
```

Copiá esa URL.

---

## Paso 3 — Configurar `CALENDAR_WEBHOOK_URL`

Crear (o editar) el archivo `apps/functions/.env.ats-tema-ort` — **no commitear**:

```env
ALLOWED_ORIGIN=https://TU_DOMINIO_O_IP
CALENDAR_WEBHOOK_URL=https://calendarwebhook-xxxxxxxxxx-uc.a.run.app
```

Luego redesplegar para que las functions levanten la variable:

```bash
firebase deploy --only functions
```

> La URL es estable entre deploys normales. Solo cambia si eliminás y recreás la función desde cero.

---

## Paso 4 — Google Cloud Console: redirect URIs

En la [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → el client OAuth del proyecto:

- **Authorized JavaScript origins**: agregar `https://TU_DOMINIO_O_IP`
- **Authorized redirect URIs**: verificar que estén los dos URIs de producción que usa la app:
  - `https://TU_DOMINIO_O_IP` (para Gmail OAuth)
  - `https://TU_DOMINIO_O_IP` (para Calendar OAuth — mismo dominio, scope diferente)

---

## Paso 5 — Verificar que funciona

### 5.1 Conectar Calendar desde la UI

1. Loguearse como recruiter en producción
2. Ir a Settings → Conectar Google Calendar
3. Completar el flujo OAuth

Verificar en Firestore (Firebase Console → Firestore → `users/{uid}`):

- `calendarCredential` → debe existir (cifrado)
- `calendarWatch.channelId` → debe tener formato `{uid}-cw-{timestamp}`
- `calendarSyncToken` → debe existir

### 5.2 Verificar el canal en logs

Firebase Console → Functions → Logs → filtrar por `registerCalendarWatch`:

```
[registerCalendarWatch] Canal registrado correctamente { uid, channelId, resourceId, expiresAt }
```

### 5.3 Verificar que Google notifica

Crear un evento en el Google Calendar del recruiter con un candidato como asistente. En logs de `calendarWebhook` debería aparecer:

```
[calendarWebhook] Cambio detectado { channelId, uid, resourceState }
[calendarWebhookService] Transicionando aplicación { applicationId, from, to }
```

---

## Renovación automática de canales

La función `renewCalendarWatches` corre **todos los días a las 3 AM UTC** y renueva los canales que vencen en menos de 2 días. No requiere intervención manual.

Para verificar que está activa: Firebase Console → Functions → `renewCalendarWatches` → ver última ejecución.

---

## Resumen de variables por entorno

| Variable                     | Local (`.env.local`)                                             | Producción                                        |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `OAUTH_ENCRYPTION_KEY`       | valor generado con `randomBytes(32)`                             | Firebase Secret (`functions:secrets:set`)         |
| `CALENDAR_WEBHOOK_SECRET`    | `local-dev-secret`                                               | Firebase Secret (`functions:secrets:set`)         |
| `CALENDAR_WEBHOOK_URL`       | `http://127.0.0.1:5001/ats-tema-ort/us-central1/calendarWebhook` | URL de la función deployada (`.env.ats-tema-ort`) |
| `GOOGLE_OAUTH_CLIENT_ID`     | en `.env.local` del equipo                                       | Firebase Secret (ya configurado)                  |
| `GOOGLE_OAUTH_CLIENT_SECRET` | en `.env.local` del equipo                                       | Firebase Secret (ya configurado)                  |
