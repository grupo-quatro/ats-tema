# Migration guide: Firebase → on-premises (NestJS + PostgreSQL)

**Status:** Not started — this document describes the future migration path  
**Estimated effort:** 2 weeks with 2 developers, assuming the repository pattern was followed throughout development  
**Prerequisite:** The application must have been built following the repository pattern described in `CONTRIBUTING.md` and `AGENTS.md`

---

## Why this migration exists

The ATS HRMS was built on Firebase to deliver a working system within a 6-week academic project timeline. Firebase eliminated infrastructure setup time and allowed the team to focus on the 15 user stories that matter to the client. That was the right decision for that constraint.

Firebase is not the right long-term home for this system. The reasons are:

**Data sovereignty.** Candidate data — CVs, personal information, employment decisions — belongs to the client, not on Google's servers. For a company that handles HR data, this is both a GDPR concern and an organizational policy concern. On-premises means the client's IT team controls backups, retention, access logs, and data residency.

**Operational independence.** A Firebase outage is outside the client's control. An on-premises server failure is recoverable by the client's own team. For an internal HR tool used daily, this control matters.

**Cost predictability.** Firebase bills per read and write operation. For a small ATS at current scale the cost is negligible, but the model is unpredictable — a developer writing an inefficient query or a Firestore listener reconnecting frequently can spike the bill without warning. A self-hosted PostgreSQL instance has a fixed cost.

**Query flexibility.** Firestore has significant query limitations — no joins, no OR queries across multiple fields, no full-text search. PostgreSQL handles all of these natively. As the client's reporting needs grow, these limitations become blockers.

**Vendor lock-in.** The client should not be dependent on a single cloud provider's proprietary API for a core business system.

---

## What the migration changes and what it does not

### What changes

| Component        | Firebase                           | After migration                 |
| ---------------- | ---------------------------------- | ------------------------------- |
| Database         | Cloud Firestore                    | PostgreSQL 16                   |
| ORM              | None (Firebase SDK)                | Drizzle ORM                     |
| Auth             | Firebase Auth                      | Keycloak (self-hosted)          |
| File storage     | Firebase Storage                   | Filesystem volume + Nginx       |
| Background jobs  | Cloud Functions (event-driven)     | BullMQ + Redis workers          |
| Deployment       | Firebase Hosting + Cloud Functions | Docker Compose on client server |
| Realtime updates | Firestore `onSnapshot`             | Polling or WebSocket (NestJS)   |

### What does not change

- The Next.js frontend application — components, pages, hooks, and services are identical
- The AI pipeline — OpenAI calls, PDF parsing, scoring logic
- The TypeScript types in `packages/shared-types`
- The repository interfaces in `src/repositories/interfaces/`
- The business logic in `src/features/*/service.ts`
- The data model structure — Firestore collections map directly to PostgreSQL tables
- **The design system** — all Tailwind classes, color palette, spacing, and component patterns defined in `CONTRIBUTING.md` section 5 remain unchanged. The migration is a backend concern only; the UI is identical before and after

This is the payoff of the repository pattern. The client's users will notice no difference. The frontend is unaware of the change.

---

## Prerequisites before starting

Before beginning the migration, confirm the following:

- [ ] The application has been built following the repository pattern (no Firebase imports outside `src/repositories/firebase/` and `src/shared/lib/`)
- [ ] All Cloud Functions are thin triggers — business logic is in `src/services/`, not inline in the trigger
- [ ] The client's server is provisioned: Linux (Ubuntu 22.04 or RHEL 8+), minimum 4 CPU cores, 8GB RAM, 100GB disk
- [ ] Docker and Docker Compose are installed on the target server
- [ ] The client's IT team has provided a domain or internal hostname and SSL certificates
- [ ] A backup of all Firestore data and Firebase Storage files has been taken
- [ ] The Firebase project will be kept active and read-only during migration for rollback capability

---

## Phase 1 — Infrastructure setup (days 1–2)

### 1.1 Create the server directory structure

On the target server:

```bash
sudo mkdir -p /srv/ats/{postgres,redis,files/cvs,files/offers,backups,logs/nginx}
sudo chown -R $USER:$USER /srv/ats
```

