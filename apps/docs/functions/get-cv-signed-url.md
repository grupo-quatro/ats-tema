# Endpoint: getCvSignedUrl

Guía de implementación para exponer el path descargable del CV almacenado en Firebase Storage.

---

## Contexto

El modelo `Candidate` guarda la ruta del CV en Firestore bajo el campo `cvStoragePath` (ej: `cvs/candidateId/cv.pdf`). El endpoint devuelve ese path y el frontend genera la URL con el SDK de Firebase Storage (`getDownloadURL`).

Actualmente `cvMockUrl` en `CandidateMockProfile` siempre es `null`. Este endpoint completa ese flujo.

---

## Ubicación en el codebase

| Archivo                                          | Acción                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `packages/shared-types/src/contracts/`           | Agregar `get-cv-signed-url.ts` y re-exportar desde `index.ts` |
| `apps/functions/src/callables/getCvSignedUrl.ts` | Endpoint HTTP `onRequest`                                     |
| `apps/functions/src/index.ts`                    | Exportar `getCvSignedUrl`                                     |
| `apps/web/app/shared/api/applications-api.ts`    | Agregar `getCvSignedUrl()`                                    |
| `apps/web/app/candidate/[candidateId]/page.tsx`  | Llamarlo y asignar a `cvMockUrl`                              |

---

## 1. shared-types

```ts
// packages/shared-types/src/contracts/get-cv-signed-url.ts

export interface GetCvSignedUrlPayload {
  applicationId: string;
}

export interface GetCvSignedUrlResponse {
  cvStoragePath: string;
}
```

Agregar en `packages/shared-types/src/contracts/index.ts`:

```ts
export * from './get-cv-signed-url';
```

---

## 2. Cloud Function (backend)

Usar `onRequest` con método `GET`. El endpoint requiere `Authorization: Bearer <token>`, recibe `applicationId` por query string y devuelve `cvStoragePath`.

```ts
// apps/functions/src/callables/getCvSignedUrl.ts

import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { HttpAuthError, requireAuthenticatedUser } from '../core/httpAuth';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import type { GetCvSignedUrlResponse } from '@ats/shared-types';

const applicationsRepository = new ApplicationsRepository();
const candidatesRepository = new CandidatesRepository();

export const getCvSignedUrl = onRequest(async (request, response) => {
  try {
    if (request.method !== 'GET') {
      response.status(405).json({ error: 'Method Not Allowed.' });
      return;
    }

    await requireAuthenticatedUser(request);
    const payload = request.query as Partial<GetCvSignedUrlPayload>;

    const application = await applicationsRepository.findById(
      payload.applicationId.trim(),
    );
    if (!application) {
      response.status(404).json({ error: 'Postulación no encontrada.' });
      return;
    }

    const candidate = await candidatesRepository.findById(
      application.candidateId,
    );
    if (!candidate?.cvStoragePath) {
      response
        .status(404)
        .json({ error: 'Este candidato no tiene CV cargado.' });
      return;
    }

    response.status(200).json({ cvStoragePath: candidate.cvStoragePath });
  } catch (error) {
    if (error instanceof HttpAuthError) {
      response.status(401).json({ error: error.message });
      return;
    }

    logger.error('[getCvSignedUrl] Error obteniendo CV', error);
    response.status(500).json({ error: 'No se pudo obtener el CV.' });
  }
});
```

### Exportar desde `index.ts`

```ts
// apps/functions/src/index.ts — agregar:
export { getCvSignedUrl } from './callables/getCvSignedUrl';
```

---

## 3. Frontend — API

```ts
// apps/web/app/shared/api/applications-api.ts — agregar:

import type {
  GetCvSignedUrlPayload,
  GetCvSignedUrlResponse,
} from '@ats/shared-types';

export async function getCvSignedUrl(applicationId: string): Promise<string> {
  const token = await getToken();
  const params = new URLSearchParams({ applicationId });
  const res = await fetch(`${getFunctionUrl('getCvSignedUrl')}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = (await res.json()) as GetCvSignedUrlResponse;
  return getDownloadURL(ref(storage, result.cvStoragePath));
}
```

---

## 4. Frontend — página del candidato

En `apps/web/app/candidate/[candidateId]/page.tsx`, llamar a `getCvSignedUrl` en paralelo con `getApplicationDetail` y asignar la URL al perfil:

```ts
const [detail, cvResult] = await Promise.allSettled([
  getApplicationDetail(application.id),
  getCvSignedUrl(application.id),
]);

if (detail.status === 'rejected') {
  setNotFound(true);
  return;
}

const profile = mapDetailToProfile(detail.value);

if (cvResult.status === 'fulfilled') {
  profile.cvMockUrl = cvResult.value;
}

setProfile(profile);
```

Usar `Promise.allSettled` para que un CV faltante no rompa la carga del perfil.

---

## Consideraciones

- **Acceso:** el path no es público. La URL final se obtiene con Firebase Storage SDK y respeta las reglas de Storage.
- **Permisos de Storage:** verificar que `storage.rules` permita que las Cloud Functions (service account) accedan al bucket. Las reglas de Storage solo aplican al SDK de cliente — el Admin SDK las omite.
- **Emulador:** el emulador de Storage no soporta `getSignedUrl`. En desarrollo local, retornar una URL directa del emulador: `http://127.0.0.1:9199/...`
