# Guía de conexión — CandidatePipeline

Esta guía describe exactamente qué cambiar en el mockup `CandidatePipeline` para conectarlo al backend real. El backend, los hooks, el service y el repositorio ya están implementados — tu trabajo es reemplazar el mock data y las funciones vacías del componente.

Lee `AGENTS.md` antes de arrancar. La regla más importante: **nunca importes Firebase en un componente**. Todos los datos vienen de los hooks de la capa `features/pipeline/`.

---

## Archivos que ya existen y vas a usar

```
apps/web/app/features/pipeline/
  hooks/usePipeline.ts              ← los tres hooks que necesitás
  pipeline.service.ts               ← no tocar
  constants/stage-labels.ts         ← mapeo de stage interno → texto visual

apps/web/app/repositories/
  interfaces/application.repository.ts   ← no tocar
  firebase/application.firebase.repository.ts  ← no tocar

apps/web/app/dashboard/candidates/page.tsx  ← la page que renderiza el componente
```

---

## Paso 1 — Obtener el `jobId`

El componente recibe `jobId` como prop (o lo lee de los params de la route). La page actual en `app/dashboard/candidates/page.tsx` muestra un placeholder — hay que pasar el `jobId` de la posición seleccionada.

**Opción A — jobId desde params de la URL** (recomendada si la ruta es `/dashboard/positions/[id]/candidates`):

```tsx
// app/dashboard/positions/[id]/candidates/page.tsx
export default function CandidatesPage({ params }: { params: { id: string } }) {
  return <CandidatePipeline jobId={params.id} onViewCandidate={(cId) => router.push(`/candidate/${cId}`)} />;
}
```

**Opción B — jobId hardcodeado temporalmente para desarrollo:**

```tsx
<CandidatePipeline jobId="senior-frontend-developer" onViewCandidate={...} />
```

---

## Paso 2 — Reemplazar `mockCandidates` por datos reales

En el componente, eliminá el array `mockCandidates` y usá el hook:

```tsx
import { useGetCandidatesByJob } from '../../features/pipeline/hooks/usePipeline';

export default function CandidatePipeline({
  jobId,
  onViewCandidate,
}: {
  jobId: string;
  onViewCandidate: (candidateId: number) => void;
}) {
  const { data: candidates = [], isLoading, isError } = useGetCandidatesByJob(jobId);
  // ...
}
```

La respuesta es `ApplicationWithCandidateDTO[]`, ordenada por `fitScore` desc. El índice del array es el ranking.

**Mapeo de campos — mock → real:**

| Campo en el mock       | Campo real en `ApplicationWithCandidateDTO` |
|------------------------|---------------------------------------------|
| `candidate.name`       | `candidate.candidateName`                   |
| `candidate.matchScore` | `candidate.fitScore`                        |
| `candidate.fitPercentage` | `candidate.fitScore`                     |
| `candidate.status` (string visual) | `candidate.stage` (key interna) |
| `candidate.appliedDate` | `candidate.createdAt`                      |
| `candidate.avatar`     | Calcular desde `candidateName` (ver abajo)  |
| `candidate.ranking`    | `index + 1` del array (ya viene ordenado)   |

**Avatar desde nombre:**
```tsx
function getAvatar(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
```

**Stage a texto visual** — importar las constantes ya creadas:
```tsx
import { STAGE_LABELS } from '../../features/pipeline/constants/stage-labels';

// En el JSX donde antes mostrabas candidate.status:
<span>{STAGE_LABELS[candidate.stage]}</span>
```

**Estados de loading y error** — agregar antes de la tabla:
```tsx
if (isLoading) return <div>Cargando candidatos...</div>;
if (isError) return <div>No se pudieron cargar los candidatos.</div>;
```

---

## Paso 3 — Conectar el filtro por estado

El `select` de status ya filtra del lado del front sobre el array que devuelve el hook. La lógica de filtrado queda así:

```tsx
import { STAGE_LABELS } from '../../features/pipeline/constants/stage-labels';
import type { ApplicationStage } from '@ats/shared-types';

// Reemplazar statusOptions con los stages reales:
const STATUS_OPTIONS = [
  'Todos los estados',
  ...Object.entries(STAGE_LABELS).map(([, label]) => label),
];

// Filtrado local sobre `candidates`:
const filtered = candidates.filter((c) => {
  const matchesSearch =
    !searchTerm ||
    c.candidateName?.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus =
    selectedStatus === 'Todos los estados' ||
    STAGE_LABELS[c.stage as ApplicationStage] === selectedStatus;

  return matchesSearch && matchesStatus;
});
```

