# Síntesis de implementación: Parsing de CV y Scoring

Análisis comparativo de las ramas `parsingtest` y `fb-53-102`, con propuesta unificada y mejoras adicionales.

---

## Estructura de archivos propuesta

```
apps/functions/src/services/parsing/
  cvParserSchema.ts           ← schema separado con descriptions (de fb-53-102)
  cvParsingService.ts         ← parser híbrido (ver detalle abajo)
  cvScoringService.ts         ← nuevo, no implementado en ninguna rama
apps/functions/src/services/
  cv-upload-service.ts        ← orquestador (de parsingtest, con ajustes)

packages/shared-types/src/models/parsing/
  parsed-cv.ts                ← modelo enriquecido (de fb-53-102)
  parsed-candidate-profile-data.ts
  scoring-result.ts           ← nuevo
```

---

## 1. Schema — base `fb-53-102` + campos de `parsingtest`

`fb-53-102` tiene `description` en cada campo (mejora el output de Gemini) y un modelo de datos más rico. Se complementa con `firstName`/`lastName` separados de `parsingtest` y la separación de skills para habilitar scoring.

```ts
// cvParserSchema.ts
export const CV_PARSER_JSON_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    firstName: {
      type: SchemaType.STRING,
      description: 'Nombre de pila del candidato',
    },
    lastName: {
      type: SchemaType.STRING,
      description: 'Apellido/s del candidato',
    },
    email: {
      type: SchemaType.STRING,
      description: 'Correo electrónico de contacto',
    },
    phone: {
      type: SchemaType.STRING,
      description: 'Número telefónico con código de área',
    },
    location: {
      type: SchemaType.STRING,
      description: 'Ciudad o país de residencia actual',
    },
    summary: {
      type: SchemaType.STRING,
      description: 'Resumen o extracto del perfil profesional',
    },
    hardSkills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Tecnologías, lenguajes, frameworks y herramientas técnicas',
    },
    softSkills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Habilidades interpersonales y de gestión',
    },
    languages: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Idiomas con nivel si está indicado',
    },
    workExperience: {
      type: SchemaType.ARRAY,
      description: 'Trayectoria laboral ordenada de más reciente a más antigua',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
          startDate: {
            type: SchemaType.STRING,
            description: 'Formato YYYY-MM o YYYY',
          },
          endDate: {
            type: SchemaType.STRING,
            description: "Formato YYYY-MM, YYYY o 'Actualidad'",
          },
          description: { type: SchemaType.STRING },
        },
      },
    },
    education: {
      type: SchemaType.ARRAY,
      description: 'Historial académico completo',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          institution: { type: SchemaType.STRING },
          degree: { type: SchemaType.STRING },
          startDate: { type: SchemaType.STRING },
          endDate: { type: SchemaType.STRING },
        },
      },
    },
  },
  required: [],
};
```

---

## 2. Servicio de parsing — interfaz de `parsingtest`, config robusta

El parser recibe un `Buffer` (ya descargado) en lugar de un path de Storage. Esto lo hace agnóstico de Firebase y testeable unitariamente con cualquier PDF.

```ts
// cvParsingService.ts

const MODEL_ID = 'gemini-1.5-flash';
// Versión incluye el modelo para poder distinguir datos parseados con modelos distintos en Firestore
const PARSER_VERSION = `cv-parser/1.0+${MODEL_ID}`;

const SYSTEM_PROMPT = `Eres un parser de CVs para un ATS profesional.
Tu única tarea es leer el PDF adjunto y devolver un JSON ajustado al schema.

Reglas estrictas:
- Devuelve nombres canónicos de skills (ej: "React" en vez de "ReactJS",
  "Node.js" en vez de "nodejs", "PostgreSQL" en vez de "postgres").