### 1.2 Deploy the base Docker Compose stack

Create `/srv/ats/docker-compose.yml` with PostgreSQL, Redis, and Nginx. This is the infrastructure that will host the migrated application. A reference `docker-compose.yml` for the full on-premises stack is maintained in `docs/onpremises/docker-compose.reference.yml`.

Bring up only the infrastructure services first — not the application:

```bash
cd /srv/ats
docker compose up -d postgres redis
docker compose ps  # verify both are healthy
```

### 1.3 Run the database schema migrations

The Drizzle ORM schema is defined in `apps/api/src/db/schema.ts`. Generate and run the initial migration:

```bash
pnpm --filter ats-api db:generate
pnpm --filter ats-api db:migrate
```

Verify the schema was created:

```bash
docker compose exec postgres psql -U ats_user -d ats_production -c "\dt"
```

Expected tables: `jobs`, `candidates`, `applications`, `scorecards`, `email_templates`, `employees`

---

## Phase 2 — Data migration (days 2–3)

### 2.1 Export data from Firebase

Using the Firebase Admin SDK, export all collections to JSON. A migration script is provided at `scripts/migrations/export-firebase.ts`:

```bash
# Requires a Firebase service account key
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
  pnpm ts-node scripts/migrations/export-firebase.ts

# Output: migration-export/
#   jobs.json
#   candidates.json
#   applications.json
#   scorecards.json
#   emailTemplates.json
#   employees.json
```

### 2.2 Export files from Firebase Storage

```bash
# Install gsutil if not present
pip install google-cloud-storage

# Export all files preserving directory structure
gsutil -m cp -r gs://YOUR_BUCKET/cvs /srv/ats/files/
gsutil -m cp -r gs://YOUR_BUCKET/offers /srv/ats/files/
```

### 2.3 Transform and import data

The transformation step converts Firestore document IDs and field names to PostgreSQL conventions. The import script handles this:

```bash
pnpm ts-node scripts/migrations/import-postgres.ts \
  --input ./migration-export \
  --database postgresql://ats_user:PASSWORD@localhost:5432/ats_production
```

The script processes collections in dependency order:

1. `email_templates` (no dependencies)
2. `jobs` (no dependencies)
3. `candidates` (no dependencies)
4. `applications` (depends on jobs and candidates)
5. `scorecards` (depends on applications)
6. `employees` (depends on candidates)

### 2.4 Verify data integrity

```bash
pnpm ts-node scripts/migrations/verify-migration.ts \
  --firebase-export ./migration-export \
  --database postgresql://ats_user:PASSWORD@localhost:5432/ats_production
```

This script compares document counts and spot-checks field values between the export and the PostgreSQL database. It will report any discrepancies before you go further.

Expected output:

```
✓ email_templates: 8/8 records matched
✓ jobs: 24/24 records matched
✓ candidates: 312/312 records matched
✓ applications: 298/298 records matched
✓ scorecards: 87/87 records matched
✓ employees: 14/14 records matched
Migration verification passed.
```

---

## Phase 3 — Backend implementation (days 3–6)

### 3.1 Implement PostgreSQL repositories

For each entity, create a PostgreSQL implementation of the existing repository interface. The interface does not change — only the implementation file changes.

Example — replacing `FirebaseJobsRepository` with `PostgresJobsRepository`:

```typescript
// apps/web/src/repositories/postgres/jobs.postgres.ts
import { db } from '@/shared/lib/postgres';
import { jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { JobsRepository } from '../interfaces/jobs.repository';
import type { Job, CreateJobDto, UpdateJobDto } from '@ats/shared-types';

export class PostgresJobsRepository implements JobsRepository {
  async findAll(): Promise<Job[]> {
    return db.select().from(jobs);
  }

  async findById(id: string): Promise<Job | null> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job ?? null;
  }

  async findByStatus(status: Job['status']): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.status, status));
  }

  async create(data: CreateJobDto): Promise<Job> {
    const [job] = await db.insert(jobs).values(data).returning();
    return job;
  }

  async update(id: string, data: UpdateJobDto): Promise<Job> {
    const [job] = await db
      .update(jobs)
      .set(data)
      .where(eq(jobs.id, id))
      .returning();
    return job;
  }

  async archive(id: string): Promise<void> {
    await db.update(jobs).set({ status: 'archived' }).where(eq(jobs.id, id));
  }
}
```

