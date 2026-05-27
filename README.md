# ATS HRMS

Web-based Applicant Tracking System for a single company. Covers the full recruitment lifecycle: job posting → candidate registration → CV parsing + AI scoring → pipeline management → interviews → offer → employee conversion.

## Stack

| Layer       | Tech                                                     |
| ----------- | -------------------------------------------------------- |
| Frontend    | Next.js 15 (App Router), TypeScript strict, Tailwind CSS |
| Data / Auth | Firebase Auth, Firestore, Storage, Cloud Functions       |
| AI          | OpenAI GPT-4o-mini (CV parsing + fit scoring)            |
| State       | TanStack Query (server state), useState/useReducer (UI)  |
| Monorepo    | pnpm workspaces + Turborepo                              |
| Icons       | lucide-react                                             |

**Deployment:** Firebase Hosting + Cloud Functions (Node 20).

## Monorepo structure

```
apps/web/src/
  app/
    (public)/       SSG — job board, no auth
    (hr)/           SSR — recruiter dashboard, auth required
    (candidate)/    CSR — candidate portal
  features/         Co-located by feature (jobs, candidates, pipeline, interviews, offers)
  repositories/
    interfaces/     TypeScript interfaces — Firebase never imported here
    firebase/       Firebase implementations — ONLY place Firebase is imported
    index.ts        Swap here to migrate to another DB
  shared/
    lib/firebase.ts SDK init only
packages/shared-types/   DTOs shared between web and functions
apps/functions/src/
  triggers/         Thin Cloud Function handlers
  services/         Business logic
  ai/               CV parsing, scoring, matching
```

## Setup

**Prerequisites**

```bash
npm install -g pnpm firebase-tools
node >= 22
```

**Install**

```bash
pnpm install
pnpm audit --fix      # fix outdated deps if needed
```

**Firebase login**

```bash
firebase login        # use grupo.quatro.ort@gmail.com
```

## Local development

Necesitás 3 terminales la primera vez, 2 a partir de la segunda.

### Primera vez

**Terminal 1 — emulador Firebase**

```bash
firebase emulators:start --only auth,functions,firestore,storage
```

Esperá a que aparezca `All emulators ready`.

**Terminal 2 — seed de datos + frontend**

```bash
pnpm seed       # carga jobs y candidatos de prueba en el emulador
pnpm dev-web    # levanta Next.js en http://localhost:3000
```

La Emulator UI queda disponible en `http://localhost:4000`.

### A partir de la segunda vez

El seed solo es necesario si el emulador perdió los datos (se reinició sin export). Si los datos ya están, alcanza con:

```bash
# Terminal 1
firebase emulators:start --only auth,functions,firestore,storage

# Terminal 2
pnpm dev-web
```

### Si modificás Cloud Functions

El emulador carga el JS compilado de `apps/functions/lib/`. Si cambiás código en `src/` necesitás recompilar para que el emulador tome los cambios:

```bash
pnpm compile-fn -- --watch   # recompila en cada cambio automáticamente
```

### Persistir datos del emulador entre reinicios

Para no tener que correr `pnpm seed` cada vez, exportá los datos después de seedear:

```bash
# Con el emulador corriendo en otra terminal
firebase emulators:export ./emulator-data
```

Y levantá siempre con import:

```bash
firebase emulators:start --only auth,functions,firestore,storage --import=./emulator-data --export-on-exit
```

> `emulator-data/` está en `.gitignore`. No commitear datos de emulador.

---

## All scripts

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Start all apps in dev mode            |
| `pnpm dev-web`     | Start Next.js only                    |
| `pnpm build`       | Build all apps                        |
| `pnpm compile-fn`  | Build Cloud Functions only            |
| `pnpm seed`        | Seed jobs y candidatos en el emulador |
| `pnpm lint`        | Lint all packages                     |
| `pnpm format`      | Prettier format all TS/MD files       |
| `pnpm check-types` | TypeScript check across monorepo      |
| `pnpm test`        | Run all tests                         |
| `pnpm test:watch`  | Tests in watch mode                   |

**Deploy**

```bash
pnpm deploy               # full deploy
pnpm deploy:functions     # functions only
pnpm deploy:rules         # Firestore + Storage rules only
pnpm deploy:hosting       # hosting only
pnpm deploy:staging       # deploy to staging alias
```

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org/es/). A pre-commit hook runs lint + format + tests automatically.

```
feat(pipeline): add discard reason validation
fix(auth): handle expired session redirect
```

**Before every PR**

- No Firebase imports outside `repositories/firebase/` and `shared/lib/`
- New fields added to `packages/shared-types`
- Side effects (emails, scoring, counters) in Cloud Functions — not frontend
- Colors from palette only, no raw hex
- Only lucide-react icons
- `pnpm check-types` passes, no `any`

**Adding a feature**

```
1. Define/update types in packages/shared-types
2. Add method to repository interface (interfaces/)
3. Implement in Firebase repository (firebase/)
4. Write service method — business logic here, not in repository
5. Build component/page — calls service only, never Firebase directly
6. Add Cloud Function if feature has side effects
```
