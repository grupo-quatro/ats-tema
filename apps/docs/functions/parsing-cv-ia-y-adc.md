# Parsing de CV con IA, Mocks y Credenciales ADC

## Objetivo

Este documento deja en limpio la implementación actual del parsing de CVs, los modos disponibles para probar con mock o con Vertex AI real, y la configuración local necesaria para que el Firebase Emulator pueda llamar a Google Cloud usando Application Default Credentials (ADC).

La idea principal es separar tres conceptos:

1. Firebase Emulator / Firebase Functions: entorno donde corre nuestro backend.
2. Vertex AI Gemini: proveedor real de IA para parsear CVs.
3. ADC: credenciales locales que permiten que una función corriendo en nuestra máquina llame a Google Cloud.

---

## Qué Cambiamos a Nivel Código

### 1. Parser de CV desacoplado de Storage

El servicio de parsing ahora recibe un `Buffer` y no un path de Storage:

```ts
parseFromBuffer(fileBuffer: Buffer, mimeType = 'application/pdf')
```

Esto permite que `CvParsingService` sea responsable solo de IA/parsing, mientras que `CvUploadService` se encarga de descargar el archivo desde Storage.

Archivo principal:

```txt
apps/functions/src/services/parsing/cvParsingService.ts
```

### 2. Schema minimo para mapear a Candidate

```txt
apps/functions/src/services/parsing/cvParserSchema.ts
```

El output tecnico esperado desde Vertex AI es plano y coincide con los campos canonicos actuales de `Candidate`:

- `firstName`
- `lastName`
- `fullName`
- `email`
- `phone`
- `location`
- `yearsOfExperience`
- `education`
- `technicalSkills`
- `professionalSummary`
- `parserVersion`

No pedimos `workExperience`, `softSkills`, `languages` ni objetos anidados. El objetivo del MVP no es reconstruir todo el CV, sino completar el perfil editable del candidato con bajo costo y menor riesgo de JSON truncado.

### 3. Mocks disponibles para no consumir IA siempre

El parser puede devolver un mock fijo sin llamar a Vertex AI. Esto sirve para probar el flujo end-to-end sin costo.

Reglas actuales:

```txt
Emulator sin flags
  -> usa mock automatico

CV_PARSING_USE_MOCK=true
  -> fuerza mock en cualquier entorno

CV_PARSING_FORCE_REAL_AI=true
  -> fuerza IA real incluso en emulator
```

### 4. Orquestador de upload mas robusto

`CvUploadService` ahora:

1. Busca el candidato.
2. Ignora candidatos inexistentes.
3. No parsea CVs del flujo manual.
4. Evita reprocesar un CV ya parseado salvo que se fuerce.
5. Marca `processing`.
6. Descarga el PDF a memoria.
7. Llama al parser, que intenta extraer texto localmente y luego usa IA para mapear.
8. Marca `done` o `failed`.

Archivo:

```txt
apps/functions/src/services/cvUploadService.ts
```

### 5. Estados y persistencia en Candidate

Se agregaron metodos claros en el repositorio:

```ts
markParsingProcessing(candidateId, cvStoragePath);
markParsingDone(candidateId, parsedData);
markParsingFailed(candidateId, errorMessage);
```

Cuando el parsing termina bien, se guarda:

- `cvParseStatus: "done"`
- `parsedData` como auditoria/debug del parser
- `technicalSkills` como lista canonica usada por el front actual
- `professionalSummary`
- datos basicos del candidato si fueron extraidos

No se guardan `hardSkills`, `softSkills` ni `languages` en el root del candidato. Si aparecen, deben vivir dentro de `parsedData`, porque pertenecen al output tecnico del parser y no a la entidad canonica actual.

La entidad `Candidate` debe tener una sola forma sin importar la fuente:

```txt
Carga manual
  -> Candidate canonical fields

CV parseado
  -> parsedData
  -> mapper
  -> Candidate canonical fields

Confirmacion
  -> Candidate canonical fields finales
```

Campos canonicos actuales:

```txt
firstName
lastName
fullName
email
phone
location
yearsOfExperience
education
technicalSkills
professionalSummary
profileStatus
cvParseStatus
cvStoragePath
cvParseError
parsedData
```

