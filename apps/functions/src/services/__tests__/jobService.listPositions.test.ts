import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from '@ats/shared-types';
import { JobService } from '../jobService';

const makeJob = (overrides: Partial<Job> = {}): Job => ({
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
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-01'),
  publishedAt: new Date('2026-05-01'),
  ...overrides,
});

const mockRepo = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByStatus: vi.fn(),
  findWithFilters: vi.fn(),
  findDepartments: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  createOrUpdateJob: vi.fn(),
};

const mockApplicationsRepo = {
  countByJobIds: vi.fn(),
};

describe('JobService.listPositions', () => {
  let service: JobService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApplicationsRepo.countByJobIds.mockResolvedValue({});
    service = new JobService(mockRepo as any, mockApplicationsRepo as any);
  });

  it('retorna los resultados del repositorio', async () => {
    const response = {
      jobs: [makeJob()],
      total: 1,
      page: 1,
      totalPages: 1,
    };
    mockRepo.findWithFilters.mockResolvedValue(response);
    mockApplicationsRepo.countByJobIds.mockResolvedValue({ 'job-1': 3 });

    const result = await service.listPositions({ page: 1, limit: 10 });

    expect(mockRepo.findWithFilters).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(mockApplicationsRepo.countByJobIds).toHaveBeenCalledWith(['job-1']);
    expect(result).toEqual({
      ...response,
      jobs: [{ ...response.jobs[0], candidates: 3 }],
    });
  });

  it('pasa todos los filtros al repositorio', async () => {
    const filters = {
      search: 'dev',
      status: 'open' as const,
      location: 'remote' as const,
      department: 'Engineering',
      page: 2,
      limit: 5,
      orderBy: 'title' as const,
      orderDir: 'asc' as const,
    };
    mockRepo.findWithFilters.mockResolvedValue({
      jobs: [],
      total: 0,
      page: 2,
      totalPages: 0,
    });

    await service.listPositions(filters);

    expect(mockRepo.findWithFilters).toHaveBeenCalledWith(filters);
  });

  it('propaga errores del repositorio', async () => {
    mockRepo.findWithFilters.mockRejectedValue(new Error('Firestore error'));

    await expect(service.listPositions({})).rejects.toThrow();
  });
});

describe('JobService.listDepartments', () => {
  let service: JobService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JobService(mockRepo as any, mockApplicationsRepo as any);
  });

  it('retorna la lista de departamentos del repositorio', async () => {
    mockRepo.findDepartments.mockResolvedValue(['Engineering', 'Design', 'QA']);

    const result = await service.listDepartments();

    expect(mockRepo.findDepartments).toHaveBeenCalledOnce();
    expect(result).toEqual(['Engineering', 'Design', 'QA']);
  });

  it('retorna lista vacía si no hay departamentos', async () => {
    mockRepo.findDepartments.mockResolvedValue([]);

    const result = await service.listDepartments();

    expect(result).toEqual([]);
  });

  it('propaga errores del repositorio', async () => {
    mockRepo.findDepartments.mockRejectedValue(new Error('Firestore error'));

    await expect(service.listDepartments()).rejects.toThrow();
  });
});