- Separar hard skills (técnicas) de soft skills (interpersonales) en sus campos correspondientes.
- Si un campo no aparece en el CV, omítelo. No inventes datos.
- Para fechas usa el formato YYYY-MM. Si solo hay año, usa YYYY.
- En workExperience, ordena de más reciente a más antigua.
- No agregues comentarios ni texto fuera del JSON.`;

export class CvParsingService {
  private vertexClient: VertexAI | null = null; // inicialización lazy

  async parseFromBuffer(buffer: Buffer): Promise<ParsedCandidateProfileData> {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      return { ...MOCK_PARSED_PROFILE };
    }
    return this.parseWithRetry(buffer);
  }

  // Retry simple con backoff ante errores transitorios de Gemini (429, 503)
  private async parseWithRetry(
    buffer: Buffer,
    attempts = 2,
  ): Promise<ParsedCandidateProfileData> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await this.callVertexAI(buffer);
      } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw new CvParsingError(
      'Se agotaron los reintentos al llamar a Vertex AI.',
    );
  }

  private async callVertexAI(
    buffer: Buffer,
  ): Promise<ParsedCandidateProfileData> {
    const model = this.getModel();
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: buffer.toString('base64'),
              },
            },
            { text: SYSTEM_PROMPT },
          ],
        },
      ],
    });

    const responseText =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!responseText)
      throw new CvParsingError('Vertex AI devolvió una respuesta vacía.');

    const parsed = JSON.parse(responseText) as ParsedCandidateProfileData;

    if (!isValidParsedProfile(parsed)) {
      throw new CvParsingError(
        'El output de Gemini no cumple el schema mínimo esperado.',
      );
    }

    return { ...parsed, parserVersion: PARSER_VERSION };
  }

  private getModel() {
    if (!this.vertexClient) {
      const project = this.resolveProjectId(); // multi-fuente: no falla en silencio
      const location = process.env.VERTEX_LOCATION ?? 'us-central1'; // configurable por env
      this.vertexClient = new VertexAI({ project, location });
    }
    return this.vertexClient.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: CV_PARSER_JSON_SCHEMA,
        temperature: 0.1,
      },
    });
  }

  private resolveProjectId(): string {
    const project =
      process.env.GCP_PROJECT ??
      process.env.GCLOUD_PROJECT ??
      process.env.GOOGLE_CLOUD_PROJECT ??
      admin.app().options.projectId;

    if (!project)
      throw new CvParsingError(
        'No se pudo determinar el GCP project ID para Vertex AI.',
      );
    return project;
  }
}

// Validación mínima del output — al menos un campo de identidad debe estar presente
function isValidParsedProfile(
  data: unknown,
): data is ParsedCandidateProfileData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return !!(d.firstName || d.lastName || d.email);
}
```

---

## 3. Trigger — configuración de memoria y timeout (ausente en ambas ramas)

Ninguna rama configura estos parámetros. Sin ellos, la función corre con 256 MB y 60s de timeout, lo que puede causar crashes al procesar PDFs en memoria y timeouts en respuestas lentas de Gemini.

```ts
// onCvUploaded.ts
export const onCVUploaded = onObjectFinalized(
  {
    memory: '512MiB', // margen para el Buffer del PDF + overhead de Vertex AI SDK
    timeoutSeconds: 120, // Gemini puede tardar 15-30s con PDFs; 60s default es insuficiente
    region: process.env.FUNCTIONS_REGION ?? 'us-central1',
  },
  async (event) => {
    // ... mismo flujo que ambas ramas
  },
);
```

---

## 4. Scoring service — razón de ser del parsing (no implementado en ninguna rama)

El parsing de CV sin scoring no agrega valor al ATS. La separación `hardSkills`/`softSkills` del schema propuesto habilita este servicio.

```ts
// cvScoringService.ts

export interface ScoringResult {
  score: number; // 0 a 1
  matchedSkills: string[];
  missingSkills: string[];
}

export class CvScoringService {
  score(
    parsedCv: ParsedCandidateProfileData,
    jobRequirements: string[],
  ): ScoringResult {
    const candidateSkills = [
      ...(parsedCv.hardSkills ?? []),
      ...(parsedCv.softSkills ?? []),
    ].map((s) => s.toLowerCase());

    const matched = jobRequirements.filter((req) =>
      candidateSkills.some((skill) => skill.includes(req.toLowerCase())),
    );

    const missing = jobRequirements.filter((r) => !matched.includes(r));

    return {
      score:
        jobRequirements.length > 0
          ? matched.length / jobRequirements.length
          : 0,
      matchedSkills: matched,
      missingSkills: missing,
    };
  }
}
```

> **Nota**: Este servicio requiere que el modelo `Job` exponga un campo `requiredSkills: string[]` en Firestore para poder comparar contra el perfil del candidato.

---

## 5. Contrato front↔back: shared-types como única fuente de verdad

### El problema actual

Las dos ramas definieron el schema de Gemini primero y el shared type después, sin partir del contrato que el front ya consume. Esto genera representaciones desincronizadas:

| Capa                                                | Campos de skills                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `CandidateProfileView` (vista de candidato)         | `candidate.detectedSkills: string[]` (mock, plana)               |
| `TechnicalInterviewForm` (formulario de entrevista) | `skills: string[]` — itera sobre ellas para puntuar              |
| `ManualCandidateForm` (postulación manual)          | `technicalSkills: string` (string libre, sin separar)            |
| `Candidate` model (shared-types/main)               | `technicalSkills?: string[]`                                     |
| `ParsedCV` (`fb-53-102`)                            | `hardSkills`, `softSkills`, `skills` (separados)                 |
| `ParsedCandidateProfileData` (main)                 | heredado de `CandidatePostulationBase` → `technicalSkills` plano |
| Schema de Gemini (`parsingtest`)                    | `skills` (lista plana, sin separar)                              |

Ninguna rama cierra el ciclo: el parseo no escribe en los campos que el front lee, y el `TechnicalInterviewForm` trabaja con skills sin diferenciar — puntúa "Trabajo en equipo" igual que "TypeScript".

---

### Por qué los skills deben estar separados

El `TechnicalInterviewForm` recibe una lista de skills y genera un `Rating` por cada una. Si la lista mezcla hard y soft skills, el entrevistador termina puntuando habilidades interpersonales con el mismo criterio que tecnologías — el formulario pierde sentido.