Usá `filtered` en lugar de `mockCandidates` para renderizar la tabla.

---

## Paso 4 — Conectar el botón de descartar

El botón `<Trash>` llama `useDiscardApplication`. Necesita un `rejectionReason` — al menos abrir un prompt o modal simple.

```tsx
import {
  useDiscardApplication,
  useUpdateApplicationStage,
} from '../../features/pipeline/hooks/usePipeline';

// Dentro del componente:
const discard = useDiscardApplication(jobId);

// En el onClick del botón Trash:
<button
  onClick={(e) => {
    e.stopPropagation();
    const reason = window.prompt('Motivo de descarte:');
    if (reason) discard.mutate({ applicationId: candidate.id, rejectionReason: reason });
  }}
>
  <Trash className="w-4 h-4" />
</button>
```

> Si el diseño tiene un modal de confirmación, pasá el `applicationId` al estado del modal y llamá `discard.mutate()` desde el submit del modal. El patrón es el mismo.

---

## Paso 5 — Conectar el botón de avanzar stage (botón Edit)

El botón `<Edit>` puede abrir un selector de stage. Ejemplo mínimo:

```tsx
const updateStage = useUpdateApplicationStage(jobId);

// onClick del botón Edit:
<button
  onClick={(e) => {
    e.stopPropagation();
    // Abrís el modal/selector con los stages disponibles
    // y al confirmar:
    updateStage.mutate({ applicationId: candidate.id, stage: stageSeleccionado });
  }}
>
  <Edit className="w-4 h-4" />
</button>
```

Los stages válidos para el selector vienen de `STAGE_LABELS`:
```tsx
import { STAGE_LABELS } from '../../features/pipeline/constants/stage-labels';
// Object.entries(STAGE_LABELS) → [['applied', 'Postulación recibida'], ...]
```

---

## Paso 6 — Conectar `onViewCandidate`

El `candidateId` que existe en el modelo real es `candidate.candidateId` (string UUID de Firebase), no un número. Ajustar la firma del prop:

```tsx
// Antes:
onViewCandidate: (candidateId: number) => void

// Después:
onViewCandidate: (candidateId: string) => void
```

Y en el click de la fila:
```tsx
onClick={() => onViewCandidate(candidate.candidateId)}
```

---

## Paso 7 — Verificar la `getStatusColor`

La función `getStatusColor` usaba strings visuales. Ahora que tenés los stages internos podés simplificarla:

```tsx
import type { ApplicationStage } from '@ats/shared-types';

const getStatusColor = (stage: ApplicationStage): string => {
  if (stage === 'hired') return 'bg-green-100 text-green-700 border-green-200';
  if (stage === 'offer_sent') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (stage === 'interview_2_done' || stage === 'interview_2_scheduled')
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (stage === 'interview_1_done' || stage === 'interview_1_scheduled')
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (stage === 'cv_submitted') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (stage === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};
```

---

## Resumen del componente conectado

```tsx
// Imports que necesitás agregar
import { useGetCandidatesByJob, useUpdateApplicationStage, useDiscardApplication } from '../../features/pipeline/hooks/usePipeline';
import { STAGE_LABELS } from '../../features/pipeline/constants/stage-labels';
import type { ApplicationStage } from '@ats/shared-types';

// Props del componente
{ jobId: string; onViewCandidate: (candidateId: string) => void }

// Hooks
const { data: candidates = [], isLoading, isError } = useGetCandidatesByJob(jobId);
const updateStage = useUpdateApplicationStage(jobId);
const discard = useDiscardApplication(jobId);

// Datos para renderizar
const filtered = candidates.filter(/* búsqueda + filtro de stage */);
const ranked = filtered.map((c, i) => ({ ...c, ranking: i + 1 }));
```

---

## Lo que NO tenés que hacer

- No importes `callFunction`, `httpsCallable`, ni nada de Firebase directamente en el componente.
- No recreés el service ni el repositorio — ya existen.
- No cambies los archivos en `features/pipeline/pipeline.service.ts` ni en `repositories/`.
- No definas `STAGE_LABELS` localmente — importalos desde `features/pipeline/constants/stage-labels.ts`.
