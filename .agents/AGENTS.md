# AGENTS.md — ATS HRMS

This file instructs AI coding agents (Claude, Copilot, Cursor, etc.) on the architectural constraints of this project. Read this before making any change. These rules are not suggestions — they exist to keep the codebase migratable to an on-premises PostgreSQL backend without a rewrite.

---

## Critical constraint: the repository pattern

**The single most important rule in this codebase:**

Firebase is never imported outside of two locations:

1. `apps/web/src/repositories/firebase/` — one file per Firestore collection
2. `apps/web/src/shared/lib/firebase.ts` — Firebase SDK initialization only

This means:

- Never write `import { getDocs, setDoc, onSnapshot, ... } from 'firebase/firestore'` in a component, hook, service, or page.
- Never write `import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'` outside of `src/repositories/firebase/`.
- Never write `import { signInWithEmailAndPassword, ... } from 'firebase/auth'` outside of `src/shared/lib/auth.ts`.

If you are about to write a Firebase import in a new location, stop. Create or extend a repository instead.

### The four-layer data flow

```
Component / Page
    ↓  calls
Service  (src/features/*/service.ts)
    ↓  calls
Repository interface  (src/repositories/interfaces/*.ts)
    ↓  implemented by
Firebase Repository  (src/repositories/firebase/*.ts)  ← only Firebase here
```

Data flows down. Firebase is only at the bottom. When migrating to PostgreSQL, only the Firebase Repository layer changes.

---

## Before making any change, check these things

### Adding a new feature that reads or writes data

1. Does a repository interface already exist for this entity? Check `src/repositories/interfaces/`.
2. If yes, add the method signature to the interface and implement it in the Firebase repository.
3. If no, create both files before writing any component or service code.
4. Write the service method that the component will call.
5. Only then write the component.

Do not shortcut this. A component that imports Firebase directly will require manual cleanup before the migration.

### Adding a new Firestore collection

1. Define the TypeScript type in `packages/shared-types/src/models/`.
2. Create `src/repositories/interfaces/{name}.repository.ts` with the full interface.
3. Create `src/repositories/firebase/{name}.firebase.ts` implementing the interface.
4. Export an instance from `src/repositories/index.ts`.
5. Do not create the collection in Firestore manually — it is created automatically on first write.

### Adding a side effect (email, score calculation, counter update, PDF generation)

All side effects go in Cloud Functions, not in the frontend. The pattern:

- Frontend writes to Firestore.
- Cloud Function triggers on that write.
- Cloud Function performs the side effect.

Never call an email API, OpenAI, or Google Calendar from a Next.js component or Server Action. Those calls belong in `apps/functions/src/`.

### Modifying the state machine

The application stage state machine is defined in `packages/shared-types/src/models/application.ts`. When adding, removing, or renaming a stage:

1. Update the `RecruiterStage` and `CandidateStage` union types.
2. Update the `STAGE_TO_CANDIDATE_STAGE` mapping object.
3. Update the Cloud Function trigger in `apps/functions/src/triggers/on-stage-changed.ts`.
4. Update email templates if the new stage requires a notification.
5. Do not update the stage in multiple places without updating all of them — the types will tell you if you missed one.

---

## File locations — where things live

| What                                   | Where                                                  |
| -------------------------------------- | ------------------------------------------------------ |
| Shared TypeScript types and interfaces | `packages/shared-types/src/`                           |
| Repository interfaces                  | `apps/web/src/repositories/interfaces/`                |
| Firebase repository implementations    | `apps/web/src/repositories/firebase/`                  |
| Repository instantiation and export    | `apps/web/src/repositories/index.ts`                   |
| Business logic / services              | `apps/web/src/features/{feature}/{feature}.service.ts` |
| React components                       | `apps/web/src/features/{feature}/components/`          |
| Shared UI components                   | `apps/web/src/shared/components/`                      |
| Firebase SDK init                      | `apps/web/src/shared/lib/firebase.ts`                  |
| Cloud Function triggers                | `apps/functions/src/triggers/`                         |
| Cloud Function business logic          | `apps/functions/src/services/`                         |
| AI parsing logic                       | `apps/functions/src/ai/`                               |
| Migration scripts                      | `scripts/migrations/`                                  |

