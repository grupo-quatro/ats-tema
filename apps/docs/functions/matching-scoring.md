# Matching y Scoring de Candidaturas

## Objetivo

Este documento describe el funcionamiento actual del matching entre candidatos
y posiciones, el cálculo del FIT%, su ciclo de actualización y las decisiones de
alcance adoptadas.

El módulo busca producir un resultado:

- determinístico;
- explicable;
- reproducible;
- independiente del dominio de la posición;
- actualizado cuando cambian sus datos de entrada.

La IA participa en la extracción estructurada de skills desde el CV. No calcula
el FIT% ni decide semánticamente si dos habilidades diferentes son equivalentes.

---

## Flujo General

```txt
CV o carga manual
  ↓
Candidate.technicalSkills
  ↓
Normalización determinística de nombres
  ↓
Comparación contra Job.skills
  ↓
Scoring ponderado
  ↓
Application.fitScore + Application.skillMatchStats
  ↓
Ordenamiento y visualización en pipeline
```

### Responsabilidad de IA

En el flujo de CV, Vertex AI extrae información del documento y propone
`technicalSkills`. El candidato puede revisar y corregir estos datos antes de
confirmar su perfil.

La IA no:

- calcula porcentajes;
- asigna pesos;
- detecta aliases semánticos;
- modifica requisitos de la posición;
- decide si una candidatura debe continuar.

---

## Datos Utilizados

### Candidato

El matching utiliza:

```ts
Candidate.technicalSkills?: string[];
Candidate.profileStatus: 'draft' | 'completed';
```

Solo un perfil `completed` puede tener un score válido.

`Candidate.yearsOfExperience` representa experiencia laboral general aproximada
y no se utiliza para evaluar skills específicas.

### Posición

Cada criterio evaluado es una skill configurada en la posición:

```ts
interface Skill {
  name: string;
  weight: number;
  type: 'mandatory' | 'desirable';
}
```

- `name`: nombre original mostrado y conservado para auditoría.
- `weight`: importancia relativa dentro del cálculo, entre 1 y 10.
- `type`: clasifica la skill como obligatoria o deseable.

El modelo no incluye años de experiencia por skill porque ese dato no se captura
de forma equivalente para el candidato.

---

## Normalización Determinística

Antes de comparar nombres, el sistema genera claves normalizadas y compactas.

La normalización:

- elimina diferencias entre mayúsculas y minúsculas;
- elimina acentos;
- unifica espacios;
- trata puntos, guiones y guiones bajos como separadores;
- genera una clave compacta sin espacios;
- conserva `+` y `#` porque distinguen skills como `C`, `C++` y `C#`;
- conserva el nombre original en el resultado.

Ejemplos que coinciden:

```txt
Node.js          ↔ NodeJS
Power BI         ↔ PowerBI
Social Media     ↔ social-media
Análisis Datos   ↔ Analisis_Datos
```

Ejemplos que deliberadamente no coinciden:

```txt
Java             ↔ JavaScript
C                ↔ C++
PostgreSQL       ↔ Postgres
AWS              ↔ Amazon Web Services
Marketing        ↔ Marketing Digital
```

No existe un catálogo finito de skills ni aliases mantenidos manualmente. Esto
permite utilizar el ATS para posiciones de distintos dominios sin depender de
un vocabulario técnico predefinido.

Archivo principal:

```txt
apps/functions/src/services/skillNormalizer.ts
```

---

## Fórmula de Scoring

El score se calcula únicamente con las skills configuradas en la posición.

Para cada skill:

```txt
w_i = peso configurado
m_i = 1 si existe coincidencia, 0 si no existe
```

Fórmula:

```txt
scoreTotal = suma(w_i × m_i) / suma(w_i) × 100
```

También se calculan scores parciales:

```txt
scoreMandatory = misma fórmula usando solo skills mandatory
scoreDesirable = misma fórmula usando solo skills desirable
```

Los resultados se redondean a dos decimales.

### Ejemplo

```txt
React       mandatory, peso 5 → coincide
TypeScript  mandatory, peso 3 → no coincide
Docker      desirable, peso 2 → coincide

scoreTotal     = (5 + 2) / 10 × 100 = 70
scoreMandatory = 5 / 8 × 100 = 62.5
scoreDesirable = 2 / 2 × 100 = 100
```

### Casos especiales

- Sin coincidencias válidas: `fitScore = 0`.
- Perfil sin confirmar: `fitScore` y `skillMatchStats` quedan ausentes.
- Posición sin skills válidas: `fitScore` y `skillMatchStats` quedan ausentes.
- Sin skills obligatorias: `scoreMandatory = 100` por convención.
- Sin skills deseables: `scoreDesirable = 0`.

Un score ausente no equivale a `0`.

Archivo principal:

```txt
apps/functions/src/services/skillMatchCalculator.ts
```

---

## Resultado Persistido

El resultado se almacena en la postulación:

```ts
Application.fitScore?: number;
Application.skillMatchStats?: {
  scoreTotal: number;
  scoreMandatory: number;
  scoreDesirable: number;
  tieneTodosLosMandatorios: boolean;
  skillsCoincidentes: SkillMatchDetail[];
  skillsFaltantes: SkillMatchDetail[];
  actualizadoEn: Date;
};
```

`fitScore` replica `skillMatchStats.scoreTotal` para permitir ordenamiento y
consulta eficiente.

Las skills coincidentes se ordenan por peso descendente. Las faltantes se
ordenan primero por tipo obligatorio y luego por peso descendente.

---

## Ciclo de Cálculo y Recálculo

### Creación de postulación

`onApplicationCreated` intenta calcular el score al crear la postulación.

- Si el perfil ya está completo, persiste el resultado.
- Si el perfil todavía es draft, elimina cualquier score previo y espera la
  confirmación.

### Cambios del candidato

`onCandidateMatchingInputsUpdated` recalcula todas las postulaciones asociadas
cuando:

- el perfil pasa a `completed`;
- cambian las `technicalSkills` de un perfil que puede tener score válido.

Los cambios de skills mientras el perfil continúa draft no disparan recálculos
innecesarios.

### Cambios de la posición

`onJobMatchingInputsUpdated` recalcula todas las postulaciones asociadas cuando
cambia `Job.skills`, incluyendo nombres, pesos o tipos.

Los recálculos se procesan en lotes para limitar concurrencia sobre Firestore.

Archivos principales:

```txt
apps/functions/src/services/skillMatchService.ts
apps/functions/src/triggers/onApplicationCreated.ts
apps/functions/src/triggers/onMatchingInputsUpdated.ts
```

---

## Ranking y Visualización

El pipeline:

- muestra `% FIT`;
- muestra `No disponible` cuando no existe un cálculo válido;
- permite ordenar por FIT ascendente o descendente;
- ubica siempre los scores no disponibles al final;
- muestra las skills del candidato y las faltantes en su detalle.

Por defecto, las postulaciones se obtienen ordenadas por fecha de creación
descendente y luego el frontend las ordena por FIT. Ante scores iguales, se
conserva ese orden de origen.

El ranking no bloquea ni descarta automáticamente candidatos que incumplen
skills obligatorias. `tieneTodosLosMandatorios` queda disponible como dato
explicable para decisiones posteriores.

---

## Compatibilidad con Datos Históricos

El parser de skills de posición acepta:

- el modelo actual de objetos `Skill`;
- skills legacy guardadas como strings;
- objetos históricos que todavía contienen `yearsOfExperience`.

Los campos históricos adicionales se ignoran y no afectan el cálculo.

No se requiere migración inmediata de documentos existentes en Firestore.

---

## Alcance Deliberadamente Excluido

Para mantener una solución robusta sin sobreingeniería, actualmente no se
implementa:

- matching semántico mediante IA o embeddings;
- catálogo global de skills o aliases;
- experiencia por skill;
- scoring por seniority, ubicación o modalidad;
- cálculo directo del FIT% mediante IA;
- exclusión automática por requisitos obligatorios;
- configuración dinámica de Top N.

Estas capacidades deberían evaluarse únicamente con casos reales que demuestren
una necesidad y permitan medir falsos positivos y falsos negativos.

---

## Pruebas

La cobertura automatizada valida:

- normalización de formatos equivalentes;
- prevención de coincidencias incorrectas;
- fórmula ponderada total, mandatory y desirable;
- diferencia entre score ausente y `0`;
- orden de skills coincidentes y faltantes;
- compatibilidad con datos históricos;
- recálculo al confirmar o modificar candidatos;
- recálculo al modificar skills de posiciones;
- persistencia y eliminación de resultados;
- tratamiento de scores no disponibles en pipeline.

Comandos:

```bash
cd apps/functions
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit

cd ../web
./node_modules/.bin/vitest run
./node_modules/.bin/tsc --noEmit
```

---

## Contratos y Swagger

Los contratos principales se encuentran en:

```txt
packages/shared-types/src/models/job.ts
packages/shared-types/src/models/application.ts
packages/shared-types/src/models/skillMatch.ts
packages/shared-types/src/contracts/getApplicationsByJob.ts
```

Swagger documenta:

- el modelo actual de `Skill`;
- `fitScore` como campo opcional;
- la diferencia entre FIT ausente y `0`;
- el detalle completo de `SkillMatchStats`;
- ordenamiento opcional por `fitScore` en `getApplicationsByJob`.

Archivo:

```txt
docs/swagger.json
```