Notice that the method signatures are identical to the Firebase implementation. The interface enforces this.

### 3.2 Switch active repository implementations

Once all PostgreSQL repositories are implemented and tested, update `src/repositories/index.ts`:

```typescript
// Before migration
import { FirebaseJobsRepository } from './firebase/jobs.firebase';
export const jobsRepository = new FirebaseJobsRepository();

// After migration — single line change per repository
import { PostgresJobsRepository } from './postgres/jobs.postgres';
export const jobsRepository = new PostgresJobsRepository();
```

This is the switchover. Everything above this file continues to work without modification.

### 3.3 Migrate Cloud Functions to NestJS workers

Each Cloud Function becomes a NestJS event handler + BullMQ processor. The business logic code is copied directly — only the trigger mechanism changes.

| Firebase Cloud Function         | NestJS equivalent                                      |
| ------------------------------- | ------------------------------------------------------ |
| `onObjectCreated` (Storage)     | Multer upload handler → `cvQueue.add(job)`             |
| `onDocumentUpdated` (Firestore) | Service method emits `application.stage.changed` event |
| `@OnEvent` handler              | Same as Cloud Function body, unchanged                 |

```typescript
// Cloud Function (before)
export const onStageChanged = onDocumentUpdated('applications/{id}', async (event) => {
  const after = event.data?.after.data()
  await emailService.sendForStage(after.candidateId, after.jobId, after.stage)
})

// NestJS event handler (after) — identical logic, different trigger
@OnEvent('application.stage.changed')
async handleStageChange(payload: StageChangedEvent) {
  await this.emailService.sendForStage(payload.candidateId, payload.jobId, payload.stage)
}
```

### 3.4 Replace Firebase Auth with Keycloak

Keycloak runs as a Docker container alongside the application. The migration steps are:

1. Stand up Keycloak container (see `docs/onpremises/docker-compose.reference.yml`)
2. Create an ATS realm in Keycloak
3. Create roles: `admin`, `recruiter`, `interviewer`
4. Import users from Firebase Auth export (a migration script is at `scripts/migrations/import-users-keycloak.ts`)
5. Replace `FirebaseAuthProvider` with `KeycloakAuthProvider` in `src/shared/lib/auth.ts`
6. Update the JWT verification in the NestJS API to validate Keycloak tokens instead of Firebase tokens

Users will need to reset their passwords on first login to the migrated system. Plan a communication to HR users before the cutover.

### 3.5 Replace Firebase Storage with filesystem

File uploads change from `uploadBytes` (Firebase SDK) to a multipart form POST to the NestJS API, which writes to `/srv/ats/files/`.

The `FilesRepository` interface stays the same. Only the implementation changes:

```typescript
// apps/web/src/repositories/postgres/files.postgres.ts
export class FilesystemRepository implements FilesRepository {
  async uploadCV(file: File, candidateId: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidateId', candidateId);
    const res = await fetch('/api/files/cv', {
      method: 'POST',
      body: formData,
    });
    const { path } = await res.json();
    return path;
  }

  async getDownloadUrl(path: string): Promise<string> {
    // Nginx serves files at /uploads/ with token-based access control
    const token = await this.authService.getFileToken(path);
    return `/uploads/${path}?token=${token}`;
  }
}
```

---

## Phase 4 — Realtime updates (day 6)

Firestore's `onSnapshot` is the one Firebase feature with no direct REST equivalent. The following table shows how each realtime subscription is replaced:

| Feature using onSnapshot             | Migration approach                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Pipeline table (applications by job) | TanStack Query with `refetchInterval: 10000` (10s polling) — acceptable for an internal tool with ~50 concurrent HR users |
| Application stage badge              | Same polling on the candidate detail page                                                                                 |
| CV parse status indicator            | Polling every 3 seconds while `cvParseStatus === 'processing'`, stops when done                                           |

For the pipeline specifically, 10-second polling with TanStack Query provides an adequate experience. If the client explicitly requires sub-second updates in the future, NestJS WebSocket support can be added at that point. For this migration, polling is simpler, more reliable, and easier to debug.