If a file does not fit these locations, discuss before creating a new top-level folder.

---

## Patterns to follow

### Querying data in a component

```typescript
// CORRECT
const { data: jobs } = useQuery({
  queryKey: ['jobs', 'open'],
  queryFn: () => jobsService.getOpenJobs(),
});

// WRONG — Firebase in component
const { data: jobs } = useQuery({
  queryKey: ['jobs', 'open'],
  queryFn: async () => {
    const snap = await getDocs(
      query(collection(db, 'jobs'), where('status', '==', 'open')),
    );
    return snap.docs.map((d) => d.data());
  },
});
```

### Mutating data

```typescript
// CORRECT
const mutation = useMutation({
  mutationFn: (data: UpdateApplicationDto) =>
    applicationsService.updateStage(id, data),
});

// WRONG
const mutation = useMutation({
  mutationFn: (data: UpdateApplicationDto) =>
    updateDoc(doc(db, 'applications', id), data), // Firebase in component
});
```

### Realtime subscription

```typescript
// CORRECT — use the repository method
useEffect(() => {
  const unsubscribe = applicationsService.subscribeToPipeline(
    jobId,
    setApplications,
  );
  return unsubscribe;
}, [jobId]);

// WRONG — Firebase in component
useEffect(() => {
  const q = query(collection(db, 'applications'), where('jobId', '==', jobId));
  return onSnapshot(q, (snap) =>
    setApplications(snap.docs.map((d) => d.data())),
  );
}, [jobId]);
```

### Repository method implementation

```typescript
// CORRECT — business logic stays out of repositories
class FirebaseApplicationsRepository implements ApplicationsRepository {
  async findByJob(jobId: string): Promise<Application[]> {
    const q = query(
      this.col,
      where('jobId', '==', jobId),
      orderBy('fitScore', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application);
  }
}

// WRONG — business logic inside repository
class FirebaseApplicationsRepository implements ApplicationsRepository {
  async findByJob(jobId: string): Promise<Application[]> {
    const snap = await getDocs(query(this.col, where('jobId', '==', jobId)));
    const apps = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Application,
    );
    return apps.filter((a) => a.fitScore > 50); // business logic does not belong here
  }
}
```

---

## Anti-patterns — never do these

### 1. Firebase import outside the repository layer

```typescript
// ANY FILE outside src/repositories/firebase/ and src/shared/lib/
import { collection, getDocs } from 'firebase/firestore'; // NEVER
```

### 2. Sending emails or calling OpenAI from the frontend

```typescript
// Server Action or component
const result = await openai.chat.completions.create(...)  // NEVER — belongs in Cloud Functions
await sendEmail(candidate.email, ...)  // NEVER — belongs in Cloud Functions
```

### 3. Updating dependent data from the frontend

```typescript
// After updating an application stage, do NOT also update the candidate doc, the job counter, etc.
// Write the stage change to Firestore and let Cloud Functions handle the cascade.
await applicationsRepository.updateStage(id, stage);
// That's it. The function handles the rest.
```

### 4. Storing derived data in the frontend

```typescript
// Do NOT compute fitScore, skillsMatched, or stage mappings in the frontend.
// These are computed by Cloud Functions and stored in Firestore.
// The frontend only reads and displays them.
```

### 5. Using Firebase types in interfaces or services

```typescript
// Repository interface — WRONG
export interface JobsRepository {
  findAll(): Promise<QuerySnapshot>; // Firebase type leaking out
}

// Repository interface — CORRECT
export interface JobsRepository {
  findAll(): Promise<Job[]>; // domain type only
}
```

---

## TypeScript rules

- Strict mode is enabled. No `any`. No `@ts-ignore` without a comment explaining why.
- All repository interface methods must have explicit return types.
- All service functions must have explicit parameter and return types.
- Use types from `@ats/shared-types` for domain objects — do not redefine them locally.
- Prefer `type` over `interface` for union types and mapped types. Use `interface` for object shapes that will be implemented or extended.

---

## When in doubt

If you are unsure whether a pattern is correct, ask yourself:

> "If I replaced every `apps/web/src/repositories/firebase/*.ts` file with a PostgreSQL implementation, would this code still work without changes?"

If the answer is yes, the pattern is correct. If the answer is no, restructure before proceeding.

---

## Design system constraints

Every UI change must comply with the ATS design system. These are hard rules, not guidelines. The Figma mockups are the source of truth — match them exactly.

### Colors — use only these, never raw hex in JSX

```
Primary actions:   bg-blue-600, hover:bg-blue-700, text-blue-600
Page backgrounds:  bg-gradient-to-br from-slate-50 to-blue-50
Card backgrounds:  bg-white
Input backgrounds: bg-slate-50
Body text:         text-slate-700
Secondary text:    text-slate-600
Hints/placeholders:text-slate-500
Borders:           border-slate-200
Error states:      border-red-300 bg-red-50 text-red-700
Success states:    bg-green-100 text-green-700
Info states:       bg-blue-50 text-blue-700
```

If a color is not in this list, do not use it. Open a discussion first.

### Components — use established patterns, do not invent new ones

```tsx
/* Primary button — always this exact className */
className="px-8 py-3 rounded-lg bg-blue-600 text-white
           hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"

/* Secondary button */
className="px-6 py-3 rounded-lg border-2 border-slate-200 text-slate-700
           hover:bg-slate-50 transition-colors"

/* Input — normal */
className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-slate-50
           focus:border-blue-500 focus:ring-2 focus:ring-blue-200
           outline-none transition-colors"

/* Input — error */
className="w-full px-4 py-3 rounded-lg border-2 border-red-300 bg-red-50
           focus:border-red-500 focus:ring-2 focus:ring-red-200
           outline-none transition-colors"

/* Main card */
className="bg-white rounded-2xl shadow-xl overflow-hidden"

/* Card header */
className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6"
```

### Spacing — never guess, use the scale

```
Card padding:      p-8
Section gaps:      space-y-6 (within), space-y-12 (between sections)
Grid gaps:         gap-6 (standard), gap-3 (tight)
Page container:    max-w-4xl mx-auto
```

### Border radius — semantic, not decorative

```
rounded-lg   → buttons, inputs
rounded-xl   → section containers
rounded-2xl  → main cards
rounded-full → badges, icon circles only
```

### Icons — lucide-react only, standard sizes

```
w-4 h-4  → inline with text
w-5 h-5  → buttons, alerts
w-8 h-8  → section headers
w-10 h-10 → large card icons
```

### What breaks visual consistency — never do these

- Hardcoding a hex color (`#1a2b3c`) anywhere in JSX or CSS
- Using a Tailwind color outside the palette (`bg-purple-500`, `text-orange-600`, etc.)
- Using a border-radius not in the scale above
- Importing an icon library other than lucide-react
- Adding `font-bold` or `font-semibold` — the system only uses `font-normal` (400) and `font-medium` (500)
- Adding drop shadows other than `shadow-lg` and `shadow-xl`
- Creating a new page layout pattern instead of using the established centered or scrollable patterns

---

## Testing

### Stack

| Scope                 | Tool                     | Environment |
| --------------------- | ------------------------ | ----------- |
| `apps/functions`      | Vitest                   | `node`      |
| `apps/web` services   | Vitest                   | `jsdom`     |
| `apps/web` components | Vitest + Testing Library | `jsdom`     |

Run all tests from the monorepo root:

```bash
pnpm test          # single run, Turborepo cache applies
pnpm test:watch    # watch mode across all packages
```

A second consecutive `pnpm test` with no code changes must respond with **FULL TURBO**. If it does not, the `inputs` list in `turbo.json` is missing a file pattern.

---

### Folder structure

Every test file lives inside a `__tests__/` folder co-located with the code it covers. The tree below reflects the current repository state and the target pattern as features are added.