`parsedData` se conserva para inspeccion, debugging, auditoria y futuras mejoras de scoring, pero el front no deberia tratarlo como la fuente final del perfil.

### 6. Trigger con mas memoria y timeout

El trigger de Storage ahora corre con:

```ts
memory: '512MiB';
timeoutSeconds: 120;
```

Archivo:

```txt
apps/functions/src/triggers/onCvUploaded.ts
```

Esto es importante porque el flujo descarga PDFs a memoria y una llamada a Gemini puede tardar mas que el timeout default.

### 7. Extraccion local de texto antes de IA

El parser usa `pdf-parse` para extraer texto localmente de PDFs digitales antes de llamar a Gemini.

Flujo interno:

```txt
PDF Buffer
  ↓
pdf-parse extrae texto local
  ↓
Si hay texto suficiente:
    Gemini recibe texto plano y devuelve Candidate JSON minimo
  ↓
Si no hay texto suficiente:
    fallback a Gemini con PDF multimodal
```

Esto reduce costo y complejidad porque:

- evita mandar el PDF completo a Gemini cuando el PDF ya tiene texto seleccionable;
- baja tokens de entrada;
- baja tokens de salida al pedir un JSON plano;
- desactiva `thinking` en Gemini 2.5 Flash porque el caso de uso es extraccion estructurada simple;
- hace mas facil debuggear el contenido enviado a IA;
- mantiene una salida consistente con `Candidate`.

Limitacion: si el PDF es escaneado o es una imagen, la extraccion local puede devolver poco texto. En ese caso se usa fallback multimodal.

---

## Flujo Funcional Completo

```txt
POST registerCandidateCV (HTTP onRequest)
  ↓
Se crea candidato draft
  ↓
cvParseStatus = "pending"
  ↓
Frontend/Postman recibe uploadBasePath = cvs/{candidateId}/
  ↓
Se sube PDF a Storage en cvs/{candidateId}/archivo.pdf
  ↓
onCVUploaded detecta el archivo
  ↓
CvUploadService marca processing
  ↓
Descarga PDF
  ↓
CvParsingService extrae texto local con pdf-parse
  ↓
Gemini mapea texto a Candidate JSON minimo
  ↓
Si no hubo texto suficiente, usa fallback multimodal con PDF
  ↓
Firestore queda en done o failed
```

Estados esperados:

```txt
pending -> processing -> done
```

o, si falla:

```txt
pending -> processing -> failed
```

---

## Modos de Prueba

### Camino 1: Emulator con Mock Automatico

No consume Vertex AI.

```bash
firebase emulators:start --only functions,firestore,storage
```

Resultado esperado:

```txt
pending -> processing -> done
```

Pero `parsedData` sale del mock local.

### Camino 2: Emulator con IA Real

Consume Vertex AI real aunque Firestore/Storage sean emulados.

```bash
CV_PARSING_FORCE_REAL_AI=true firebase emulators:start --only functions,firestore,storage
```

Requiere ADC configurado localmente.

### Camino 3: Deploy Real

Consume Vertex AI real usando la service account de Cloud Functions.

```bash
firebase deploy --only functions
```

Luego se prueba contra endpoints reales y Storage real.

### Camino 4: Mock Forzado

Sirve si queremos desplegar o correr localmente sin riesgo de consumir IA.

```bash
CV_PARSING_USE_MOCK=true firebase emulators:start --only functions,firestore,storage
```

Si se setean ambas variables, `CV_PARSING_FORCE_REAL_AI=true` tiene prioridad sobre el mock.

---

## Tests Unitarios

Se agregaron tests unitarios para cubrir la logica nueva sin consumir IA real y sin depender de Storage real/emulado.

Archivos:

```txt
apps/functions/src/services/__tests__/cvUploadService.test.ts
apps/functions/src/services/parsing/__tests__/cvParsingService.test.ts
```

Para correrlos:

```bash
pnpm --filter @ats/functions test
```

Para validar TypeScript:

```bash
pnpm --filter @ats/functions build
```

### Que cubre `CvUploadService`

El test de `CvUploadService` valida el orquestador del flujo de CV:

```txt
Storage event
  ↓
buscar candidato
  ↓
marcar processing
  ↓
descargar PDF
  ↓
parsear
  ↓
marcar done o failed
```

