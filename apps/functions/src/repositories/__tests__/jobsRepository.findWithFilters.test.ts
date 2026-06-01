import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from '@ats/shared-types';

const makeFirestoreJob = (overrides: Partial<Job> = {}) => ({
  id: 'job-1',
  title: 'Frontend Developer',
  slug: 'frontend-developer',
  department: 'Engineering',
  seniority: 'senior',
  location: 'remote',
  status: 'open',
  description: 'desc',
  skills: [],
  responsabilities: [],
  benefits: [],
  hiringManagerId: 'mgr-1',
  currency: 'USD',
  createdAt: { toDate: () => new Date('2026-05-01') },
  updatedAt: { toDate: () => new Date('2026-05-01') },
  publishedAt: { toDate: () => new Date('2026-05-01') },
  ...overrides,
});

const buildMockQuery = (docs: ReturnType<typeof makeFirestoreJob>[]) => {
  const query: any = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      docs: docs.map((d) => ({ data: () => d })),
    }),
  };
  return query;
};

vi.mock('../../core/firebaseAdmin', () => ({
  db: {
    collection: vi.fn(),
  },
}));

import { db } from '../../core/firebaseAdmin';
import { JobsRepository } from '../jobsRepository';

describe('JobsRepository.findWithFilters', () => {
  let repo: JobsRepository;
  let mockQuery: ReturnType<typeof buildMockQuery>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = buildMockQuery([
      makeFirestoreJob({
        id: 'job-1',
        title: 'Frontend Developer',
        department: 'Engineering',
        location: 'remote',
        status: 'open',
      }),
      makeFirestoreJob({
        id: 'job-2',
        title: 'Backend Developer',
        department: 'Engineering',
        location: 'hybrid',
        status: 'open',
      }),
      makeFirestoreJob({
        id: 'job-3',
        title: 'UX Designer',
        department: 'Design',
        location: 'remote',
        status: 'open',
      }),
    ]);
    (db.collection as any).mockReturnValue(mockQuery);
    repo = new JobsRepository();
  });

  it('retorna todos los jobs sin filtros con paginación default', async () => {
    const result = await repo.findWithFilters({ page: 1, limit: 10 });

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.jobs).toHaveLength(3);
  });

  it('aplica filtro de location en memoria', async () => {
    const result = await repo.findWithFilters({
      location: 'remote',
      page: 1,
      limit: 10,
    });

    expect(result.jobs.every((j) => j.location === 'remote')).toBe(true);
    expect(result.total).toBe(2);
  });

  it('aplica filtro de department en memoria', async () => {
    const result = await repo.findWithFilters({
      department: 'Design',
      page: 1,
      limit: 10,
    });

    expect(result.jobs.every((j) => j.department === 'Design')).toBe(true);
    expect(result.total).toBe(1);
  });

  it('pagina correctamente', async () => {
    const result = await repo.findWithFilters({ page: 1, limit: 2 });

    expect(result.jobs).toHaveLength(2);
    expect(result.totalPages).toBe(2);
    expect(result.total).toBe(3);
  });

  it('devuelve la segunda página correctamente', async () => {
    const result = await repo.findWithFilters({ page: 2, limit: 2 });

    expect(result.jobs).toHaveLength(1);
    expect(result.page).toBe(2);
  });

  it('aplica where de status en Firestore cuando se pasa status', async () => {
    await repo.findWithFilters({ status: 'open', page: 1, limit: 10 });

    expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'open');
  });

  it('aplica orderBy en Firestore cuando no hay search', async () => {
    await repo.findWithFilters({
      orderBy: 'title',
      orderDir: 'asc',
      page: 1,
      limit: 10,
    });

    expect(mockQuery.orderBy).toHaveBeenCalledWith('title', 'asc');
  });

  it('filtra por titulo en memoria de forma case-insensitive', async () => {
    const result = await repo.findWithFilters({
      search: 'front',
      page: 1,
      limit: 10,
    });

    expect(mockQuery.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.title).toBe('Frontend Developer');
  });

  it('usa createdAt desc como orden default', async () => {
    await repo.findWithFilters({ page: 1, limit: 10 });

    expect(mockQuery.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('devuelve lista vacía si no hay resultados', async () => {
    mockQuery = buildMockQuery([]);
    (db.collection as any).mockReturnValue(mockQuery);
    repo = new JobsRepository();

    const result = await repo.findWithFilters({ page: 1, limit: 10 });

    expect(result.jobs).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});

describe('JobsRepository.findDepartments', () => {
  let repo: JobsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna departamentos únicos ordenados', async () => {
    const mockColl: any = {
      get: vi.fn().mockResolvedValue({
        docs: [
          { data: () => ({ department: 'Engineering' }) },
          { data: () => ({ department: 'Design' }) },
          { data: () => ({ department: 'Engineering' }) },
          { data: () => ({ department: 'QA' }) },
        ],
      }),
    };
    (db.collection as any).mockReturnValue(mockColl);
    repo = new JobsRepository();

    const result = await repo.findDepartments();

    expect(result).toEqual(['Design', 'Engineering', 'QA']);
  });

  it('filtra documentos sin department', async () => {
    const mockColl: any = {
      get: vi.fn().mockResolvedValue({
        docs: [
          { data: () => ({ department: 'Engineering' }) },
          { data: () => ({}) },
        ],
      }),
    };
    (db.collection as any).mockReturnValue(mockColl);
    repo = new JobsRepository();

    const result = await repo.findDepartments();

    expect(result).toEqual(['Engineering']);
  });
});
