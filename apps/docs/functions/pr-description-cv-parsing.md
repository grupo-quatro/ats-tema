# PR: CV Parsing con Firebase Storage, Vertex AI y Modo Mock

## Overview

Este PR agrega el flujo de parsing de CVs para candidatos registrados mediante carga de PDF. La implementación conecta Firebase Storage, Cloud Functions, Firestore y Vertex AI/Gemini, manteniendo un modo mock para pruebas locales sin consumo de IA.

El objetivo del flujo es:

1. Registrar un candidato por CV.
2. Dejar el candidato en `profileStatus = draft`.
3. Dejar el CV en `cvParseStatus = pending`.
4. Detectar la subida del PDF en Storage.
5. Marcar el parsing como `processing`.
6. Extraer texto localmente del PDF cuando sea posible.
7. Usar Gemini para mapear el contenido a campos de `Candidate`.
8. Persistir los datos parseados como información editable.
9. Dejar el parsing en `done` o `failed`.
10. Permitir que el usuario confirme o corrija el perfil con `confirmCandidateProfile`.

## Problema Que Resuelve

Antes el flujo de CV y el flujo manual podían dejar datos duplicados o inconsistentes entre estructuras como `parsedData`, `hardSkills`, `softSkills`, `languages` y `technicalSkills`.

La decisión de este PR es usar una entidad canónica de candidato. El parsing escribe sobre los mismos campos que luego consume el front y que confirma el usuario:

```txt
firstName
lastName
fullName
email
phone
location
yearsOfExperience
education
professionalSummary
technicalSkills
```

`parsedData` queda como respaldo/debug del resultado parseado, pero no debería ser el contrato principal del front.

## Cambios Principales

### Endpoints HTTP `onRequest`

Los endpoints del flujo de candidato/CV quedan como HTTP `onRequest`:

```txt
registerCandidateCV
registerCandidate
confirmCandidateProfile
```

Importante: aunque viven en `apps/functions/src/callables`, estos endpoints ya no son `onCall`.

Requieren:

```txt
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Body recomendado: JSON directo.

Por compatibilidad temporal con pruebas anteriores de Postman, también aceptan:

```json
{
  "data": {
    "...": "..."
  }
}
```

No se migraron endpoints fuera del alcance de esta rama, como seeds, jobs o applications.

### Trigger de Storage

Archivo:

```txt
apps/functions/src/triggers/onCvUploaded.ts
```

Responsabilidades:

- procesa solo archivos con path `cvs/{candidateId}/...`;
- ignora carpetas o paths inválidos;
- procesa solo PDFs;
- usa `512MiB` de memoria;
- usa `120s` de timeout;
- delega el trabajo en `CvUploadService`.

### Servicio Orquestador

Archivo:

```txt
apps/functions/src/services/cvUploadService.ts
```

Responsabilidades:

- buscar el candidato;
- ignorar eventos de candidatos inexistentes;
- marcar `not_required` si el candidato viene del flujo manual;
- evitar reprocesar si el mismo CV ya estaba en `done`;
- permitir reproceso si `CV_PARSING_FORCE_REPROCESS=true`;
- descargar el PDF desde Storage;
- llamar al parser;
- marcar `done` o `failed`.

Se agregó `CvDownloader` como dependencia inyectable:

```ts
type CvDownloader = (bucketName: string, filePath: string) => Promise<Buffer>;
```

En producción no cambia el comportamiento: usa `defaultDownloadToBuffer`, que descarga desde Firebase Storage.

En tests permite inyectar un downloader falso para no depender de Storage real/emulado.

### Servicio de Parsing

Archivos:

```txt
apps/functions/src/services/parsing/cvParsingService.ts
apps/functions/src/services/parsing/cvParserSchema.ts
```

Cambios:

- se reemplaza el SDK deprecado `@google-cloud/vertexai`;
- se usa `@google/genai`;
- modelo default: `gemini-2.5-flash`;
- modelo configurable con `CV_PARSER_MODEL`;
- región configurable con `VERTEX_LOCATION`;
- default de región: `us-central1`;
- `thinkingBudget: 0`;
- `maxOutputTokens` limitado;
- schema de salida mínimo y orientado a `Candidate`.

### Extracción Local de Texto

Se agregó:

```txt
pdf-parse
```

Flujo:

```txt
PDF Buffer
  ↓
pdf-parse extrae texto local
  ↓
si hay texto suficiente, Gemini recibe texto plano
  ↓
si no hay texto suficiente, fallback multimodal con PDF
```

Esto reduce tokens de entrada, baja costo y evita depender siempre del parsing visual de Gemini.

## Estados de Parsing

```txt
not_required
pending
processing
done
failed
```

Flujos esperados:

```txt
pending -> processing -> done
pending -> processing -> failed
manual -> not_required
```

## Persistencia

Se agregaron métodos en `CandidatesRepository`:

```txt
markParsingProcessing
markParsingDone
markParsingFailed
```

En `markParsingDone`, el backend:

- copia los datos parseados a campos canónicos de `Candidate`;
- guarda `parsedData` como respaldo;
- limpia `cvParseError`;
- marca `cvParseStatus = done`;
- elimina campos legacy duplicados:

```txt
hardSkills
softSkills
languages
```

También se mantuvo compatibilidad con `parsedCv` porque hay servicios previos que todavía lo usan, como detalle de aplicación y seeds.

## Relación Con `confirmCandidateProfile`

`confirmCandidateProfile` no llama a Vertex AI.

Flujo esperado:

```txt
CV parseado
  ↓
Backend guarda datos sugeridos en Candidate
  ↓
Front muestra formulario editable
  ↓
Usuario corrige o confirma
  ↓
