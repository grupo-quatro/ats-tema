import { logger } from 'firebase-functions';

import { CandidatesRepository } from '../repositories/candidate-repository';
import { CvParseStatus } from '@ats/shared-types';

/**
 * Maneja la carga de un CV en Storage.
 * Si la carga es manual el cv se guarda adjunto pero no se parsea.
 * Si cargo directo con CV, el CV se marca como processing para el proceso.
 */

export class CvUploadService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
  ) {}

  async handleCvUploaded(
    candidateId: string,
    cvStoragePath: string,
  ): Promise<void> {
    const candidate = await this.candidatesRepository.findById(candidateId);

    if (!candidate) {
      logger.warn(
        `Se recibió un CV para un candidato inexistente. candidateId=${candidateId}, path=${cvStoragePath}`,
      );
      return;
    }

    const nextCvParseStatus: CvParseStatus =
      candidate.registrationSource === 'manual' ? 'not_required' : 'processing';

    await this.candidatesRepository.updateCvStoragePath(
      candidateId,
      cvStoragePath,
      nextCvParseStatus,
    );

    logger.info(
      `CV actualizado correctamente. candidateId=${candidateId}, registrationSource=${candidate.registrationSource}, cvParseStatus=${nextCvParseStatus}, path=${cvStoragePath}`,
    );
  }
}
