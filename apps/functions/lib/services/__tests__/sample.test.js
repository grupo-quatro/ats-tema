"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
function createCandidateService(repo) {
    return {
        async getCandidate(id) {
            const candidate = await repo.findById(id);
            if (!candidate)
                throw new Error(`Candidate ${id} not found`);
            return candidate;
        },
    };
}
(0, vitest_1.describe)("CandidateService", () => {
    (0, vitest_1.it)("returns candidate when repository resolves one", async () => {
        const mockRepo = {
            findById: vitest_1.vi.fn().mockResolvedValue({ id: "1", name: "Ana" }),
        };
        const service = createCandidateService(mockRepo);
        const result = await service.getCandidate("1");
        (0, vitest_1.expect)(result).toEqual({ id: "1", name: "Ana" });
    });
    (0, vitest_1.it)("throws when repository returns null", async () => {
        const mockRepo = {
            findById: vitest_1.vi.fn().mockResolvedValue(null),
        };
        const service = createCandidateService(mockRepo);
        await (0, vitest_1.expect)(service.getCandidate("99")).rejects.toThrow("Candidate 99 not found");
    });
});
