# ATS HRMS — Project Context

Use this document to continue design and development. Read fully before making any change.

---

## What this is

A web-based Applicant Tracking System (ATS) for a single company. ~50 HR users, ~500 candidates/month. Covers the full recruitment lifecycle: job posting → candidate registration → CV parsing + AI scoring → pipeline management → interviews → offer → employee conversion.

**Stack:** Next.js 15 (App Router) · Firebase (Auth, Firestore, Storage, Cloud Functions) · TanStack Query · Tailwind CSS · TypeScript strict · pnpm workspaces · Turborepo · OpenAI GPT-4o-mini · lucide-react icons.

**Deployment:** Firebase Hosting + Cloud Functions. On-premises migration (NestJS + any DB) is planned — the repository pattern (see below) makes this possible without a rewrite.

---

## Monorepo structure

```
apps/web/src/
  app/
    (public)/          SSG — job board, no auth
    (hr)/              SSR — recruiter dashboard, auth required
    (candidate)/       CSR — candidate portal
  features/            Co-located by feature (jobs/, candidates/, pipeline/, interviews/, offers/)
    {feature}/
      components/
      hooks/
      {feature}.service.ts   ← business logic, calls repositories only
  repositories/
    interfaces/        TypeScript interfaces — never import Firebase here
    firebase/          Firebase implementations — ONLY place Firebase is imported
    index.ts           Exports active instances (swap here to migrate)
  shared/
    components/        Used by 2+ features
    lib/
      firebase.ts      SDK init only
      auth.ts          Auth helpers only
packages/shared-types/ DTOs and interfaces shared between web and functions
apps/functions/src/
  triggers/            Thin Cloud Function handlers
  services/            Business logic for functions
  ai/                  CV parsing, scoring, matching
```

---

## The repository pattern — non-negotiable

**Rule:** Firebase is never imported outside `apps/web/src/repositories/firebase/` and `apps/web/src/shared/lib/firebase.ts`. Nowhere else — not in components, hooks, services, or pages.

**Why:** When migrating to another DB (PostgreSQL, MongoDB, etc.), only the `firebase/` implementations change. Every layer above is identical.

**The four layers (data flows down):**

```
Component / Page
    ↓
Service  → apps/web/src/features/{f}/{f}.service.ts
    ↓
Repository interface  → apps/web/src/repositories/interfaces/
    ↓
Firebase implementation  → apps/web/src/repositories/firebase/  ← Firebase only here
```

**Pattern in code:**

```typescript
// interfaces/jobs.repository.ts — never changes, not even during migration
export interface JobsRepository {
  findAll(): Promise<Job[]>;
  findById(id: string): Promise<Job | null>;
  findByStatus(status: Job['status']): Promise<Job[]>;
  create(data: CreateJobDto): Promise<Job>;
  update(id: string, data: UpdateJobDto): Promise<Job>;
  archive(id: string): Promise<void>;
}

// repositories/index.ts — the only file touched to migrate
export const jobsRepository = new FirebaseJobsRepository();
// swap to: new PostgresJobsRepository() or new MongoJobsRepository()

// features/jobs/jobs.service.ts — identical regardless of backend
import { jobsRepository } from '@/repositories';
export const jobsService = {
  getOpenJobs: () => jobsRepository.findByStatus('open'),
};

// Component — never knows where data comes from
const { data } = useQuery({
  queryKey: ['jobs'],
  queryFn: jobsService.getOpenJobs,
});
```

**Realtime subscriptions** — use a dedicated pattern that returns an unsubscribe function:

```typescript
// In interface
subscribeToJobPipeline(jobId: string, cb: (apps: Application[]) => void): () => void

// In component
useEffect(() => {
  return applicationsService.subscribeToPipeline(jobId, setApplications)
}, [jobId])
```

**Anti-patterns — never do these:**

- `import { getDocs, setDoc } from 'firebase/firestore'` outside the repository layer
- Firebase calls in Server Actions, components, or hooks
- Business logic (validation, score calculation) inside repository methods
- Firebase types (`DocumentSnapshot`) outside the repository layer
- Sending emails, calling OpenAI, or updating counters from the frontend — all side effects go in Cloud Functions

---

## Firestore schema