Casos cubiertos:

1. Si el candidato no existe, ignora el evento.
2. Si el candidato viene del flujo manual, marca `not_required` y no parsea.
3. Si el mismo CV ya estaba en `done`, no lo reprocesa.
4. Si `CV_PARSING_FORCE_REPROCESS=true`, permite reprocesar.
5. Si el parsing sale bien, llama a `markParsingDone`.
6. Si falla la IA/parser, llama a `markParsingFailed`.
7. Si falla la descarga del PDF, tambien llama a `markParsingFailed`.

### Por Que Existe `CvDownloader`

`CvDownloader` es una funcion inyectable que descarga el PDF y devuelve un `Buffer`.

En produccion no cambia el comportamiento:

```ts
private readonly downloadCvToBuffer: CvDownloader = defaultDownloadToBuffer
```

Si nadie pasa nada al constructor, se usa `defaultDownloadToBuffer`, que descarga desde Firebase Storage con `getStorage()`.

En tests, en cambio, se pasa un downloader falso:

```ts
const downloader = vi.fn().mockResolvedValue(Buffer.from('pdf-content'));
```

Esto permite probar `CvUploadService` como unit test, sin levantar Storage, sin subir PDFs y sin depender de Firebase real. El test queda enfocado en la logica del servicio, no en la infraestructura.

### Que cubre `CvParsingService`

El test de `CvParsingService` evita llamadas reales a Vertex AI mockeando:

```txt
pdf-parse
@google/genai
firebase-admin
firebase-functions/logger
```

Casos cubiertos:

1. En emulator, devuelve el mock local y no llama a IA.
2. Con `CV_PARSING_FORCE_REAL_AI=true`, usa el texto extraido localmente, llama al cliente de Gen AI mockeado y normaliza el output para guardar `technicalSkills`.

Esto es importante porque valida la logica propia del parser sin consumir creditos, sin requerir ADC y sin depender de que Vertex AI este disponible.

Los tests no reemplazan una prueba manual con un PDF real. La prueba real sigue siendo necesaria para validar credenciales, permisos IAM, API habilitada, billing y comportamiento del modelo con documentos reales.

---

## Qué Es ADC

ADC significa Application Default Credentials.

Es el mecanismo estandar de Google Cloud para que librerias como `@google/genai` encuentren credenciales sin que nosotros tengamos que pasar claves manualmente en el codigo.

En local, ADC representa tu login de desarrollador contra Google Cloud.

En produccion, ADC no usa tu usuario local: usa la service account de la Cloud Function.

---

## Por Qué ADC Es Importante

Cuando corremos Firebase Emulator, la funcion se ejecuta en nuestra maquina. Si forzamos IA real, esa funcion local necesita autenticarse contra Google Cloud para llamar a Vertex AI.

Sin ADC, el SDK de Vertex AI no sabe con que identidad llamar a Google Cloud.

Con ADC configurado, este flujo funciona:

```txt
Firebase Emulator local
  ↓
Cloud Function local
  ↓
@google/genai
  ↓
ADC local
  ↓
Vertex AI real en Google Cloud
```

---

## Cómo Configurar ADC en Una Máquina Local

### 1. Instalar Google Cloud CLI

Verificar si existe:

```bash
gcloud --version
```

Si no existe en macOS con Homebrew:

```bash
brew install --cask google-cloud-sdk
```

Cerrar y abrir la terminal. Si hace falta, cargar el path:

```bash
source "$(brew --prefix)/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/path.zsh.inc"
```

### 2. Loguear ADC

```bash
gcloud auth application-default login
```

Esto abre el navegador. Hay que ingresar con una cuenta Google que tenga permisos sobre el proyecto.

### 3. Setear proyecto activo

```bash
gcloud config set project ats-tema-ort
```

### 4. Setear quota project de ADC

```bash
gcloud auth application-default set-quota-project ats-tema-ort
```

Esto evita errores como:

```txt
Cannot find a quota project to add to ADC
```

o problemas inesperados de quota/API.

### 5. Verificar configuración

```bash
gcloud config get-value project
gcloud auth application-default print-access-token
```

Si el segundo comando imprime un token, ADC esta funcionando.

---