```
ats-tema/
├── turbo.json                              # "test" task: dependsOn ^build, cache enabled
├── package.json                            # "test": "turbo run test", "test:watch": "turbo run test -- --watch"
│
├── apps/
│   ├── web/                                # Next.js App Router — no src/ in this project
│   │   ├── app/
│   │   │   ├── features/
│   │   │   │   ├── __tests__/              # ← exists today (sample test lives here)
│   │   │   │   │   └── sample.service.test.ts
│   │   │   │   └── {feature}/              # e.g. jobs/, candidates/, applications/
│   │   │   │       ├── {feature}.service.ts
│   │   │   │       ├── components/
│   │   │   │       │   └── {Component}.tsx
│   │   │   │       └── __tests__/          # tests travel with the feature
│   │   │   │           ├── {feature}.service.test.ts
│   │   │   │           └── {Component}.test.tsx       # only if the component has logic
│   │   │   ├── repositories/               # created when first feature needs data access
│   │   │   │   ├── interfaces/             # never tested directly — only mocked in service tests
│   │   │   │   ├── firebase/               # never tested — integration layer out of scope
│   │   │   │   └── index.ts
│   │   │   └── shared/
│   │   │       └── lib/
│   │   │           └── firebase.ts         # never imported in tests
│   │   ├── vitest.config.ts                # environment: jsdom, include: app/**/__tests__/**/*.test.{ts,tsx}
│   │   └── package.json                    # "test": "vitest run"
│   │
│   └── functions/
│       ├── src/
│       │   ├── index.ts
│       │   ├── ai/                         # exists, empty
│       │   ├── repositories/               # exists, empty
│       │   ├── triggers/                   # exists, empty — never tested directly
│       │   └── services/
│       │       ├── __tests__/              # ← exists today (sample test lives here)
│       │       │   └── sample.test.ts
│       │       └── {name}.service.ts       # each service gets a matching test file
│       ├── vitest.config.ts                # environment: node, include: src/**/__tests__/**/*.test.ts
│       └── package.json                    # "test": "vitest run"
│
└── packages/
    └── shared-types/
        └── src/
            └── index.ts                    # domain types exported here — no tests needed
```

**Three rules enforced by this layout:**

1. `apps/web/app/` — never `apps/web/src/`. This project uses Next.js App Router without a `src/` directory.
2. Tests travel with their feature. When you add `app/features/jobs/jobs.service.ts`, its test goes in `app/features/jobs/__tests__/jobs.service.test.ts` — not in a shared top-level `__tests__/` folder.
3. `repositories/firebase/` and `shared/lib/firebase.ts` have no test files and never appear in import statements inside `__tests__/`.

---

### The single most important testing rule

**Never import Firebase in a test.** Tests exercise services and pure logic. Firebase is an implementation detail hidden behind the repository interface. The same architectural rule that governs production code applies here.

```typescript
// CORRECT — inject a mocked interface, test only the service logic
const mockRepo: JobsRepository = {
  findAll: vi.fn().mockResolvedValue([...]),
}
const service = new JobsService(mockRepo)
const jobs = await service.getOpenJobs()

// WRONG — Firebase leaking into tests
import { collection, getDocs } from 'firebase/firestore'
const snap = await getDocs(collection(db, 'jobs'))
```

---

### Testing the Repository Pattern

Services receive their repository dependency through the constructor. Tests exploit this by passing a mock that implements the same interface — no Firebase, no network, no side effects.

#### Full example — `apps/web/app/features/__tests__/sample.service.test.ts`

This is the scaffolded sample. It defines the repository interface and service class inline so the test runs without any production files needing to exist first. When you add a real feature, extract the interface and class into their own files and update the imports accordingly.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from '@ats/shared-types';

interface JobsRepository {
  findAll(): Promise<Job[]>;
  findById(id: string): Promise<Job | null>;
  create(data: Omit<Job, 'id'>): Promise<Job>;
  update(id: string, data: Partial<Job>): Promise<Job>;
}

class JobsService {
  constructor(private readonly repo: JobsRepository) {}

  async getOpenJobs(): Promise<Job[]> {
    const jobs = await this.repo.findAll();
    return jobs.filter((j) => j.status === 'open');
  }

  async getJobById(id: string): Promise<Job> {
    const job = await this.repo.findById(id);
    if (!job) throw new Error(`Job ${id} not found`);
    return job;
  }
}