confirmCandidateProfile persiste el perfil final
```

El front debería construir el formulario desde los campos canónicos:

```txt
candidate.firstName
candidate.lastName
candidate.email
candidate.phone
candidate.location
candidate.education
candidate.technicalSkills
candidate.professionalSummary
```

## Modos de Prueba

### Emulator con Mock

No consume IA.

```bash
firebase emulators:start --only functions,firestore,storage
```

En emulator, el mock se usa automáticamente salvo que se fuerce IA real.

### Emulator con IA Real

Consume Vertex AI real.

```bash
CV_PARSING_FORCE_REAL_AI=true firebase emulators:start --only functions,firestore,storage
```

Requiere ADC configurado localmente.

### Mock Forzado

```bash
CV_PARSING_USE_MOCK=true firebase emulators:start --only functions,firestore,storage
```

### Reprocesar Un CV Ya Parseado

```bash
CV_PARSING_FORCE_REPROCESS=true firebase emulators:start --only functions,firestore,storage
```

## Configuración Local Para IA Real

Cada dev que quiera probar IA real desde emulator debe configurar ADC:

```bash
gcloud auth application-default login
gcloud config set project ats-tema-ort
gcloud auth application-default set-quota-project ats-tema-ort
```

También debe estar habilitada la API:

```bash
gcloud services enable aiplatform.googleapis.com
```

ADC local queda en:

```txt
~/.config/gcloud/application_default_credentials.json
```

Ese archivo no debe subirse al repo.

En producción no se usa el ADC local del dev. Cloud Functions usa la service account del proyecto.

## Costos y Billing

Vertex AI consume billing/créditos de la cuenta asociada al proyecto Google Cloud/Firebase.

Firebase Blaze y Google Cloud pueden compartir la misma cuenta de billing, pero Vertex AI no es gratis por usar Firebase.

Medidas para reducir costo:

- mock automático en emulator;
- IA real solo con `CV_PARSING_FORCE_REAL_AI=true`;
- extracción local con `pdf-parse`;
- schema de salida chico;
- `maxOutputTokens` limitado;
- `thinkingBudget: 0`;
- recomendación de budget alerts en Google Cloud Billing.

## Cómo Probar Manualmente

1. Levantar emulator:

```bash
firebase emulators:start --only functions,firestore,storage
```

2. Registrar candidato por CV:

```txt
POST http://127.0.0.1:5001/ats-tema-ort/us-central1/registerCandidateCV
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

```json
{
  "jobId": "backend-firebase-developer"
}
```

3. Subir PDF en Storage emulator:

```txt
cvs/{candidateId}/archivo.pdf
```

4. Verificar Firestore:

```txt
cvParseStatus = done
profileStatus = draft
parsedData populated
campos canónicos de Candidate populated
```

5. Confirmar perfil:

```txt
POST http://127.0.0.1:5001/ats-tema-ort/us-central1/confirmCandidateProfile
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

```json
{
  "candidateId": "CANDIDATE_ID",
  "applicationId": "APPLICATION_ID",
  "profile": {
    "firstName": "Sofia",
    "lastName": "Loria",
    "email": "sofia@example.com",
    "phone": "",
    "location": "Buenos Aires, Argentina",
    "yearsOfExperience": 5,
    "education": "Tecnicatura en Analisis de Sistemas | ORT Argentina",
    "technicalSkills": ["Java", "Spring Boot", "MySQL"],
    "professionalSummary": "Resumen profesional confirmado por el usuario."
  }
}
```

Resultado esperado:

```txt
candidate.profileStatus = completed
application.status/stage actualizado según el flujo existente
```

## Tests

Se agregaron tests unitarios sin consumo de IA real.

```bash
pnpm test
```

Tests nuevos principales:

```txt
apps/functions/src/services/__tests__/cvUploadService.test.ts
apps/functions/src/services/parsing/__tests__/cvParsingService.test.ts
```

### `CvUploadService`

Cubre:

- candidato inexistente;
- flujo manual;
- CV ya parseado;
- reproceso forzado;
- parsing exitoso;
- error del parser;
- error descargando PDF.

### `CvParsingService`

Cubre:

- mock en emulator sin llamar IA;
- extracción local mockeada;
- llamada mockeada a `@google/genai`;
- normalización de `hardSkills`/`skills` hacia `technicalSkills`.

También se corrigió un test existente de `updateApplicationService` para mockear `firebaseAdmin` con el casing correcto en Linux/CI.

## Validaciones

Se validó:

```bash
pnpm lint
pnpm test
```

## Después de Hacer Pull de Develop

Cada dev debería correr:

```bash
git pull origin develop
pnpm install
pnpm lint
pnpm test
```

`pnpm install` es necesario porque se agregaron/cambiaron dependencias:

```txt
@google/genai
pdf-parse
```

Si alguien va a probar IA real:

```bash
gcloud auth application-default login
gcloud config set project ats-tema-ort
gcloud auth application-default set-quota-project ats-tema-ort
gcloud services enable aiplatform.googleapis.com
CV_PARSING_FORCE_REAL_AI=true firebase emulators:start --only functions,firestore,storage
```

## Checklist

- [x] Endpoints de candidato/CV como HTTP `onRequest`.
- [x] Parsing service con Google Gen AI SDK.
- [x] Extracción local con `pdf-parse`.
- [x] Mock automático en emulator.
- [x] Opción para forzar IA real desde emulator.
- [x] Estados `pending`, `processing`, `done`, `failed`.
- [x] Persistencia en campos canónicos de `Candidate`.
- [x] Limpieza de campos legacy duplicados.
- [x] Trigger de Storage con memoria/timeout.
- [x] Tests unitarios.
- [x] Documentación de configuración, costos y pruebas.
