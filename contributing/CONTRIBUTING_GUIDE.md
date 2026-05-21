# Contributing Guide — ATS HRMS

This document is the canonical reference for contributing to the ATS HRMS project. Read it fully before writing any code. Every architectural decision here was made deliberately; if you disagree with something, open a discussion before deviating.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Tech stack](#2-tech-stack)
3. [Repository structure](#3-repository-structure)
4. [The abstraction strategy — mandatory reading](#4-the-abstraction-strategy--mandatory-reading)
5. [Design system — mandatory reading](#5-design-system--mandatory-reading)
6. [Firestore data model](#6-firestore-data-model)
7. [Feature development workflow](#7-feature-development-workflow)
8. [Cloud Functions](#8-cloud-functions)
9. [Frontend conventions](#9-frontend-conventions)
10. [Testing](#10-testing)
11. [Code style](#11-code-style)
12. [Git workflow](#12-git-workflow)
13. [Environment setup](#13-environment-setup)

---

## 1. Project overview

ATS HRMS is an applicant tracking system built for a single company with ~50 HR users and ~500 candidates per month. The system covers the full recruitment lifecycle: job posting, candidate registration, CV parsing with AI scoring, pipeline management, interview coordination, offer generation, and conversion to employee.

The application is built with **Next.js 15** (frontend) and **Firebase** (backend services), deployed on Firebase Hosting and Cloud Functions. It is architected to be migrated to a self-hosted NestJS + DB stack in the future — the abstraction strategy in section 4 is what makes that migration viable.

---

## 2. Tech stack

| Layer           | Technology                            | Why                                       |
| --------------- | ------------------------------------- | ----------------------------------------- |
| Frontend        | Next.js 15 (App Router)               | SSG for public portal, SSR for dashboard  |
| Styling         | Tailwind CSS                          | Utility-first, consistent design tokens   |
| State           | TanStack Query                        | Server state, caching, optimistic updates |
| Backend         | Firebase Cloud Functions (Node.js 22) | Serverless, trigger-driven, zero infra    |
| Database        | Cloud Firestore                       | Flexible schema, realtime when needed     |
| Auth            | Firebase Auth                         | JWT, roles via Custom Claims              |
| Storage         | Firebase Storage                      | CV files, offer PDFs                      |
| AI              | Vertex AI (Gemini 1.5 Flash)          | CV parsing, skill extraction, scoring     |
| Types           | TypeScript (strict mode)              | Shared types between front and back       |
| Package manager | pnpm workspaces                       | Monorepo, shared packages                 |
| Monorepo        | Turborepo                             | Parallel builds, caching                  |

---

## 3. Repository structure

```
ats-tema/
├── firebase.json                        # IaC — hosting, functions, firestore, storage config
├── firestore.rules                      # IaC — security rules (HR role claim, candidate self-read)
├── firestore.indexes.json               # IaC — composite indexes for pipeline queries
├── storage.rules                        # IaC — cvs/** pdf only, 10 MB max
├── .firebaserc                          # IaC — project aliases: default / staging
├── package.json                         # deploy scripts: deploy:functions · deploy:rules · deploy:hosting
├── turbo.json
│
├── apps/
│   ├── web/                             # Next.js 15
│   │   └── src/
│   │       ├── app/                     # App Router
│   │       │   ├── (public)/            # SSG — job board, no auth
│   │       │   ├── (hr)/                # SSR — recruiter dashboard
│   │       │   └── (candidate)/         # Candidate portal
│   │       ├── features/                # Feature modules (co-located)
│   │       │   ├── jobs/
│   │       │   ├── candidates/
│   │       │   ├── pipeline/
│   │       │   ├── interviews/
│   │       │   └── offers/
│   │       ├── repositories/            # Data access layer
│   │       │   ├── interfaces/          # TS interfaces — never import Firebase here
│   │       │   ├── firebase/            # Firebase implementations
│   │       │   └── index.ts             # Exports active implementations
│   │       ├── services/                # Business logic — calls repositories, never Firebase directly
│   │       └── shared/
│   │           ├── components/          # Reusable UI components
│   │           ├── hooks/               # Custom React hooks
│   │           └── lib/                 # Firebase init, config, utilities
│   │
│   └── functions/                       # Firebase Cloud Functions Backend
│       └── src/
│           ├── callables/               # Entity HTTPS Callables (named exports, camelCase)
│           │   └── candidateCallables.ts
│           ├── triggers/                # Background event handlers (camelCase)
│           │   └── onCvUploaded.ts
│           ├── services/                # Domain core orchestration layer (camelCase)
│           │   └── candidateService.ts
│           ├── repositories/            # Database queries matching active interfaces (camelCase)
│           │   └── candidateRepository.ts
│           ├── validators/              # Payload contract validators (camelCase)
│           │   └── candidateValidator.ts
│           ├── core/                    # Global initialization (camelCase)
│           │   └── firebaseAdmin.ts
│           └── index.ts                 # Root export gateway for triggers & callables
│
└── packages/
    └── shared-types/                    # DTOs and interfaces shared between apps
        └── src/
            ├── models/                  # Job, Candidate, Application, Scorecard, etc.
            └── index.ts
```

Every feature in `apps/web/src/features/` follows the same internal structure:

```
features/pipeline/
├── components/          # React components for this feature
├── hooks/               # Feature-specific hooks
├── pipeline.service.ts  # Calls repositories — no Firebase here
└── index.ts             # Public exports
```

---

## 4. The abstraction strategy — mandatory reading

This is the single most important architectural decision in the project. **Failure to follow it will make a future migration to on-premises extremely painful.**

### The rule

> Firebase is never imported outside of `src/repositories/firebase/` and `src/shared/lib/firebase.ts`.

Nowhere else. Not in components, not in hooks, not in services, not in pages. If you find yourself writing `import { getDocs, collection } from 'firebase/firestore'` anywhere outside those two locations, stop and restructure.

### Why this matters

The Firebase SDK calls (`getDocs`, `setDoc`, `onSnapshot`, etc.) are the only things that need to change when migrating to PostgreSQL. If they are scattered across the codebase, migration means touching hundreds of files. If they are contained in repository implementations, migration means swapping one file per collection.

### How it works

Every data entity has three files:

**1. The interface** (`src/repositories/interfaces/jobs.repository.ts`)

```typescript
// This file never changes — not during development, not during migration
import type { Job, CreateJobDto, UpdateJobDto } from '@ats/shared-types';

export interface JobsRepository {
  findAll(): Promise<Job[]>;
  findById(id: string): Promise<Job | null>;
  findByStatus(status: Job['status']): Promise<Job[]>;
  create(data: CreateJobDto): Promise<Job>;
  update(id: string, data: UpdateJobDto): Promise<Job>;
  archive(id: string): Promise<void>;
}
```

**2. The Firebase implementation** (`src/repositories/firebase/jobs.firebase.ts`)

```typescript
// This is the ONLY file that touches Firebase for jobs
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/shared/lib/firebase';
import type { JobsRepository } from '../interfaces/jobs.repository';
import type { Job, CreateJobDto, UpdateJobDto } from '@ats/shared-types';

export class FirebaseJobsRepository implements JobsRepository {
  private col = collection(db, 'jobs');

  async findAll(): Promise<Job[]> {
    const snap = await getDocs(this.col);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Job);
  }

  async findById(id: string): Promise<Job | null> {
    const snap = await getDoc(doc(db, 'jobs', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Job) : null;
  }

  async findByStatus(status: Job['status']): Promise<Job[]> {
    const q = query(this.col, where('status', '==', status));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Job);
  }

  async create(data: CreateJobDto): Promise<Job> {
    const ref = await addDoc(this.col, {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return { id: ref.id, ...data } as Job;
  }

  async update(id: string, data: UpdateJobDto): Promise<Job> {
    await updateDoc(doc(db, 'jobs', id), data as Record<string, unknown>);
    return { id, ...data } as Job;
  }

  async archive(id: string): Promise<void> {
    await updateDoc(doc(db, 'jobs', id), { status: 'archived' });
  }
}
```

**3. The active export** (`src/repositories/index.ts`)

```typescript
// To migrate: swap Firebase implementations for Postgres implementations here
import { FirebaseJobsRepository } from './firebase/jobs.firebase';
import { FirebaseCandidatesRepository } from './firebase/candidates.firebase';
import { FirebaseApplicationsRepository } from './firebase/applications.firebase';

export const jobsRepository = new FirebaseJobsRepository();
export const candidatesRepository = new FirebaseCandidatesRepository();
export const applicationsRepository = new FirebaseApplicationsRepository();
```

**4. The service** (`src/features/jobs/jobs.service.ts`)

```typescript
// This file is identical whether the backend is Firebase or PostgreSQL
import { jobsRepository } from '@/repositories';
import type { Job, CreateJobDto } from '@ats/shared-types';

export const jobsService = {
  async getOpenJobs(): Promise<Job[]> {
    return jobsRepository.findByStatus('open');
  },

  async createJob(data: CreateJobDto): Promise<Job> {
    // Business logic lives here, not in the repository
    if (!data.skills || data.skills.length === 0) {
      throw new Error('A job must have at least one skill defined');
    }
    return jobsRepository.create(data);
  },
};
```

**5. The component** (`src/features/jobs/components/JobsList.tsx`)

```typescript
// Components never know where data comes from
import { jobsService } from '../jobs.service';

export function JobsList() {
  const { data: jobs } = useQuery({
    queryKey: ['jobs', 'open'],
    queryFn: () => jobsService.getOpenJobs(),
  });
  // ...
}
```

### Realtime subscriptions

`onSnapshot` is the one Firebase feature without a direct REST equivalent. Handle it through a dedicated pattern — do not mix subscriptions with regular repository methods:

```typescript
// src/repositories/interfaces/applications.repository.ts
export interface ApplicationsRepository {
  findByJob(jobId: string): Promise<Application[]>
  // Realtime is opt-in and clearly named
  subscribeToJobPipeline(
    jobId: string,
    callback: (applications: Application[]) => void
  ): () => void  // returns unsubscribe function
}

// src/repositories/firebase/applications.firebase.ts
subscribeToJobPipeline(jobId, callback) {
  const q = query(this.col, where('jobId', '==', jobId))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)))
  })
}
```

When migrating, `subscribeToJobPipeline` is replaced with a polling hook or WebSocket — the component calling it does not change.

### What breaks this pattern

These are the mistakes that force a painful migration. Do not do them:

- Calling `getDocs`, `setDoc`, `onSnapshot` directly in a component, hook, or service
- Importing `db` from `@/shared/lib/firebase` outside the repository layer
- Putting business logic (validation, transformations, score calculations) inside repository methods
- Using Firebase-specific types (`DocumentSnapshot`, `QuerySnapshot`) outside the repository layer
- Building queries in components with `where()`, `orderBy()`, `limit()`

---

## 5. Design system — mandatory reading

Every screen in the ATS must follow this design system. Pixel-perfect consistency with the Figma mockups is a requirement, not a preference. Do not invent new color values, spacing scales, or component patterns. If a UI need is not covered here, check the mockups first, then open a discussion before adding anything new.

### Design principles

1. **Clarity over complexity** — clean interfaces, clear visual hierarchy, no decorative elements
2. **Efficiency first** — reduce friction, direct flows, contextual information at the right moment
3. **Immediate feedback** — clear visual states for hover, focus, error, and success at all times
4. **Professional but human** — reliable, not intimidating; formal, but not cold
5. **Generous space** — breathing room between elements, wide padding, never saturate the interface

### Color palette

Only use these values. Never introduce a color not on this list without a design review.

```css
/* Primary — professional blue */
--primary-600: #2563eb; /* main buttons, CTAs, accents */
--primary-700: #1d4ed8; /* hover on primary buttons */
--primary-500: #3b82f6; /* lighter variants */

/* Backgrounds and surfaces */
--background-gradient: linear-gradient(to bottom right, #f8fafc, #eff6ff);
--card-bg: #ffffff;
--input-bg: #f8fafc; /* slate-50 */

/* Neutrals */
--slate-900: #0f172a; /* main titles */
--slate-700: #334155; /* body text, labels */
--slate-600: #475569; /* secondary text */
--slate-500: #64748b; /* tertiary text, placeholders */
--slate-200: #e2e8f0; /* borders */
--slate-100: #f1f5f9; /* subtle backgrounds */
--slate-50: #f8fafc; /* very light backgrounds */

/* Success */
--green-600: #16a34a;
--green-100: #dcfce7;
--green-700: #15803d;

/* Error */
--red-500: #ef4444;
--red-300: #fca5a5;
--red-50: #fef2f2;
--red-700: #b91c1c;
--red-800: #991b1b;

/* Info */
--blue-50: #eff6ff;
--blue-100: #dbeafe;
--blue-600: #2563eb;
--blue-700: #1d4ed8;
```

### Typography

```
h1  30px | font-medium | text-slate-900
h2  24px | font-medium | text-slate-900
h3  20px | font-medium | text-slate-900
h4  18px | font-medium | text-slate-900

body   16px | font-normal | text-slate-700
small  14px | font-normal | text-slate-600
xs     12px | font-normal | text-slate-500

label  16px | font-medium | text-slate-700
button 16px | font-medium
```

Use system native fonts — do not import external typefaces. Only two weights: 400 (normal) and 500 (medium).

### Components

#### Buttons

```tsx
/* Primary */
className="px-8 py-3 rounded-lg bg-blue-600 text-white
           hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"

/* Secondary */
className="px-6 py-3 rounded-lg border-2 border-slate-200 text-slate-700
           hover:bg-slate-50 transition-colors"

/* Selectable card button */
className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl
           transition-all duration-300 border-2 border-transparent
           hover:border-blue-500 cursor-pointer"
```

#### Inputs

```tsx
/* Normal state */
className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-slate-50
           focus:border-blue-500 focus:ring-2 focus:ring-blue-200
           outline-none transition-colors"

/* Error state */
className="w-full px-4 py-3 rounded-lg border-2 border-red-300 bg-red-50
           focus:border-red-500 focus:ring-2 focus:ring-red-200
           outline-none transition-colors"

/* Label with icon */
<label className="flex items-center gap-2 text-slate-700 mb-2">
  <Icon className="w-4 h-4" />
  Field name <span className="text-red-500">*</span>
</label>
```

#### Cards and containers

```tsx
/* Main card */
className = 'bg-white rounded-2xl shadow-xl overflow-hidden';

/* Card header with gradient */
className = 'bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6';

/* Informational card */
className = 'bg-blue-50 rounded-xl p-6 border border-blue-100';
```

#### Alerts and badges

```tsx
/* Error alert */
<div className="bg-red-50 border-l-4 border-red-500 px-8 py-4 rounded-r-lg">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
    <div>
      <h4 className="text-red-800 mb-1">Error title</h4>
      <p className="text-sm text-red-700">Error description</p>
    </div>
  </div>
</div>;

/* Success badge */
className = 'px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs';

/* Info badge */
className = 'px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm';

/* Neutral badge */
className = 'px-4 py-2 rounded-lg bg-slate-50 text-slate-700 text-sm';
```

#### Icon containers

```tsx
/* Large (header icons) */
<div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
  <Icon className="w-8 h-8 text-white" />
</div>

/* Medium (card icons) */
<div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
  <Icon className="w-5 h-5 text-blue-600" />
</div>
```

### Spacing and layout

```css
/* Page containers */
padding: p-6 to p-12

/* Cards */
padding: p-8

/* Section headers */
padding: px-8 py-6

/* Between sections */
margin: space-y-6 (within section), space-y-12 (between sections)

/* Grid gaps */
gap: gap-3 to gap-6

/* Border radius */
rounded-lg   8px   — buttons, inputs
rounded-xl   12px  — section containers
rounded-2xl  16px  — main cards
rounded-full 9999px — badges, icon circles
```

### Page layout patterns

```tsx
/* Full-page centered (forms, onboarding) */
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50
                flex items-center justify-center p-6">
  <div className="w-full max-w-4xl">
    {/* content */}
  </div>
</div>

/* Scrollable page (lists, dashboards) */
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
  <div className="max-w-4xl mx-auto">
    {/* content */}
  </div>
</div>

/* Section header */
<div className="text-center mb-12">
  <div className="inline-flex items-center justify-center w-16 h-16
                  rounded-full bg-blue-600 mb-4">
    <Icon className="w-8 h-8 text-white" />
  </div>
  <h1 className="text-3xl mb-2 text-slate-900">Page title</h1>
  <p className="text-slate-600">Supporting description</p>
</div>
```

### Icons

Use **lucide-react** exclusively. Do not add other icon libraries.

```tsx
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  FileText, Upload, CheckCircle2, AlertCircle, X,
  ChevronRight, Search, Filter, Download, Edit,
  Trash, MoreVertical,
} from 'lucide-react'

/* Icon sizes */
w-4 h-4   /* 16px — inline with text */
w-5 h-5   /* 20px — buttons, alerts */
w-8 h-8   /* 32px — section headers */
w-10 h-10 /* 40px — large card icons */
w-12 h-12 /* 48px — hero icons */
```

### Design checklist

Before opening a PR for any UI change, verify every item:

- [ ] Colors come exclusively from the palette above — no raw hex values in JSX
- [ ] Typography hierarchy is correct (h1–h4, text-base for body)
- [ ] Generous spacing applied (p-8 in cards, gap-6 in grids)
- [ ] All interactive elements have hover and focus states
- [ ] Error states use red palette; success states use green palette
- [ ] Layout uses the standard page patterns above
- [ ] Only lucide-react icons, correct sizes
- [ ] Required fields marked with `text-red-500` asterisk
- [ ] Error messages are descriptive, not generic ("Email is required" not "Invalid input")

---

## 6. Firestore data model

### Collections

```
/jobs/{jobId}
  title: string
  department: string
  seniority: string
  status: 'open' | 'closed' | 'draft' | 'archived'
  description: string
  observations: string
  skills: Skill[]           # [{ name, weight, type: 'mandatory' | 'desirable' }]
  candidateCount: number    # maintained by Cloud Function, not client
  createdAt: string         # ISO 8601
  updatedAt: string

/candidates/{candidateId}
  fullName: string
  email: string
  phone?: string
  cvStoragePath: string     # relative path in Firebase Storage
  parsedData: ParsedCV      # populated by Cloud Function after upload
  cvParseStatus: 'pending' | 'processing' | 'done' | 'failed' | 'not_required'
  registrationType: 'specific' | 'general'
  createdAt: string

/applications/{applicationId}
  candidateId: string
  jobId: string
  stage: RecruiterStage     # 10 internal states
  stageCandidate: CandidateStage  # 6 visible states, derived from stage
  fitScore: number          # 0–100
  fitPercent: number        # 0–100
  skillsMatched: string[]
  skillsGap: string[]
  discardReason?: string
  createdAt: string
  updatedAt: string

/scorecards/{scorecardId}
  applicationId: string
  interviewerId: string
  interviewerRole: 'hr' | 'tech'
  scores: Record<string, number>   # skill name → 1–5
  technicalLevel?: number          # 1–5, tech interviewers only
  communication?: number           # 1–5, HR only
  teamwork?: number                # 1–5, HR only
  salaryExpectation?: number       # HR only
  recommendation: 'avanza' | 'no_avanza' | 'avanza_con_reservas'
  comments?: string
  createdAt: string

/emailTemplates/{templateId}
  stage: RecruiterStage
  subject: string
  body: string              # supports {{candidateName}} and {{jobTitle}} tags
  createdAt: string
  updatedAt: string

/employees/{employeeId}
  # Migrated from candidate + applications on hire
  # All candidate fields plus:
  jobId: string
  hiredAt: string
  onboardingStatus: 'pending' | 'in_progress' | 'complete'
```

### State machine — recruiter stages

```
postulacion_recibida
  → en_revision
    → cv_presentado_area
      → entrevista1_agendada
        → entrevista1_evaluacion
          → entrevista2_agendada
            → entrevista2_evaluacion
              → oferta_enviada
                → contratado
  → descartado (from any stage, requires discardReason)
```

### Stage mapping to candidate-visible states

| Recruiter stage                                                                            | Candidate sees                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| postulacion_recibida                                                                       | Postulación recibida                                    |
| en_revision, cv_presentado_area                                                            | En proceso de revisión                                  |
| entrevista1_agendada, entrevista1_evaluacion, entrevista2_agendada, entrevista2_evaluacion | En proceso de entrevistas                               |
| oferta_enviada                                                                             | Oferta en curso                                         |
| contratado                                                                                 | Proceso finalizado — incorporado                        |
| descartado                                                                                 | Proceso finalizado — no continuamos en esta oportunidad |

---

## 7. Feature development workflow

### Before writing any code

1. Check if the feature touches an existing collection — if so, the repository interface already exists. Add methods to the interface before implementing them.
2. If a new collection is needed, create the interface first, then the Firebase implementation.
3. Never start with the UI. Start with the types in `packages/shared-types`, then the repository interface, then the service, then the component.

### Order of implementation for any feature

```
1. Define/update types in packages/shared-types
2. Define/update repository interface
3. Implement Firebase repository method
4. Implement service method (business logic)
5. Write the component/page
6. Add Cloud Function if the feature has side effects (emails, score recalculation)
```

### Adding a new field to a collection

Firestore is schemaless, so adding a field is safe. Still follow these steps:

1. Add the field to the TypeScript type in `packages/shared-types`
2. Update the repository interface if the field is queryable
3. Update the Firebase repository if needed
4. Write a one-off migration script in `scripts/migrations/` if existing documents need the field populated — do not do this inline in application code

---

## 8. Cloud Functions

Cloud Functions handle all side effects. The frontend never sends emails, never calculates scores, never updates counters — it only writes data to Firestore and lets functions react.

### The five core triggers

| Function               | Trigger                                           | Responsibility                                                                |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `onCVUploaded`         | Storage `onObjectCreated` at `cvs/**`             | Parse PDF → call OpenAI → write `parsedData` and `fitScore` to candidate doc  |
| `onStageChanged`       | Firestore `onDocumentUpdated` on `applications`   | Send email based on new stage using template from `emailTemplates`            |
| `onInterviewScheduled` | `onStageChanged` for stage `entrevista1_agendada` | Create Google Calendar event → generate Meet link → send invite email         |
| `onOfferSent`          | `onStageChanged` for stage `oferta_enviada`       | Generate offer PDF from template → upload to Storage → send link to candidate |
| `onHired`              | `onStageChanged` for stage `contratado`           | Copy candidate + application data to `employees` collection, close job        |

### Writing a Cloud Function

Functions live in `apps/functions/src/triggers/`. Keep them thin — business logic goes in `apps/functions/src/services/`:

```typescript
// triggers/on-stage-changed.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { emailService } from '../services/email.service';

export const onStageChanged = onDocumentUpdated(
  'applications/{id}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;
    if (before.stage === after.stage) return; // no stage change, ignore

    await emailService.sendForStage(
      after.candidateId,
      after.jobId,
      after.stage,
    );
  },
);
```

### Function constraints

- Functions have a 9-minute timeout — the CV parsing pipeline (PDF → OpenAI) must complete within this.
- Set memory to 512MB for functions that process PDFs.
- Always handle errors and update the document's status field so the UI can show the user what happened.
- Do not call other functions from within a function — use Firestore writes to chain work.

---

## 9. Frontend conventions

### Routing

```
app/(public)/jobs/page.tsx           → SSG, revalidate every 60s
app/(hr)/dashboard/page.tsx          → SSR, requires auth
app/(hr)/jobs/[id]/page.tsx          → SSR
app/(hr)/pipeline/[jobId]/page.tsx   → Client component (realtime)
app/(candidate)/apply/[jobId]/page.tsx → Client component (form)
```

### Data fetching

Use TanStack Query for all data fetching. Use Server Actions for mutations on server-rendered pages. Use the service layer — never the repository directly from a component.

```typescript
// In a Server Component (SSR/SSG)
const jobs = await jobsService.getOpenJobs();

// In a Client Component
const { data, isLoading } = useQuery({
  queryKey: ['jobs', jobId],
  queryFn: () => jobsService.getJobById(jobId),
});

// Mutation
const mutation = useMutation({
  mutationFn: (stage: RecruiterStage) =>
    applicationsService.updateStage(appId, stage),
  onSuccess: () =>
    queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] }),
});
```

### Component organization

Co-locate everything with the feature. A component used in only one feature lives in that feature's `components/` folder. A component used in two or more features moves to `src/shared/components/`.

---

## 10. Testing

### What to test

- Repository methods — mock Firestore, test that the correct queries are built
- Service methods — mock repositories, test business logic in isolation
- Cloud Functions — use the Firebase Emulator Suite

### Firebase Emulator for development

```bash
# Start all emulators
firebase emulators:start

# Run tests against emulators
pnpm test
```

The emulator configuration is in `firebase.json`. Never run tests against production Firebase.

### Running tests

```bash
pnpm test              # all packages
pnpm --filter ats-web test
pnpm --filter ats-functions test
```

---

## 11. Code style

- **TypeScript strict mode** — no `any`, no type assertions unless unavoidable and commented.
- **No default exports** in repositories, services, utilities, or cloud function modules — named exports only to guarantee strict type traceability. Default exports are allowed exclusively in Next.js pages and components as strictly required by the framework.
- **Async/await throughout** — no `.then()` chains or unresolved asynchronous procedures.
- **Error handling** — every async function that interacts with Firestore, Storage, or AI engines must include a robust try/catch block. Errors must be logged using the designated logger utility and re-thrown with proper context, never swallowed.
- **Self-explanatory code** — write expressive code that documents itself. Inline comments must be reserved exclusively to explain _why_ a non-obvious technical or domain decision was made, never _what_ the code does.
- **Backend Filename Normalization** — `kebab-case` is strictly discontinued for code files inside the backend app (`apps/functions`). All source code and asset files must follow `camelCase`.
- **Entity Cohesion Grouping** — Backend structures under `apps/functions` must be grouped into unified entity files (`*Callables.ts`, `*Service.ts`, `*Repository.ts`, `*Validator.ts`) instead of separating files by individual procedural actions.
- **Distributed Refactoring Policy (The Boy Scout Rule)** — The `candidate` module acts as the official architectural **Golden Path**. To protect the sprint capacity of our 6-person team, legacy procedural configurations (`jobs`, `applications`) must not be refactored in a single mass block. Developers are required to clean and restructure these components into the unifed `camelCase` entity pattern _incrementally_, right when they pick up a User Story that touches that specific domain.

### Naming conventions

| Thing                     | Convention                                                   | Example                                                           |
| :------------------------ | :----------------------------------------------------------- | :---------------------------------------------------------------- |
| **Backend Code Files**    | camelCase                                                    | `candidateCallables.ts`, `candidateService.ts`, `onCvUploaded.ts` |
| **Frontend Code Files**   | camelCase (for hooks, services, and utilities)               | `usePostulation.ts`, `postulation.service.ts`                     |
| **Interfaces**            | PascalCase (with I prefix only if needed for disambiguation) | `JobsRepository`, `Candidate`, `Application`                      |
| **Classes**               | PascalCase                                                   | `FirebaseJobsRepository`                                          |
| **Functions / methods**   | camelCase                                                    | `findByStatus`, `registerCandidateCV`                             |
| **Constants**             | SCREAMING_SNAKE for true constants                           | `MAX_CV_SIZE_MB`                                                  |
| **React components**      | PascalCase                                                   | `PipelineTable`, `CvUploadView`, `MethodCard`                     |
| **Firestore collections** | camelCase, plural                                            | `jobs`, `candidates`, `applications`                              |

---

## 12. Git workflow

### Branches

```
main          → production, protected, requires PR review
develop       → integration branch
feature/*     → feature branches, branched from develop
fix/*         → bug fixes
```

### Commit messages

Follow Conventional Commits:

```
feat(pipeline): add stage change confirmation modal
fix(cv-parser): handle PDFs with no extractable text
chore(deps): update firebase to 10.12.0
docs(contributing): add realtime subscription pattern
```

### PR checklist

Before opening a PR, verify:

- [ ] No Firebase imports outside `src/repositories/firebase/` and `src/shared/lib/firebase.ts`
- [ ] New collections have a repository interface defined
- [ ] New fields are added to `packages/shared-types`
- [ ] Cloud Functions for side effects are written and tested against the emulator
- [ ] No `console.log` left in the code (use the logger utility)
- [ ] TypeScript compiles with no errors (`pnpm typecheck`)

---

## 13. Environment setup

```bash
# Prerequisites: Node.js 22, pnpm, Firebase CLI
npm install -g pnpm firebase-tools

# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/functions/.env.example apps/functions/.env

# Start Firebase emulators (Firestore, Auth, Storage, Functions)
firebase emulators:start --only auth,firestore,storage,functions

# In a separate terminal, start Next.js dev server
pnpm turbo run dev --filter=@ats/web
```

### Required environment variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# apps/functions/.env
OPENAI_API_KEY=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

Never commit `.env.local` or `.env` — they are in `.gitignore`. If you need to add a new variable, add it to the `.env.example` file with an empty value and a comment describing what it is.
