import {
  buildCandidateSkillSet,
  computeWeightedMatch,
  parseJobSkills,
} from './skillMatchCalculator';
import { ApplicationsRepository } from '../repositories/applicationRepository';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { JobsRepository } from '../repositories/jobsRepository';

// Limita la concurrencia para evitar picos de lecturas y escrituras en Firestore.
const RECALCULATION_BATCH_SIZE = 20;

// ─── Error personalizado ───────────────────────────────────────────────────────

export class SkillMatchServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SkillMatchServiceError';
  }
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export class SkillMatchService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository = new ApplicationsRepository(),
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly jobsRepository: JobsRepository = new JobsRepository(),
  ) {}

  /**
   * Calcula el match ponderado de skills para una postulación y persiste
   * el resultado en su documento de aplicación.
   *
   * Lecturas Firestore: 3 en total (application → candidate + job en paralelo).
   * Escritura Firestore: 1 (.update sobre application).
   *
   * @param applicationId  ID del documento en la colección `applications`.
   */
  async calculateAndPersist(applicationId: string): Promise<void> {
    const application =
      await this.applicationsRepository.findById(applicationId);

    if (!application) {
      throw new SkillMatchServiceError(
        `Postulación no encontrada: ${applicationId}`,
      );
    }

    const { candidateId, jobId } = application;

    if (!candidateId || !jobId) {
      throw new SkillMatchServiceError(
        `La postulación ${applicationId} no contiene candidateId o jobId válidos.`,
      );
    }

    const [candidate, job] = await Promise.all([
      this.candidatesRepository.findById(candidateId),
      this.jobsRepository.findById(jobId),
    ]);

    if (!candidate) {
      throw new SkillMatchServiceError(
        `Candidato no encontrado: ${candidateId}`,
      );
    }

    if (!job) {
      throw new SkillMatchServiceError(`Puesto no encontrado: ${jobId}`);
    }

    const rawCandidateSkills: unknown[] = Array.isArray(
      candidate.technicalSkills,
    )
      ? candidate.technicalSkills
      : [];
    const rawJobSkills: unknown[] = Array.isArray(job.skills) ? job.skills : [];

    const jobSkills = parseJobSkills(rawJobSkills);

    // Un draft por CV todavía no fue confirmado. Calcularlo como 0 mezclaría
    // "sin datos disponibles" con "sin coincidencias".
    if (candidate.profileStatus !== 'completed' || jobSkills.length === 0) {
      await this.applicationsRepository.updateSkillMatch(applicationId, null);
      return;
    }

    const candidateSkillSet = buildCandidateSkillSet(rawCandidateSkills);
    const matchResult = computeWeightedMatch(jobSkills, candidateSkillSet);

    await this.applicationsRepository.updateSkillMatch(
      applicationId,
      matchResult,
    );
  }

  async recalculateForCandidate(candidateId: string): Promise<void> {
    const applications =
      await this.applicationsRepository.findByCandidateId(candidateId);
    await this.recalculateApplications(applications.map(({ id }) => id));
  }

  async recalculateForJob(jobId: string): Promise<void> {
    const applications = await this.applicationsRepository.findByJobId(jobId);
    await this.recalculateApplications(applications.map(({ id }) => id));
  }

  private async recalculateApplications(
    applicationIds: string[],
  ): Promise<void> {
    // Cada lote corre en paralelo; los lotes se procesan secuencialmente.
    for (
      let index = 0;
      index < applicationIds.length;
      index += RECALCULATION_BATCH_SIZE
    ) {
      const batch = applicationIds.slice(
        index,
        index + RECALCULATION_BATCH_SIZE,
      );
      await Promise.all(
        batch.map((applicationId) => this.calculateAndPersist(applicationId)),
      );
    }
  }
}