## Dónde Se Guardan Las Credenciales Locales

En macOS/Linux, ADC suele guardarse en:

```txt
~/.config/gcloud/application_default_credentials.json
```

En esta maquina se genero en:

```txt
/Users/sofialoria/.config/gcloud/application_default_credentials.json
```

Ese archivo no debe subirse al repositorio.

No debe copiarse a `.env.local`.

No debe compartirse por Slack, Drive ni WhatsApp.

Si alguien necesita probar IA real desde emulator, debe configurar su propio ADC con su usuario.

---

## Qué Va en Variables de Entorno

Las variables de entorno sirven para configuracion, no para guardar credenciales privadas.

Variables utiles:

```bash
CV_PARSING_FORCE_REAL_AI=true
CV_PARSING_USE_MOCK=true
CV_PARSER_MODEL=gemini-2.5-flash
VERTEX_LOCATION=us-central1
GOOGLE_CLOUD_PROJECT=ats-tema-ort
```

Credenciales:

```txt
No van en .env.local
No van en Firebase config
No van en codigo
No van en el repo
```

---

## Cómo Se Lleva Esto a Producción

En produccion no se usa el ADC local de ningun desarrollador.

Cloud Functions usa una service account del proyecto.

Flujo productivo:

```txt
Cloud Function desplegada
  ↓
Service account de la funcion
  ↓
@google/genai
  ↓
Vertex AI
```

La service account necesita permisos para usar Vertex AI.

Rol recomendado:

```txt
Vertex AI User
```

Se configura en:

```txt
Google Cloud Console
  -> IAM & Admin
  -> IAM
  -> buscar service account de Cloud Functions
  -> Grant access
  -> Vertex AI User
```

La service account puede ser una de estas, segun la configuracion del proyecto:

```txt
PROJECT_ID@appspot.gserviceaccount.com
PROJECT_NUMBER-compute@developer.gserviceaccount.com
```

---

## APIs Que Deben Estar Habilitadas

Para usar Vertex AI:

```bash
gcloud services enable aiplatform.googleapis.com
```

Tambien se puede habilitar desde:

```txt
Google Cloud Console
  -> APIs & Services
  -> Enabled APIs & services
  -> Enable APIs and services
  -> Vertex AI API
```

URL directa para este proyecto:

```txt
https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/metrics?project=ats-tema-ort
```

Si la API no esta habilitada, el emulator puede mostrar un error similar a:

```txt
code: 403
status: PERMISSION_DENIED
reason: SERVICE_DISABLED
service: aiplatform.googleapis.com
message: Agent Platform API has not been used in project ats-tema-ort before or it is disabled.
```

En ese caso hay que habilitar `aiplatform.googleapis.com`, esperar unos minutos y volver a probar.

### Error 404 NOT_FOUND al llamar al modelo

Si la API ya esta habilitada pero el log muestra:

```txt
code: 404
status: NOT_FOUND
```

lo mas probable es que el modelo configurado no exista, no este disponible en esa region o haya sido retirado. Esto puede pasar con modelos viejos como `gemini-1.5-flash`.

El modelo default actual del proyecto es:

```bash
CV_PARSER_MODEL=gemini-2.5-flash
```

Si hace falta probar otro modelo sin tocar codigo:

```bash
CV_PARSER_MODEL=gemini-2.5-flash CV_PARSING_FORCE_REAL_AI=true firebase emulators:start --only functions,firestore,storage
```

Modelos Gemini disponibles y vigentes se revisan en la documentacion oficial de Vertex AI / Gemini models.

### SDK usado para Gemini

El parser usa el SDK recomendado por Google:

```txt
@google/genai
```

No usamos `@google-cloud/vertexai` porque Google marco la clase `VertexAI` como deprecada desde el 24 de junio de 2025 y removible el 24 de junio de 2026.

Como el paquete de Functions compila actualmente como CommonJS, el SDK se carga con `dynamic import()` dentro del parser. Esto evita migrar todo el paquete Functions a ESM.

### Sobre el mensaje "crear credenciales"

La consola puede mostrar un mensaje como:

```txt
Para llamar a esta API desde tus propias aplicaciones, es posible que debas crear credenciales.
```

Para este backend no deberiamos crear API keys ni descargar archivos de service account para el flujo normal.

