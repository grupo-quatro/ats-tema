# Especificación de Endpoints — Positions & Application Pipeline

Documento de referencia para el equipo de back. Cubre los endpoints necesarios para el dashboard de gestión de posiciones y el pipeline de postulaciones.

---

## Contexto técnico

- **Runtime:** Firebase Functions v2 (`onRequest` para HTTP, `onCall` para Callables autenticados)
- **Base de datos:** Firestore
- **Patrón existente:** los endpoints HTTP usan `onRequest`. Los Callables autenticados usan `onCall`. Respetar el patrón según si el endpoint requiere auth.
- **Repositorios disponibles:** `JobsRepository` y `ApplicationsRepository` ya están implementados con los métodos base necesarios.

---

## Cambio en shared-types — Hacer primero

Antes de implementar cualquier endpoint, actualizar `ApplicationStage` en `packages/shared-types/src/models/application.ts`:

```ts
// REEMPLAZAR el tipo actual por este:
export type ApplicationStage =
  | 'applied' // 1. Postulación recibida
  | 'screening' // 2. En revisión
  | 'cv_submitted' // 3. CV presentado a área
  | 'interview_1_scheduled' // 4. Entrevista 1 agendada
  | 'interview_1_done' // 5. Entrevista 1 realizada — en evaluación
  | 'interview_2_scheduled' // 6. Entrevista 2 agendada
  | 'interview_2_done' // 7. Entrevista 2 realizada — en evaluación
  | 'offer_sent' // 8. Oferta enviada
  | 'hired' // 9. Contratado
  | 'rejected' // 10. Descartado (registrar motivo)
  | 'withdrawn'; // El candidato se baja por cuenta propia
```

`ApplicationStatus` no cambia: `'active' | 'draft' | 'rejected' | 'withdrawn' | 'hired'`.

---

## Endpoints de Positions

### 1. `listPositions` — Listar posiciones con filtros y paginación

**Tipo:** `onRequest` (HTTP)  
**Método:** `GET`  
**Auth requerida:** Sí (validar token en header `Authorization: Bearer <token>`)

```
GET /listPositions
    ?status=open               // opcional: draft | open | paused | closed
    &search=frontend           // opcional: filtra por title y department (case-insensitive)
    &limit=20                  // opcional, default: 20, máximo: 100
    &startAfter=<doc-id>       // opcional: cursor de paginación (Firestore doc ID)
```

**Response 200:**

```json
{
  "data": [ ...Job[] ],
  "nextCursor": "<firestore-doc-id> | null",
  "total": 42
}
```

**Notas de implementación:**

- Paginación por cursor (`startAfter`) — no usar offset. Firestore no lo soporta eficientemente.
- `total` puede ser una estimación mediante `count()` de Firestore si el filtro lo permite, o `null` si es costoso.
- El filtro `search` aplica sobre `title` y `department`. Dado que Firestore no tiene full-text search nativo, filtrar en memoria sobre el resultado paginado o usar un índice de Algolia/Typesense si el volumen lo justifica. Por ahora, filtrar en memoria es aceptable.
- Sin `status` en el query, devuelve todas las posiciones (todos los estados).

**Errores:**

```json
{ "error": "Unauthorized." }          // 401
{ "error": "Límite máximo es 100." }  // 400
```

---

### 2. `createJob` — Crear posición

**Ya existe.** Verificar que la función devuelva el `id` del documento creado en Firestore.

El método `JobsRepository.create()` ya retorna el `id` — confirmar que el callable lo incluya en el response.

**Response esperado:**

```json
{ "id": "<firestore-doc-id>" }
```

Si actualmente el response no incluye el `id`, agregarlo. El front lo necesita para redirigir al detalle tras la creación.

---

### 3. `getPosition` — Detalle de posición (dashboard)

**Tipo:** `onRequest` (HTTP)  
**Método:** `GET`  
**Auth requerida:** Sí

```
GET /getPosition?id=<firestore-doc-id>
```

**Response 200:** objeto `Job` completo.

**Errores:**

```json
{ "error": "El parámetro id es requerido." }      // 400
{ "error": "Posición no encontrada." }             // 404
```

**Nota:** El callable público `getJobDetail` busca por `jobId` y es para el portal de candidatos. Este endpoint es para el dashboard interno y usa el mismo repositorio (`JobsRepository.findById`), pero con auth.

---

### 4. `updatePosition` — Editar posición

**Tipo:** `onRequest` (HTTP)  
**Método:** `PATCH`  
**Auth requerida:** Sí

**Request body:**

