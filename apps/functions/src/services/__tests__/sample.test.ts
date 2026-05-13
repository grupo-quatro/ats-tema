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