El mecanismo correcto es:

```txt
Local / emulator
  -> Application Default Credentials con gcloud

Produccion / Cloud Functions
  -> Service account de la funcion
```

Solo se deberian crear credenciales manuales si existiera un caso especial y justificado. Para este proyecto, evitar service account keys reduce riesgo de filtracion de secretos.

---

## Costos y Créditos

Vertex AI no es gratis por estar en Firebase Blaze.

Blaze habilita billing del proyecto. Vertex AI se cobra como servicio de Google Cloud en la misma cuenta de billing.

Si la cuenta tiene creditos de Google Cloud Free Trial, Vertex AI Gemini API puede consumir esos creditos, siempre que el credito este activo y el servicio sea elegible.

### Dónde se cobra cada parte

```txt
Firestore emulator / Storage emulator
  -> sin costo de Firebase real

CV_PARSING_FORCE_REAL_AI=true en emulator
  -> Firestore/Storage locales
  -> Vertex AI real con costo/credito real

Deploy productivo
  -> Firebase/Google Cloud reales
  -> Vertex AI real
```

Blaze es la vinculacion del proyecto Firebase con Cloud Billing. No convierte Vertex AI en gratis ni en una cuota incluida fija. Vertex AI se mide como servicio de Google Cloud en la misma cuenta de billing.

### Matriz de costos por camino

| Camino                                       | Storage/Firestore | Functions | Vertex AI | Uso recomendado                |
| -------------------------------------------- | ----------------- | --------- | --------- | ------------------------------ |
| Emulator sin flags                           | Local             | Local     | No        | Desarrollo diario              |
| Emulator con `CV_PARSING_FORCE_REAL_AI=true` | Local             | Local     | Si        | Pruebas controladas de IA      |
| Deploy real con mock                         | Real              | Real      | No        | Validar infraestructura sin IA |
| Deploy real con IA                           | Real              | Real      | Si        | Produccion                     |

### Estrategia para bajar costos

El pipeline esta diseñado para usar IA solo donde aporta valor:

```txt
1. Extraer texto local del PDF con pdf-parse
2. Enviar a Gemini texto plano, no el PDF completo
3. Pedir un JSON minimo de Candidate
4. Desactivar thinking en Gemini 2.5 Flash
5. Usar fallback multimodal solo si el PDF no tiene texto extraible
```

Esto baja costos porque reduce entrada, salida, latencia y casos donde el modelo tiene que interpretar layout/imagen.

Para controlar costos:

1. Usar mock en emulator por default.
2. Forzar IA real solo cuando sea necesario.
3. Extraer texto localmente antes de usar IA.
4. Pedir a Gemini solo el JSON minimo de `Candidate`.
5. Usar fallback multimodal solo si el PDF no tiene texto suficiente.
6. Probar con pocos PDFs.
7. Configurar budget alerts en Google Cloud Billing.
8. Revisar Billing Reports filtrando por Vertex AI.
9. Agregar limites de negocio si hace falta, por ejemplo cantidad maxima de CVs parseados por mes.

### Qué revisar en Google Cloud Billing

Para ver uso/costo real:

```txt
Google Cloud Console
  -> Billing
  -> Reports
  -> filtrar Project = ats-tema-ort
  -> filtrar Service = Vertex AI / Generative AI
```

Los reportes de billing pueden tardar en reflejar llamadas recientes. No son siempre inmediatos.

### Budget alerts recomendados

Configurar alertas en:

```txt
Google Cloud Console
  -> Billing
  -> Budgets & alerts
```

Para pruebas del equipo, usar un budget bajo, por ejemplo:

```txt
USD 5 / USD 10
Alertas al 50%, 80%, 100%
```

Las alertas avisan, pero no siempre cortan automaticamente el consumo. Para cortar uso por negocio, agregar limites en Firestore/Functions.

### Limite funcional recomendado

Si el cliente estima 50 CVs/mes, conviene agregar luego un contador mensual:

```txt
aiUsage/{YYYY-MM}
  cvParsesAttempted
  cvParsesSucceeded
  cvParsesFailed
  maxCvParses
```

Antes de llamar a IA, la function podria validar si el mes ya supero el maximo configurado. Esto no reemplaza billing alerts, pero reduce riesgo operativo.

