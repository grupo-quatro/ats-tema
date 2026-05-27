# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev (3 terminals on first run, 2 thereafter)
firebase emulators:start --only auth,functions,firestore,storage --import=./emulator-data --export-on-exit
pnpm seed          # only needed if emulator lost data
pnpm dev-web       # Next.js at http://localhost:3000 — Emulator UI at http://localhost:4000

# If you change Cloud Functions source
pnpm compile-fn -- --watch   # recompile on save so emulator picks up changes

# Quality
pnpm lint
pnpm check-types
pnpm test
pnpm test:watch

# Single test file
cd apps/web && pnpm vitest run path/to/file.test.ts
cd apps/functions && pnpm vitest run path/to/file.test.ts
```

Pre-commit hook runs lint + format + tests automatically. Commits must follow [Conventional Commits](https://www.conventionalcommits.org/es/).

## Architecture

**Monorepo:** pnpm workspaces + Turborepo. Three apps (`web`, `functions`, `docs`) and three packages (`shared-types`, `eslint-config`, `typescript-config`).

### shared-types (`packages/shared-types`)

The single source of truth for all DTOs and domain models shared between frontend and backend. **Any new field or contract must be defined here first.**

Key models: `Application`, `ApplicationStage`, `ApplicationStatus` in `src/models/application.ts`. Contracts (request/response shapes) live in `src/contracts/`.

### Cloud Functions (`apps/functions`)

Layered architecture: `callables/` → `validators/` → `services/` → `repositories/`.

- **`callables/`** — thin `onRequest` handlers. Enforce HTTP method, call `requireAuthenticatedUser`, delegate to service.
- **`validators/`** — throw on invalid payload before service is called.
- **`services/`** — all business logic. No Firebase SDK here, only repository calls.
- **`repositories/`** — only place `firebase-admin` is used. `ApplicationsRepository` handles all Firestore reads/writes for applications.
- **`core/http-auth.ts`** — `requireAuthenticatedUser(request)` returns the authenticated `uid`. In the emulator, token `dev-recruiter` bypasses real verification and returns `'recruiter-dev'`.
- **`triggers/`** — Firestore/Storage event triggers (e.g., `onCvUploaded` starts AI scoring pipeline).

### Web app (`apps/web`)

Next.js 15 App Router. Key constraint: **Firebase is never imported outside `repositories/firebase/` and `shared/lib/firebase.ts`**.

- **`app/repositories/interfaces/`** — TypeScript interfaces only, no Firebase.
- **`app/repositories/firebase/`** — Firebase implementations. This is the only place the Firebase client SDK is imported in frontend code.
- **`app/shared/api/`** — Functions that call Cloud Functions via `fetch`. Use `getFunctionUrl()` + `getToken()` from `shared/lib/`.
- **`app/features/`** — Feature-colocated code (components, hooks, utils, mocks). Each feature folder owns its UI state and mapping logic.
- **`app/candidate/[candidateId]/page.tsx`** — Loads the candidate profile from `sessionStorage` (keyed by `CANDIDATE_SESSION_KEY`), not from Firestore directly. The `ApplicationWithCandidateDTO` is stored there when navigating from the pipeline.

### Candidate profile data flow

`ApplicationWithCandidateDTO` (from `getApplicationsByJob`) → stored in `sessionStorage` → `mapApplicationToProfile()` converts it to `CandidateMockProfile` → `useCandidateProfile()` hook manages UI state and calls `updateApplicationStage` API.

`CandidateMockProfile.applicationId` = `ApplicationWithCandidateDTO.id` (the Firestore doc ID). `CandidateMockProfile.id` = `candidateId` (different field).

Stage mapping between frontend keys (`CandidateStageKey`) and backend enum (`ApplicationStage`) lives in `features/candidate/utils/candidate-profile.utils.ts`: `STAGE_KEY_MAP` (backend→frontend) and `CANDIDATE_STAGE_TO_APP_STAGE` (frontend→backend).

### Feature development checklist

1. Define/update types in `packages/shared-types`
2. Add method to repository interface (`interfaces/`)
3. Implement in Firebase repository (`firebase/`)
4. Write service method — business logic here, not in repository
5. Build component/page — calls service only, never Firebase directly
6. Add Cloud Function if the feature has side effects

### Constraints

- No raw hex colors — use MUI palette tokens only.
- Icons from `lucide-react` only.
- Side effects (emails, scoring, counters, history writes) in Cloud Functions, not in the frontend.
- No `any` — `pnpm check-types` must pass.
- No Firebase imports outside the designated files.
