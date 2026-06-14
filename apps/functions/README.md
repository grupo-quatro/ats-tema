## Google Calendar OAuth — setup local

Solo necesario si vas a trabajar en el flujo de scheduling automático (FB-65/67).

### 1. Variables de entorno

Agregar a `apps/functions/.env.local`:

```env
OAUTH_ENCRYPTION_KEY=<ver paso 2>
CALENDAR_WEBHOOK_SECRET=local-dev-secret
CALENDAR_WEBHOOK_URL=http://127.0.0.1:5001/ats-tema-ort/us-central1/calendarWebhook
```

> `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET` ya están en el `.env.local` compartido del equipo.

### 2. Generar `OAUTH_ENCRYPTION_KEY`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Coordiná el valor con el equipo — todos deben usar **el mismo key** para poder leer tokens guardados por otros en el emulador.

### 3. Simular un webhook de Google localmente

Google no puede llamar a `localhost`, así que el webhook se simula con curl.

```bash
# 1. Conectar Calendar desde la UI (Settings → Conectar Google Calendar)
# 2. Abrir Firestore Emulator UI → users/{uid} → copiar calendarWatch.channelId
# 3. Disparar la notificación:

curl -X POST http://127.0.0.1:5001/ats-tema-ort/us-central1/calendarWebhook \
  -H "X-Goog-Channel-ID: <channelId>" \
  -H "X-Goog-Resource-State: exists" \
  -H "X-Goog-Channel-Token: local-dev-secret"
```

Verificar en los logs del emulador que aparezca `[calendarWebhookService] Transicionando aplicación`.

### `CALENDAR_WEBHOOK_SECRET` en local

Puede ser cualquier string — `local-dev-secret` está bien. Solo tiene que coincidir entre `.env.local` y el header `X-Goog-Channel-Token` del curl.