```
/jobs/{id}
  title, department, seniority, status (open|closed|draft|archived)
  description, observations
  skills: [{ name, weight, type: mandatory|desirable }]
  candidateCount: number   ← Cloud Function maintains this, never client
  createdAt, updatedAt

/candidates/{id}
  fullName, email, phone
  cvStoragePath            ← relative path in Firebase Storage
  parsedData: ParsedCV     ← populated by onCVUploaded function
  cvParseStatus: pending|processing|done|failed|not_required
  registrationType: specific|general
  createdAt

/applications/{id}
  candidateId, jobId
  stage: RecruiterStage    ← 10 internal states
  stageCandidate: CandidateStage  ← 6 visible states, derived from stage
  fitScore, fitPercent
  skillsMatched[], skillsGap[]
  discardReason?
  createdAt, updatedAt

/scorecards/{id}
  applicationId, interviewerId
  interviewerRole: hr|tech
  scores: Record<skillName, 1-5>
  technicalLevel?, communication?, teamwork?, salaryExpectation?
  recommendation: avanza|no_avanza|avanza_con_reservas
  comments?, createdAt

/emailTemplates/{id}
  stage, subject, body     ← supports {{candidateName}}, {{jobTitle}} tags
  createdAt, updatedAt

/employees/{id}
  ← migrated from candidate + application on hire
  jobId, hiredAt, onboardingStatus: pending|in_progress|complete
```

**Stage machine — recruiter (10 states):**

```
postulacion_recibida → en_revision → cv_presentado_area
  → entrevista1_agendada → entrevista1_evaluacion
  → entrevista2_agendada → entrevista2_evaluacion
  → oferta_enviada → contratado
  → descartado (from any stage, requires discardReason)
```

**Stage mapping to candidate-visible states (6):**

```
postulacion_recibida                              → Postulación recibida
en_revision, cv_presentado_area                   → En proceso de revisión
entrevista1_agendada…entrevista2_evaluacion       → En proceso de entrevistas
oferta_enviada                                    → Oferta en curso
contratado                                        → Proceso finalizado — incorporado
descartado                                        → Proceso finalizado — no continuamos
```

---

## Cloud Functions — the 5 core triggers

All side effects live here. Frontend only writes to Firestore; functions react.

| Function               | Trigger                                         | Does                                                         |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `onCVUploaded`         | Storage `onObjectCreated` at `cvs/**`           | PDF → OpenAI → writes `parsedData` + `fitScore` to candidate |
| `onStageChanged`       | Firestore `onDocumentUpdated` on `applications` | Sends email via template for new stage                       |
| `onInterviewScheduled` | stage = `entrevista1_agendada`                  | Google Calendar event + Meet link + invite email             |
| `onOfferSent`          | stage = `oferta_enviada`                        | PDF offer from template → Storage → link to candidate        |
| `onHired`              | stage = `contratado`                            | Copies candidate + application to `employees`, closes job    |

Functions are thin triggers — business logic goes in `apps/functions/src/services/`, not inline.

---

## User stories (15 HUs)

| ID   | Title                                                                                        | Sprint |
| ---- | -------------------------------------------------------------------------------------------- | ------ |
| HU0  | Public job board — list open positions                                                       | 1      |
| HU1  | Candidate registration — specific position (manual or CV upload)                             | 2      |
| HU2  | Candidate registration — general (no specific position)                                      | 2      |
| HU3  | Automatic CV processing: PDF parse → skill extraction → fit score + position recommendations | 3      |
| HU4  | Recruiter view: candidates by position with ranking and match score                          | 3      |
| HU5  | Skill detection, matching against JD, score/ranking with adjustable weights                  | 3      |
| HU6  | Create and configure Job Description (JD): skills with weights, seniority, criteria          | 1      |
| HU7  | Pipeline management: table view with name, fit%, score, status, detail button                | 4      |
| HU8  | Candidate detail: extracted data, match %, skills gap, CV viewer, stage change               | 4      |
| HU9  | Automated email by stage using templates                                                     | 5      |
| HU10 | Interview scheduling: Google Calendar + Meet link integration                                | 5      |
| HU11 | Post-interview scorecard for interviewers (HR and tech roles)                                | 5      |
| HU12 | Offer letter generation (PDF from template) + digital signature link                         | 6      |
| HU13 | Candidate → Employee conversion, onboarding init                                             | 6      |
| HU14 | Email template management (create/edit/delete per stage)                                     | 1      |
| HU15 | Job detail: public description, internal config, candidates list, archive/edit               | 4      |

