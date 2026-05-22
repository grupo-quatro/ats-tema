import { logger } from 'firebase-functions';
import { CandidatesRepository } from '../repositories/candidateRepository';
import { CvParseStatus } from '@ats/shared-types';
import { CvParsingService } from './parsing/cvParsingService';

/**
 * Servicio Orquestador del ciclo de vida de ingesta de Currículums.
 * Coordina el registro inicial del binario, la invocación asincrónica
 * al motor cognitivo de IA y la persistencia de los resultados estructurados.
 */
export class CvUploadService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly cvParsingService: CvParsingService = new CvParsingService(),
  ) {}

  /**
   * Maneja de manera reactiva el evento de carga física de un CV en Cloud Storage.
   */
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
      `[CvUploadService] Registro inicial completado. candidateId=${candidateId}, registrationSource=${candidate.registrationSource}, cvParseStatus=${nextCvParseStatus}`,
    );

    if (nextCvParseStatus === 'processing') {
      try {
        logger.info(
          `[CvUploadService] Iniciando extracción cognitiva en Vertex AI para candidateId=${candidateId}`,
        );

        const parsedCvResults =
          await this.cvParsingService.parseDocument(cvStoragePath);

        await this.candidatesRepository.updateCvParseSuccess(
          candidateId,
          parsedCvResults,
        );

        logger.info(
          `[CvUploadService] Pipeline finalizado con éxito. Transición a 'done' confirmada para candidateId=${candidateId}`,
        );
      } catch (error) {
        logger.error(
          `[CvUploadService] Error crítico detectado en el pipeline cognitivo para candidateId=${candidateId}. Activando degradación elegante a 'failed'.`,
          error,
        );

        await this.candidatesRepository.updateCvParseFailure(candidateId);
      }
    }
  }
}
