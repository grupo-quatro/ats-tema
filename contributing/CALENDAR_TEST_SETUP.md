# Guía de prueba — Integración Google Calendar

## Prerequisitos

- Node.js 22, pnpm y Firebase CLI instalados
- Proyecto Firebase: `ats-tema-ort`
- Cuenta Gmail personal para probar

---

## Paso 1 — Instalar dependencia

```bash
cd apps/functions
pnpm add googleapis
```

---

## Paso 2 — Obtener el Access Token de Google Calendar

1. Abrís [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground)
2. En el panel izquierdo buscás **"Google Calendar API v3"** y seleccionás:
   - `https://www.googleapis.com/auth/calendar`
3. Clic en **Authorize APIs** → iniciás sesión con tu Gmail
4. Clic en **Exchange authorization code for tokens**
5. Copiás el valor de **Access token**

> ⚠️ El token dura 1 hora. Si vence, repetí este paso.

---

## Paso 3 — Configurar el archivo `.env`

Editás `apps/functions/.env` y completás:

```
GOOGLE_CALENDAR_ACCESS_TOKEN=ya29.TU_TOKEN_AQUI
```

Las variables de Service Account las dejás vacías por ahora (son para producción):
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

---

## Paso 4 — Compilar las functions

```bash
cd apps/functions
pnpm build
```

Tiene que terminar sin errores. Si hay errores, pegá el output para revisarlos.

---

## Paso 5 — Levantar el stack completo

Necesitás **3 terminales** abiertas en la raíz del proyecto:

**Terminal 1 — Emulador:**
```bash
firebase emulators:start --only auth,functions,firestore,storage --import=./emulator-data --export-on-exit
```

**Terminal 2 — Compilar en watch (para que los cambios se reflejen):**
```bash
pnpm compile-fn -- --watch
```

**Terminal 3 — Frontend:**
```bash
pnpm dev-web
```

---

## Paso 6 — Configurar el reclutador en Firestore

El HR que usa el emulador tiene uid `recruiter-dev`. Necesita tener el `calendarLink` configurado.

1. Abrís la Emulator UI: [http://localhost:4000](http://localhost:4000)
2. Vas a **Firestore → employees**
3. Si existe el documento `recruiter-dev`, le agregás el campo:
   - Campo: `calendarLink`
   - Valor: `https://calendar.app.google/eDZAKdZgApz36Y9LA`

   Si no existe el documento, lo creás con estos campos:
   ```json
   {
     "id": "recruiter-dev",
     "name": "Reclutador Dev",
     "email": "val.e.alon605@gmail.com",
     "role": "hr",
     "department": "Recursos Humanos",
     "active": true,
     "calendarLink": "https://calendar.app.google/eDZAKdZgApz36Y9LA"
   }
   ```

---

## Paso 7 — Opción A: Prueba desde el frontend

1. Abrís [http://localhost:3000](http://localhost:3000)
2. Iniciás sesión como HR
3. Navegás al pipeline de una posición con candidatos
4. Seleccionás un candidato
5. Cambiás el stage a **"Entrevista 1 agendada"** (`interview_1_scheduled`)
6. Confirmás el cambio

---

## Paso 7 — Opción B: Prueba con curl (más rápida)

**7.1 — Cargar datos de prueba:**
```bash
curl -X POST http://127.0.0.1:5001/ats-tema-ort/us-central1/seedCalendarTest
```

Respuesta esperada:
```json
{
  "ok": true,
  "data": {
    "applicationId": "dev-candidate-test_dev-job-test"
  }
}
```

**7.2 — Disparar la simulación:**
```bash
curl -X POST http://127.0.0.1:5001/ats-tema-ort/us-central1/simulateInterviewScheduled \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-recruiter" \
  -d '{ "applicationId": "dev-candidate-test_dev-job-test" }'
```

Respuesta esperada:
```json
{
  "ok": true,
  "message": "Evento de Calendar procesado para applicationId=dev-candidate-test_dev-job-test"
}
```

> ⚠️ Para la Opción B, el employee de prueba es `dev-recruiter-test` (creado por el seed), no `recruiter-dev`.
> El seed ya tiene el `calendarLink` configurado — no hace falta tocar Firestore manualmente.

---

## Paso 8 — Verificar el resultado

### En los logs del emulador (Terminal 1)
Buscás esta secuencia:
```
[CalendarService] Procesando entrevista para applicationId=...
[CalendarService] Usando access token directo (modo dev/Gmail personal)
[CalendarService] Evento creado correctamente para applicationId=... Reclutador: val.e.alon605@gmail.com
```

### En Google Calendar
Abrís [calendar.google.com](https://calendar.google.com) con tu cuenta y verificás que apareció el evento:
- Título: `Entrevista — Candidato Test / Developer Frontend`
- Fecha: aproximadamente 7 días desde hoy
- Invitado: el email del candidato de prueba
- Link de Google Meet incluido en el evento

### En Firestore (Emulator UI)
En `applications/{applicationId}/stageHistory` verificás que el último entry tiene:
- `stage`: `interview_1_scheduled`
- `changedBy`: uid del HR
- `changedByEmail`: email del HR

---

## Errores comunes y soluciones

| Error en logs | Causa | Solución |
|---|---|---|
| `Faltan credenciales` | `GOOGLE_CALENDAR_ACCESS_TOKEN` no está en `.env` o el emulador no lo leyó | Verificá el `.env` y reiniciá el emulador |
| `invalid_grant` o `401` | El access token venció (dura 1 hora) | Generá uno nuevo en el OAuth Playground y actualizá el `.env` |
| `Reclutador no encontrado en employees` | El documento del reclutador no existe en Firestore | Hacé el Paso 6 o corré el seed (Opción B) |
| `No se encontró historial de etapa` | El stageHistory está vacío | Corré el seed de nuevo o verificá que el cambio de stage se guardó |
| `Function does not exist` | El build no compiló los nuevos archivos | Corré `pnpm build` y reiniciá el emulador |
| Token vencido al usar simulateInterviewScheduled | Access token de 1 hora expiró | Nuevo token en OAuth Playground → actualizar `.env` → reiniciar emulador |

---

## Archivos locales que NO se pushean

Estos archivos están en `.gitignore` y son solo para desarrollo local:

```
apps/functions/src/callables/dev/simulateInterviewScheduled.ts
apps/functions/src/callables/dev/seedCalendarTest.ts
apps/functions/.env
```

Antes de hacer commit, verificás que las siguientes líneas del `index.ts` estén revertidas:
```typescript
// Estas dos líneas NO van al repo:
export { simulateInterviewScheduled } from './callables/dev/simulateInterviewScheduled';
export { seedCalendarTest } from './callables/dev/seedCalendarTest';
```