---

## Logs Esperados

### Mock local

Cuando se usa mock:

```txt
[CvParsingService] Mock habilitado. Se omite la llamada a Vertex AI.
```

No hay consumo de Vertex AI.

### IA real con texto extraido localmente

Caso esperado y preferido:

```txt
[CvParsingService] Preparando input para IA.
source: "pdf_text"
extractedTextLength: 3605
promptTextLength: 3605
```

Esto significa:

- `pdf-parse` pudo leer texto del PDF;
- Gemini recibio texto plano;
- no se envio el PDF completo al modelo.

### IA real con fallback multimodal

```txt
source: "pdf_multimodal_fallback"
```

Esto significa que el PDF no tenia suficiente texto extraible. Puede pasar con CVs escaneados, imagenes o PDFs generados de forma no textual.

Este camino puede ser mas caro que `pdf_text`, porque el modelo debe procesar el PDF/multimodal.

### Parse exitoso

```txt
CV parseado correctamente.
parserVersion: "cv-parser/1.0+gemini-2.5-flash"
```

Firestore deberia quedar:

```txt
cvParseStatus = "done"
profileStatus = "draft"
parsedData = {...}
technicalSkills = [...]
```

`profileStatus` sigue en `draft` hasta que el usuario confirme el perfil.

---

## Errores Comunes y Diagnóstico

### `SERVICE_DISABLED`

```txt
status: PERMISSION_DENIED
reason: SERVICE_DISABLED
service: aiplatform.googleapis.com
```

La API de Vertex AI no esta habilitada. Solucion:

```bash
gcloud services enable aiplatform.googleapis.com --project ats-tema-ort
```

O habilitarla desde:

```txt
https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/metrics?project=ats-tema-ort
```

### `404 NOT_FOUND`

Suele indicar modelo inexistente, retirado o no disponible en region/proyecto.

Acciones:

1. Revisar `CV_PARSER_MODEL`.
2. Probar modelo vigente, por ejemplo `gemini-2.5-flash`.
3. Revisar `VERTEX_LOCATION`.

### JSON inválido o truncado

Ejemplo:

```txt
Vertex AI devolvio JSON invalido.
Unterminated string in JSON
```

Causas posibles:

- respuesta cortada por limite de tokens;
- modelo devolvio JSON incompleto;
- schema demasiado grande;
- thinking consumiendo presupuesto de salida;
- prompt demasiado amplio.

Medidas aplicadas:

```txt
- schema minimo de Candidate
- maxOutputTokens bajo pero suficiente para JSON corto
- thinkingBudget = 0
- extraccion local de texto
- parser tolerante a fences/markdown
```

Si ocurre con un PDF especifico pero otros funcionan, tratarlo como caso borde del contenido extraido o del PDF. Revisar `responsePreview` y `normalizedPreview` en logs.

### `cvParseStatus = failed`

Ver `cvParseError` en Firestore y logs del emulator/functions. El documento queda en `failed` para que el front pueda mostrar una alternativa manual.

---

## Cómo Probar Con Postman y Emulator

### Mock local

```bash
firebase emulators:start --only functions,firestore,storage
```

1. Llamar a:

```txt
http://127.0.0.1:5001/ats-tema-ort/us-central1/registerCandidateCV
```

Headers:

```txt
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Body recomendado para endpoints `onRequest`:

```json
{
  "jobId": "backend-firebase-developer"
}
```

Por compatibilidad temporal con pruebas anteriores, el backend tambien acepta el body envuelto como callable:

```json
{
  "data": {
    "jobId": "backend-firebase-developer"
  }
}
```

2. Confirmar que el candidato queda:

```txt
cvParseStatus = "pending"
```

3. Subir PDF en Storage emulator:

```txt
cvs/{candidateId}/archivo.pdf
```

4. Confirmar que queda:

```txt
cvParseStatus = "done"
parsedData = mock
```

### IA real desde emulator

```bash
CV_PARSING_FORCE_REAL_AI=true firebase emulators:start --only functions,firestore,storage
```

El flujo es igual, pero `parsedData` deberia venir de Vertex AI.

Si falla, revisar:

1. ADC configurado.
2. Quota project seteado.
3. Proyecto correcto.
4. Vertex AI API habilitada.
5. Permisos del usuario.
6. Logs del emulator.

Si el log dice `SERVICE_DISABLED` para `aiplatform.googleapis.com`, la llamada llego a Google Cloud pero Vertex AI API todavia no esta habilitada en el proyecto.

### Confirmar perfil por Postman

Despues de que el parsing deja:

```txt
cvParseStatus = "done"
profileStatus = "draft"
```

el front debe mostrar los datos editables y luego llamar a `confirmCandidateProfile`.

Endpoint emulator:

```txt
http://127.0.0.1:5001/ats-tema-ort/us-central1/confirmCandidateProfile
```

Headers:

```txt
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