Con `hardSkills` separadas en Firestore:

- El formulario de entrevista itera solo `candidate.hardSkills` → solo skills técnicas evaluables
- `CandidateProfileView` puede mostrar las dos secciones por separado
- El scoring compara `hardSkills` del candidato contra los requisitos técnicos del puesto
- `softSkills` queda disponible como contexto sin contaminar la evaluación técnica

---

### Cómo debe quedar el flujo

```
shared-types (fuente de verdad)
       ↓ se deriva
Schema de Gemini (cvParserSchema.ts)
       ↓ produce
ParsedCandidateProfileData
       ↓ se persiste directamente en
Candidate (campos que el front consume)
```

El orden importa: **primero se define el tipo, después se construye el schema**.

---

### Shared type propuesto

```ts
// packages/shared-types/src/models/parsing/parsed-candidate-profile-data.ts

export interface ParsedCandidateProfileData {
  // Identidad
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;

  // Perfil profesional
  professionalSummary?: string;

  // Skills separados — el front los consume por separado
  hardSkills?: string[]; // ← TechnicalInterviewForm itera sobre estos
  softSkills?: string[]; // ← CandidateProfileView los muestra en sección aparte
  languages?: string[];

  // Historial
  workExperience?: ParsedExperience[];
  education?: ParsedEducation[];

  // Metadata
  parserVersion?: string; // ej: "cv-parser/1.0+gemini-1.5-flash"
}
```

---

### Cambios necesarios en `Candidate` model

El modelo de `Candidate` en shared-types debe reemplazar `technicalSkills` por los campos separados para que el front pueda consumirlos directamente:

```ts
// packages/shared-types/src/models/candidate.ts

export interface Candidate {
  // ...campos existentes...

  // Reemplaza technicalSkills?: string[]
  hardSkills?: string[];
  softSkills?: string[];
  languages?: string[];

  workExperience?: ParsedExperience[];
  education?: ParsedEducation[];
  professionalSummary?: string;
}
```

---

### Mapeo al persistir en Firestore

```ts
// CvUploadService — después del parseo exitoso
await candidatesRepository.markParsingDone(candidateId, {
  firstName: parsedData.firstName,
  lastName: parsedData.lastName,
  email: parsedData.email,
  phone: parsedData.phone,
  location: parsedData.location,
  professionalSummary: parsedData.professionalSummary,
  hardSkills: parsedData.hardSkills, // el front los consume por separado
  softSkills: parsedData.softSkills,
  languages: parsedData.languages,
  workExperience: parsedData.workExperience,
  education: parsedData.education,
  parserVersion: parsedData.parserVersion,
});
```

---

### Qué hay que actualizar para cerrar el ciclo

1. **`Candidate` model** (shared-types) → reemplazar `technicalSkills` por `hardSkills` / `softSkills` / `languages`
2. **`ParsedCandidateProfileData`** (shared-types) → usar el tipo propuesto arriba
3. **`cvParserSchema.ts`** → derivarse de ese tipo (los campos del schema = los campos del tipo)
4. **`candidatesRepository.markParsingDone`** → escribir `hardSkills` y `softSkills` directamente en el documento del candidato
5. **`TechnicalInterviewForm`** → recibir `candidate.hardSkills` en lugar de `candidate.detectedSkills` (nombre de mock)
6. **`CandidateProfileView`** → mostrar `hardSkills` y `softSkills` en secciones separadas en lugar de `detectedSkills`
7. **`ManualCandidateForm`** → separar el campo de skills en dos inputs (hard y soft) o mantener uno plano y guardarlo en `hardSkills`

---

## Tabla de decisiones: qué viene de dónde

| Decisión                                                           | Fuente        |
| ------------------------------------------------------------------ | ------------- |
| `parseFromBuffer(Buffer)` — parser agnóstico de Storage            | `parsingtest` |
| Inicialización lazy del cliente de Vertex AI                       | `parsingtest` |
| Resolución multi-fuente del GCP project ID                         | `parsingtest` |
| `VERTEX_LOCATION` configurable por variable de entorno             | `parsingtest` |
| System prompt con reglas de normalización de skills                | `parsingtest` |
| Doble catch — fallo en `markParsingFailed` también logueado        | `parsingtest` |
| Schema en archivo separado con `description` por campo             | `fb-53-102`   |
| `hardSkills` / `softSkills` / `location` / `summary` / `languages` | `fb-53-102`   |
| Organización en subdirectorio `services/parsing/`                  | `fb-53-102`   |
| `firstName` / `lastName` separados (mejor para UI y búsquedas)     | `parsingtest` |
| `memory: '512MiB'` y `timeoutSeconds: 120` en el trigger           | **nuevo**     |
| Validación del output de Gemini antes de persistir                 | **nuevo**     |
| `parserVersion` incluye el nombre del modelo                       | **nuevo**     |
| Retry con backoff ante errores transitorios (429, 503)             | **nuevo**     |
| `CvScoringService`                                                 | **nuevo**     |