```json
{
  "id": "<firestore-doc-id>",
  "title": "...",
  "department": "...",
  "seniority": "...",
  "location": "remote | on-site | hybrid",
  "city": "...",
  "description": "...",
  "skills": [...],
  "observations": "...",
  "additionalCriteria": [...],
  "responsabilities": [...],
  "benefits": [...]
}
```

Solo `id` es requerido. El resto son campos opcionales — se aplica merge con `{ merge: true }` (ya implementado en `JobsRepository.update()`).

**Response 200:**

```json
{ "ok": true }
```

**Errores:**

```json
{ "error": "El campo id es requerido." }   // 400
{ "error": "Posición no encontrada." }     // 404
```

---

### 5. `updatePositionStatus` — Cambiar estado de la posición

**Tipo:** `onRequest` (HTTP)  
**Método:** `PATCH`  
**Auth requerida:** Sí

**Request body:**

```json
{
  "id": "<firestore-doc-id>",
  "status": "open | paused | closed | draft"
}
```

**Efecto colateral:** cuando `status === 'closed'`, setear `closedAt = FieldValue.serverTimestamp()` además de `updatedAt`.

**Response 200:**

```json
{ "ok": true }
```

**Errores:**

```json
{ "error": "El campo id es requerido." }                          // 400
{ "error": "Estado inválido." }                                   // 400
{ "error": "Posición no encontrada." }                            // 404
```

---

### 6. `deletePosition` — Eliminar posición

**Tipo:** `onRequest` (HTTP)  
**Método:** `DELETE`  
**Auth requerida:** Sí

**Request body:**

```json
{ "id": "<firestore-doc-id>" }
```

**Response 200:**

```json
{ "ok": true }
```

**Errores:**

```json
{ "error": "El campo id es requerido." }   // 400
{ "error": "Posición no encontrada." }     // 404
```

**Nota:** evaluar si el delete es físico o lógico (soft delete con `deletedAt`). Si hay postulaciones asociadas a la posición, un delete físico puede romper referencias. Recomendación: soft delete o solo permitir delete cuando `status === 'draft'`.

---

## Endpoint de Application Pipeline

### 7. `updateApplicationStage` — Avanzar etapa de una postulación

**Tipo:** `onCall` (Callable autenticado) — consistente con `getApplicationsByJob`  
**Auth requerida:** Sí (Firebase Auth)

**Request payload:**

```ts
{
  applicationId: string;
  stage: ApplicationStage;
  rejectionReason?: string; // requerido cuando stage === 'rejected'
  notes?: string;           // opcional, comentario interno del recruiter
}
```

**Lógica de validación:**

- `applicationId` requerido.
- `stage` requerido y debe ser un valor válido del enum `ApplicationStage`.
- Si `stage === 'rejected'`, `rejectionReason` es requerido.
- No se permite ir hacia atrás en el pipeline (validación opcional por ahora, pero recomendada).

**Efecto en Firestore:** usa `ApplicationsRepository.update()` que ya setea `stageUpdatedAt` automáticamente cuando cambia el `stage`.

**Efectos colaterales según stage:**
| Stage | Acción adicional |
|---|---|
| `hired` | Setear `ApplicationStatus = 'hired'` |
| `rejected` | Setear `ApplicationStatus = 'rejected'`, persistir `rejectionReason` |
| `withdrawn` | Setear `ApplicationStatus = 'withdrawn'` |

**Response exitoso:**

```ts
{
  ok: true;
}
```

**Errores (HttpsError):**

```ts
'invalid-argument'; // applicationId o stage faltante/inválido
'invalid-argument'; // stage === 'rejected' sin rejectionReason
'not-found'; // postulación no existe
'internal'; // error de Firestore
```

---

## Resumen de prioridades

| #   | Función                  | Tipo      | Prioridad                | Repo disponible                      |
| --- | ------------------------ | --------- | ------------------------ | ------------------------------------ |
| 1   | `listPositions`          | onRequest | **Alta**                 | `JobsRepository.findAll()` + filtros |
| 2   | `createJob`              | onRequest | Media — revisar response | `JobsRepository.create()`            |
| 3   | `getPosition`            | onRequest | **Alta**                 | `JobsRepository.findById()`          |
| 4   | `updatePosition`         | onRequest | **Alta**                 | `JobsRepository.update()`            |
| 5   | `updatePositionStatus`   | onRequest | Media                    | `JobsRepository.update()`            |
| 6   | `deletePosition`         | onRequest | Media                    | — (implementar en repo)              |
| 7   | `updateApplicationStage` | onCall    | **Alta**                 | `ApplicationsRepository.update()`    |

**Prerequisito de todo:** actualizar `ApplicationStage` en `shared-types` antes de implementar el endpoint 7.