**Sprint schedule (6 weeks, 3 people, fullstack strong in back):**

```
Sprint 1: Setup Firebase + Auth, firebase.json + rules + indexes committed to repo, HU14, HU0, HU6
Sprint 2: HU1, HU2, Cloud Functions setup
Sprint 3: HU3, HU4, HU5  ← highest risk — AI spike recommended before committing
Sprint 4: HU7, HU8, HU15
Sprint 5: HU9, HU10, HU11
Sprint 6: HU12, HU13, QA, deploy
```

---

## Design system

Apply to every screen. Match the Figma mockups exactly. Never introduce colors, spacing, or components not listed here.

### Colors (Tailwind classes only — no raw hex in JSX)

```
Primary actions:    bg-blue-600  hover:bg-blue-700  text-blue-600
Page background:    bg-gradient-to-br from-slate-50 to-blue-50
Card background:    bg-white
Input background:   bg-slate-50
Borders:            border-slate-200
Body text:          text-slate-700
Secondary text:     text-slate-600
Hints/placeholders: text-slate-500
Titles:             text-slate-900
Error:              border-red-300  bg-red-50  text-red-700  text-red-800
Success:            bg-green-100  text-green-700
Info:               bg-blue-50  text-blue-700
```

### Typography

```
h1: text-3xl font-medium text-slate-900
h2: text-2xl font-medium text-slate-900
h3: text-xl  font-medium text-slate-900
h4: text-lg  font-medium text-slate-900
body:   text-base font-normal text-slate-700
small:  text-sm   font-normal text-slate-600
xs:     text-xs   font-normal text-slate-500
label:  text-base font-medium text-slate-700
button: text-base font-medium
```

Only weights: `font-normal` (400) and `font-medium` (500). Never `font-bold` or `font-semibold`.

### Component classNames (copy exactly)

```tsx
// Primary button
'px-8 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl';

// Secondary button
'px-6 py-3 rounded-lg border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors';

// Input — normal
'w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors';

// Input — error
'w-full px-4 py-3 rounded-lg border-2 border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-colors';

// Main card
'bg-white rounded-2xl shadow-xl overflow-hidden';

// Card header
'bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6';

// Info card
'bg-blue-50 rounded-xl p-6 border border-blue-100';

// Success badge
'px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs';

// Info badge
'px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm';

// Large icon container
'w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center'; // icon: w-8 h-8 text-white

// Medium icon container
'w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center'; // icon: w-5 h-5 text-blue-600
```

### Layout

```tsx
// Full-page centered (forms, onboarding)
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
  <div className="w-full max-w-4xl">…</div>
</div>

// Scrollable page (lists, dashboards)
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
  <div className="max-w-4xl mx-auto">…</div>
</div>

// Section header
<div className="text-center mb-12">
  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
    <Icon className="w-8 h-8 text-white" />
  </div>
  <h1 className="text-3xl mb-2 text-slate-900">Title</h1>
  <p className="text-slate-600">Subtitle</p>
</div>
```

### Spacing scale

```
Card padding:        p-8
Section spacing:     space-y-6 (within), space-y-12 (between)
Grid gap:            gap-6 (standard), gap-3 (tight)
2-col grid:          grid md:grid-cols-2 gap-6
Page container:      max-w-4xl mx-auto
```

### Border radius

```
rounded-lg   → buttons, inputs
rounded-xl   → section containers
rounded-2xl  → main cards
rounded-full → badges, icon circles only
```

### Shadows

```
shadow-lg   → cards (default)
shadow-xl   → cards on hover
```

### Icons — lucide-react only

```tsx
import { User, Mail, Phone, MapPin, Briefcase, GraduationCap, FileText, Upload,
         CheckCircle2, AlertCircle, X, ChevronRight, Search, Filter,
         Download, Edit, Trash, MoreVertical } from 'lucide-react'

w-4 h-4   inline with text
w-5 h-5   buttons, alerts
w-8 h-8   section headers
w-10 h-10 large card icons
```