describe('JobsService', () => {
  const mockRepo: JobsRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns only open jobs', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([
      { id: '1', title: 'Frontend Developer', status: 'open' } as Job,
      { id: '2', title: 'Backend Developer', status: 'closed' } as Job,
    ]);

    const service = new JobsService(mockRepo);
    const openJobs = await service.getOpenJobs();

    expect(openJobs).toHaveLength(1);
    expect(openJobs[0].title).toBe('Frontend Developer');
  });

  it('throws when job is not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    const service = new JobsService(mockRepo);

    await expect(service.getJobById('missing-id')).rejects.toThrow(
      'Job missing-id not found',
    );
  });
});
```

Once `app/features/jobs/jobs.service.ts` and `app/repositories/interfaces/jobs.repository.ts` exist, the test for that feature imports from those files instead of defining them inline:

```typescript
// app/features/jobs/__tests__/jobs.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobsService } from '../jobs.service';
import type { JobsRepository } from '../../repositories/interfaces/jobs.repository';
import type { Job } from '@ats/shared-types';
```

#### Full example — `apps/functions/src/services/__tests__/sample.test.ts`

This is the scaffolded sample. It defines the repository interface and service factory inline so the test runs without any production files needing to exist first. When you add a real service, extract these into their own files and update the imports.

```typescript
import { describe, it, expect, vi } from 'vitest';

interface CandidateRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

function createCandidateService(repo: CandidateRepository) {
  return {
    async getCandidate(id: string) {
      const candidate = await repo.findById(id);
      if (!candidate) throw new Error(`Candidate ${id} not found`);
      return candidate;
    },
  };
}

describe('CandidateService', () => {
  it('returns candidate when repository resolves one', async () => {
    const mockRepo: CandidateRepository = {
      findById: vi.fn().mockResolvedValue({ id: '1', name: 'Ana' }),
    };
    const service = createCandidateService(mockRepo);
    const result = await service.getCandidate('1');
    expect(result).toEqual({ id: '1', name: 'Ana' });
  });

  it('throws when repository returns null', async () => {
    const mockRepo: CandidateRepository = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const service = createCandidateService(mockRepo);
    await expect(service.getCandidate('99')).rejects.toThrow(
      'Candidate 99 not found',
    );
  });
});
```

Once `src/services/candidate.service.ts` exists, import from it instead of defining the factory inline:

```typescript
// src/services/__tests__/candidate.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CandidateService } from '../candidate.service';
import type { CandidateRepository } from '../interfaces/candidate.repository';
```

---

### How to mock a repository

Define the mock inline inside the `describe` block. Never create a shared `__mocks__` folder for repositories — inline mocks keep each test file self-contained and readable without jumping files.

```typescript
// Reset mocks between tests to avoid cross-test contamination
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetAllMocks();
});
```

Override the return value per test with `vi.mocked()`:

```typescript
vi.mocked(mockRepo.findAll).mockResolvedValue([...])      // resolved value
vi.mocked(mockRepo.save).mockRejectedValue(new Error('DB error'))  // simulated failure
vi.mocked(mockRepo.findById).mockResolvedValueOnce(null)  // only for the next call
```

---

### Component test pattern

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { JobForm } from '../JobForm';

describe('JobForm', () => {
  it('disables submit button when title is empty', () => {
    render(<JobForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});
```

Do not wrap renders in a custom provider unless the component explicitly requires context (e.g., React Query, auth). If it does, create a minimal `renderWithProviders` helper local to that feature's `__tests__/` folder — do not add it to a shared utility.

---

### Naming conventions

- Test files mirror the source file name: `jobs.service.ts` → `jobs.service.test.ts`, `JobForm.tsx` → `JobForm.test.tsx`.
- One `describe` block per file, named after the class or function under test.
- Each `it` sentence reads as a full statement: `it('returns only open jobs')`, `it('throws when candidate does not exist')`.
- Order: happy path first, edge cases and error branches after.

---

### What not to test

- Firebase repository implementations (`app/repositories/firebase/`) — they couple to the SDK and belong in integration tests out of scope for this stack.
- Presentational components with no logic (static cards, icon wrappers, layout shells).
- Type definitions and constants — TypeScript validates them at compile time.
- Third-party library behaviour (React Query, Zod, Firebase SDK) — trust each library's own test suite.
