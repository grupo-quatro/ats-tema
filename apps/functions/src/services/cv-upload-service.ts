import { logger } from "firebase-functions";

import { CandidatesRepository } from "../repositories/candidate-repository";

/**
 * Dado un candidateId y un path de Storage, actualiza el candidato a processing.
 */
export class CvUploadService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
  ) {}

  async markCvAsProcessing(
    candidateId: string,
    cvStoragePath: string,
  ): Promise<void> {
    const wasUpdated = await this.candidatesRepository.updateCvUploadStatus(
      candidateId,
      cvStoragePath,
    );

    if (!wasUpdated) {
      logger.warn(
        `Se recibió un CV para un candidato inexistente. candidateId=${candidateId}, path=${cvStoragePath}`,
      );
    }
  }
}