### What breaks consistency — never do these

- Raw hex color anywhere in JSX
- Tailwind color outside the palette (`purple`, `orange`, `yellow`, etc.)
- `font-bold` or `font-semibold`
- Any icon library other than lucide-react
- Drop shadows other than `shadow-lg` / `shadow-xl`
- New page layout patterns outside the two above

---

## Frontend conventions

**Rendering by section:**

- `(public)/` → SSG, `revalidate: 60`
- `(hr)/` → SSR, auth-protected
- pipeline pages → Client Components with realtime subscription
- forms → Client Components with Server Actions for mutations

**Data fetching:**

```typescript
// Read — TanStack Query, always via service
const { data } = useQuery({
  queryKey: ['jobs', id],
  queryFn: () => jobsService.getJobById(id),
});

// Write — useMutation via service
const mutation = useMutation({
  mutationFn: (stage) => applicationsService.updateStage(appId, stage),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] }),
});

// Server Component
const jobs = await jobsService.getOpenJobs();
```

**State management:** TanStack Query for server state. `useState`/`useReducer` for local UI state. No Redux.

---

## Infrastructure as Code (IaC) & deployment

### Philosophy: split strategy

Firebase config is **never done exclusively in the web console**. The console is only used for the one-time initial project creation. Everything else is code-controlled and committed to the repo.

| Layer                     | Tool                           | Scope          |
| ------------------------- | ------------------------------ | -------------- |
| Project provisioning      | Console                        | One time only  |
| Firestore rules + indexes | Firebase CLI                   | Every deploy   |
| Storage rules             | Firebase CLI                   | Every deploy   |
| Cloud Functions           | Firebase CLI                   | Every deploy   |
| Hosting                   | Firebase CLI                   | Every deploy   |
| Auth providers            | Firebase CLI (`firebase.json`) | Config-as-code |

---

### Layer 1 — Firebase CLI (mandatory, primary IaC tool)

The Firebase CLI is the main IaC tool for this project. All configuration lives as files in the monorepo root and deploys with a single command. The CLI is the single source of truth — deploying via CLI **overwrites** anything changed manually in the console.

**Files committed to the repo root:**

```
firebase.json           ← master config: hosting, functions, firestore, storage
firestore.rules         ← Firestore security rules (auth-gated for HR routes)
firestore.indexes.json  ← composite indexes for pipeline queries
storage.rules           ← restrict cvs/** to authenticated candidates only
.firebaserc             ← project aliases: { "default": "ats-prod", "staging": "ats-staging" }
```

**`firebase.json` structure for this project:**

```json
{
  "hosting": {
    "source": "apps/web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "frameworksBackend": { "region": "us-central1" }
  },
  "functions": {
    "source": "apps/functions",
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

**`package.json` deploy scripts (monorepo root):**

```json
{
  "scripts": {
    "deploy": "firebase deploy",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:rules": "firebase deploy --only firestore,storage",
    "deploy:hosting": "firebase deploy --only hosting",
    "deploy:staging": "firebase use staging && firebase deploy && firebase use default"
  }
}
```

**CI/CD authentication (no human login):**

```bash
# 1. Create a service account in Google Cloud Console (one-time)
# 2. Grant it Firebase Admin + Cloud Functions Admin roles
# 3. Generate a JSON key and store it as a CI secret
# 4. Set in CI environment:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
# Then run normally:
firebase deploy --only functions
```

---

### Firestore security rules — starter template

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // HR users only (authenticated with custom claim)
    match /jobs/{id} { allow read, write: if request.auth != null && request.auth.token.role == 'hr'; }
    match /applications/{id} { allow read, write: if request.auth != null && request.auth.token.role == 'hr'; }
    match /scorecards/{id} { allow read, write: if request.auth != null && request.auth.token.role == 'hr'; }
    match /emailTemplates/{id} { allow read, write: if request.auth != null && request.auth.token.role == 'hr'; }
    match /employees/{id} { allow read, write: if request.auth != null && request.auth.token.role == 'hr'; }

    // Public read for open jobs (job board — SSG)
    match /jobs/{id} { allow read: if resource.data.status == 'open'; }

    // Candidates can read/write their own record only
    match /candidates/{id} {
      allow read, write: if request.auth != null && request.auth.uid == id;
    }

    // Candidates can read their own applications (status visibility)
    match /applications/{id} {
      allow read: if request.auth != null && resource.data.candidateId == request.auth.uid;
    }
  }
}
```