The subscription methods on the repository interface remain — they just change behavior:

```typescript
// PostgreSQL implementation of subscribeToJobPipeline
// Returns a cleanup function that clears the interval, matching the Firebase signature
subscribeToJobPipeline(jobId, callback) {
  const interval = setInterval(async () => {
    const apps = await this.findByJob(jobId)
    callback(apps)
  }, 10000)
  return () => clearInterval(interval)
}
```

---

## Phase 5 — Cutover (day 7)

### 5.1 Pre-cutover checklist

- [ ] All PostgreSQL repositories implemented and tested
- [ ] Data migration verified (all record counts match)
- [ ] All files accessible at new filesystem paths
- [ ] Keycloak running with all users imported
- [ ] NestJS workers processing jobs from BullMQ
- [ ] SSL certificate configured in Nginx
- [ ] Backup of PostgreSQL data taken
- [ ] Rollback plan confirmed (Firebase remains read-only and accessible)

### 5.2 Cutover procedure

Cutover should happen during a low-usage period — Friday evening or weekend morning.

```bash
# 1. Put Firebase into read-only mode (update Security Rules to deny all writes)
# 2. Deploy the new on-premises application
docker compose -f /srv/ats/docker-compose.yml up -d

# 3. Run a final incremental migration for any data written since the initial export
pnpm ts-node scripts/migrations/sync-delta.ts \
  --since "2024-XX-XX" \
  --database postgresql://ats_user:PASSWORD@localhost:5432/ats_production

# 4. Update DNS to point to the on-premises server
# 5. Smoke test: login, create a job, upload a CV, verify parsing runs
# 6. Notify HR team that the system is live on the new infrastructure
```

### 5.3 Post-cutover monitoring

For the first week after cutover, monitor:

- PostgreSQL connection pool (should stay well below the max connections limit)
- BullMQ job queue depth (jobs should process within 30 seconds under normal load)
- Nginx error logs at `/srv/ats/logs/nginx/error.log`
- Application logs at `/srv/ats/logs/`

### 5.4 Firebase decommission

Keep the Firebase project active and read-only for 30 days after successful cutover. After 30 days with no issues:

1. Export a final backup of all Firestore data and Storage files
2. Archive the export to `/srv/ats/backups/firebase-final-export/`
3. Disable the Firebase project (not delete — keep it for audit history if needed)
4. Remove Firebase SDK dependencies from the application: `pnpm remove firebase firebase-admin`
5. Delete `apps/web/src/repositories/firebase/` and `apps/functions/`

---

## Rollback plan

If critical issues are found during or after cutover, rolling back to Firebase takes under 30 minutes:

1. Revert `src/repositories/index.ts` to import Firebase repositories
2. Re-enable writes in Firebase Security Rules
3. Deploy the Firebase version: `firebase deploy`
4. Update DNS back to Firebase Hosting

The Firebase version of the application is always deployable as long as the `src/repositories/firebase/` files exist and the Firebase project is active. Do not delete the Firebase project until the migration has been stable for 30 days.

---

## Effort breakdown

This table assumes the repository pattern was followed during development. If Firebase calls are scattered throughout the codebase, add 1 week to implement the repository pattern as a prerequisite.

| Phase     | Task                                          | Estimated days      |
| --------- | --------------------------------------------- | ------------------- |
| 1         | Infrastructure setup                          | 2                   |
| 2         | Data export and import                        | 1                   |
| 2         | Data verification                             | 0.5                 |
| 3         | PostgreSQL repositories (all entities)        | 2                   |
| 3         | NestJS workers (5 Cloud Function equivalents) | 1                   |
| 3         | Keycloak auth setup and user import           | 0.5                 |
| 3         | Filesystem storage                            | 0.5                 |
| 4         | Replace onSnapshot with polling               | 0.5                 |
| 5         | Cutover and monitoring                        | 1                   |
| **Total** |                                               | **~9 working days** |

---

## Contact and ownership

This migration document should be updated by whoever implements each phase to reflect actual decisions made, edge cases found, and deviations from this plan. The goal is that a developer with no prior knowledge of this project can execute the migration by following this document alone.