Body ejemplo:

```json
{
  "candidateId": "CANDIDATE_ID",
  "applicationId": "CANDIDATE_ID_backend-firebase-developer",
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

Igual que `registerCandidateCV`, tambien acepta temporalmente `{ "data": { ... } }` para no romper pruebas existentes de Postman durante la migracion desde `onCall`.

Resultado esperado:

```txt
candidate.profileStatus = "completed"
application.status = "active"
application.stage = "applied"
```

---

## Relación con confirmCandidateProfile

`confirmCandidateProfile` es un endpoint HTTP `onRequest` y no deberia llamar a Vertex AI.

El flujo esperado es:

```txt
CV parseado
  ↓
Backend mapea parsedData a campos canonicos de Candidate
  ↓
Frontend muestra Candidate para revision
  ↓
Usuario corrige o confirma
  ↓
confirmCandidateProfile guarda el perfil final
```

Es decir: el parsing genera datos sugeridos; la confirmacion consolida el perfil definitivo.

El front puede usar `parsedData` como apoyo tecnico si necesita mostrar diferencias o debug, pero el formulario de confirmacion deberia construirse desde los campos canonicos:

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

`confirmCandidateProfile` recibe esos mismos datos ya confirmados/editados en `profile`.

Como ahora es `onRequest`, el front debe enviar el Firebase ID token en:

```txt
Authorization: Bearer <firebase_id_token>
```

---

## Checklist Para Otro Desarrollador

Para probar solo mock:

```bash
firebase emulators:start --only functions,firestore,storage
```

Para probar IA real local:

```bash
gcloud --version
gcloud auth application-default login
gcloud config set project ats-tema-ort
gcloud auth application-default set-quota-project ats-tema-ort
CV_PARSING_FORCE_REAL_AI=true firebase emulators:start --only functions,firestore,storage
```

Para verificar el proyecto:

```bash
gcloud config get-value project
```

Para verificar ADC:

```bash
gcloud auth application-default print-access-token
```

Para habilitar Vertex AI si falta:

```bash
gcloud services enable aiplatform.googleapis.com
```

---

## Reglas de Seguridad

No subir al repo:

```txt
application_default_credentials.json
.env.local con secretos
service account keys
tokens
```

No usar service account keys si no es estrictamente necesario.

Preferir:

```txt
Local: ADC con gcloud
Produccion: service account de Cloud Functions
```

---

## Checklist de Producción

Antes de habilitar IA real para usuarios:

1. Proyecto en Blaze con billing correcto.
2. Vertex AI API habilitada.
3. Service account de Cloud Functions con permiso `Vertex AI User`.
4. Budget alerts configurados.
5. Modelo configurado por env var si se quiere evitar hardcode:

```bash
CV_PARSER_MODEL=gemini-2.5-flash
VERTEX_LOCATION=us-central1
```

6. Mock desactivado en produccion salvo prueba controlada.
7. Logs revisados para confirmar que la mayoria de PDFs usan `source: "pdf_text"`.
8. Front preparado para:
   - mostrar datos parseados como sugeridos;
   - permitir edicion;
   - llamar a `confirmCandidateProfile`;
   - resolver `cvParseStatus = failed` con carga manual.

---

## Decisión de Diseño Actual

La decision actual es no intentar reconstruir todo el CV.

El sistema solo necesita completar una entidad editable de candidato:

```txt
Candidate canonical fields
```

Por eso se evitan estructuras largas como experiencia detallada, idiomas, soft skills o educacion como array. Esto reduce costo, riesgo de truncamiento y complejidad del front.