---

### Storage security rules — starter template

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // CV uploads: authenticated candidates can write their own CV only
    match /cvs/{candidateId}/{fileName} {
      allow write: if request.auth != null && request.auth.uid == candidateId
                   && request.resource.size < 10 * 1024 * 1024  // 10 MB max
                   && request.resource.contentType == 'application/pdf';
      allow read: if request.auth != null &&
                  (request.auth.uid == candidateId || request.auth.token.role == 'hr');
    }

    // Offer PDFs: HR write, candidate read
    match /offers/{applicationId}/{fileName} {
      allow write: if request.auth != null && request.auth.token.role == 'hr';
      allow read: if request.auth != null;
    }
  }
}
```

---

### Firestore indexes — key composite indexes for this schema

```json
{
  "indexes": [
    {
      "collectionGroup": "applications",
      "fields": [
        { "fieldPath": "jobId", "order": "ASCENDING" },
        { "fieldPath": "stage", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "applications",
      "fields": [
        { "fieldPath": "jobId", "order": "ASCENDING" },
        { "fieldPath": "fitScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "applications",
      "fields": [
        { "fieldPath": "candidateId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scorecards",
      "fields": [
        { "fieldPath": "applicationId", "order": "ASCENDING" },
        { "fieldPath": "interviewerRole", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

### Anti-patterns — never do these

- Manual changes to rules or indexes in the Firebase console (they will be overwritten on next deploy)
- Running `firebase deploy` without `--only` in CI (always scope to what changed)
- Hardcoding Firebase config values in source code — use `.env.local` and `NEXT_PUBLIC_` prefix
- Creating Firestore indexes manually in the console — add them to `firestore.indexes.json` so they are reproducible

---

## Key decisions log

| Decision            | Choice                               | Reason                                                   |
| ------------------- | ------------------------------------ | -------------------------------------------------------- |
| Backend             | Firebase (not NestJS)                | 6-week constraint, 3-person team                         |
| Repository pattern  | Mandatory                            | Enables future DB migration without rewrite              |
| Migration target DB | Any (PostgreSQL recommended)         | Pattern is DB-agnostic                                   |
| CV parsing          | pdf-parse → OpenAI GPT-4o-mini       | ~$0.18/month at this scale                               |
| Realtime            | Firestore onSnapshot (pipeline only) | Other views use TanStack Query polling                   |
| File storage        | Firebase Storage                     | No S3/MinIO needed at this scale                         |
| Auth                | Firebase Auth                        | Zero setup cost, JWT compatible                          |
| IaC — app config    | Firebase CLI                         | Rules, indexes, functions, hosting — all code-controlled |
| IaC — provisioning  | Console                              | One-time project creation only                           |
| Icons               | lucide-react only                    | Consistency, already installed                           |
| Fonts               | System native                        | No external imports                                      |

---

## Quick reference — adding a new feature

```
1. Define/update types in packages/shared-types
2. Add method to repository interface (interfaces/)
3. Implement in Firebase repository (firebase/)
4. Write service method — business logic here, not in repository
5. Build component/page — calls service only, never repository or Firebase directly
6. Add Cloud Function if the feature has side effects (emails, scoring, counters)
```

**New collection checklist:**

- [ ] Type in `packages/shared-types/src/models/`
- [ ] Interface in `src/repositories/interfaces/`
- [ ] Firebase impl in `src/repositories/firebase/`
- [ ] Export from `src/repositories/index.ts`

**Before every PR:**

- [ ] No Firebase imports outside `repositories/firebase/` and `shared/lib/`
- [ ] New fields added to `packages/shared-types`
- [ ] Side effects in Cloud Functions, not frontend
- [ ] Colors from palette only — no raw hex
- [ ] Only lucide-react icons
- [ ] `pnpm typecheck` passes, no `any`
