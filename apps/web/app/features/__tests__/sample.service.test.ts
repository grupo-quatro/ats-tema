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
