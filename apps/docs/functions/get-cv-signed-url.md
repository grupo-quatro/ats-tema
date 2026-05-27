# Endpoint: getCvSignedUrl

Guía de implementación para exponer la URL de descarga del CV almacenado en Firebase Storage.

---

## Contexto

El modelo `Candidate` guarda la ruta del CV en Firestore bajo el campo `cvStoragePath` (ej: `cvs/candidateId/cv.pdf`). Este path no es una URL pública — Firebase Storage requiere una **signed URL** con expiración para que el frontend pueda acceder al archivo.

Actualmente `cvMockUrl` en `CandidateMockProfile` siempre es `null`. Este endpoint completa ese flujo.

---

## Ubicación en el codebase

| Archivo                                          | Acción                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `packages/shared-types/src/contracts/`           | Agregar `get-cv-signed-url.ts` y re-exportar desde `index.ts` |
| `apps/functions/src/callables/getCvSignedUrl.ts` | Nuevo callable                                                |
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
  signedUrl: string;
  expiresAt: string; // ISO string
}
```

Agregar en `packages/shared-types/src/contracts/index.ts`:

```ts
export * from './get-cv-signed-url';
```

---

## 2. Cloud Function (backend)

Usar `onCall` ya que requiere auth. El callable lee el candidato desde Firestore, obtiene `cvStoragePath` y genera una signed URL con el Admin SDK.

```ts
// apps/functions/src/callables/getCvSignedUrl.ts

import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { storage } from '../core/firebase-admin'; // ver nota abajo
import { ApplicationsRepository } from '../repositories/application-repository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import type {
  GetCvSignedUrlPayload,
  GetCvSignedUrlResponse,
} from '@ats/shared-types';

const applicationsRepository = new ApplicationsRepository();
const candidatesRepository = new CandidatesRepository();

export const getCvSignedUrl = onCall(
  async (request): Promise<GetCvSignedUrlResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Autenticación requerida.');
    }

    const payload = request.data as Partial<GetCvSignedUrlPayload>;

    if (!payload.applicationId?.trim()) {
      throw new HttpsError('invalid-argument', 'applicationId es obligatorio.');
    }

    const application = await applicationsRepository.findById(
      payload.applicationId.trim(),
    );
    if (!application) {
      throw new HttpsError('not-found', 'Postulación no encontrada.');
    }

    const candidate = await candidatesRepository.findById(
      application.candidateId,
    );
    if (!candidate?.cvStoragePath) {
      throw new HttpsError('not-found', 'Este candidato no tiene CV cargado.');
    }

    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      const [signedUrl] = await storage
        .bucket()
        .file(candidate.cvStoragePath)
        .getSignedUrl({
          action: 'read',
          expires: expiresAt,
        });

      logger.info('[getCvSignedUrl] Signed URL generada', {
        candidateId: candidate.id,
        cvStoragePath: candidate.cvStoragePath,
      });

      return { signedUrl, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      logger.error('[getCvSignedUrl] Error generando signed URL', error);
      throw new HttpsError('internal', 'No se pudo generar la URL del CV.');
    }
  },
);
```

### Nota: exportar `storage` desde `firebase-admin.ts`

```ts
// apps/functions/src/core/firebase-admin.ts — agregar:
export const storage = admin.storage();
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

export async function getCvSignedUrl(
  applicationId: string,
): Promise<GetCvSignedUrlResponse> {
  const fn = httpsCallable<GetCvSignedUrlPayload, GetCvSignedUrlResponse>(
    functions,
    'getCvSignedUrl',
  );
  const result = await fn({ applicationId });
  return result.data;
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
  profile.cvMockUrl = cvResult.value.signedUrl;
}

setProfile(profile);
```

Usar `Promise.allSettled` para que un CV faltante no rompa la carga del perfil.

---

## Consideraciones

- **Expiración:** la signed URL dura 1 hora. Si el usuario deja la pestaña abierta y luego intenta abrir el CV, recibirá un 403. Se puede manejar llamando a `getCvSignedUrl` en el momento en que el usuario hace click en "Ver CV", en lugar de al cargar la página.
- **Permisos de Storage:** verificar que `storage.rules` permita que las Cloud Functions (service account) accedan al bucket. Las reglas de Storage solo aplican al SDK de cliente — el Admin SDK las omite.
- **Emulador:** el emulador de Storage no soporta `getSignedUrl`. En desarrollo local, retornar una URL directa del emulador: `http://127.0.0.1:9199/...`
