import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';

import { CandidatesRepository } from '../repositories/candidateRepository';
import { CvParsingError, serializeError } from '../core/errors/cvParsingError';
import { CvParsingService } from './parsing/cvParsingService';

const DEFAULT_MIME_TYPE = 'application/pdf';

type CvDownloader = (bucketName: string, filePath: string) => Promise<Buffer>;

export class CvUploadService {
  constructor(
    private readonly candidatesRepository: CandidatesRepository = new CandidatesRepository(),
    private readonly parsingService: CvParsingService = new CvParsingService(),
    private readonly downloadCvToBuffer: CvDownloader = defaultDownloadToBuffer,
  ) {}

  /**
   * Orquesta el flujo de CV: valida candidato, descarga el PDF a memoria,
   * delega parsing y persiste el estado final para el frontend.
   */
  async processUploadedCv(
    candidateId: string,
    bucketName: string,
    filePath: string,
    mimeType = DEFAULT_MIME_TYPE,
  ): Promise<void> {
    const candidate = await this.candidatesRepository.findById(candidateId);

    if (!candidate) {
      logger.warn('Se recibio un CV para un candidato inexistente.', {
        candidateId,
        filePath,
      });
      return;
    }

    if (candidate.registrationSource === 'manual') {
      await this.candidatesRepository.updateCvStoragePath(
        candidateId,
        filePath,
        'not_required',
      );
      logger.info('CV adjuntado en flujo manual sin parsing.', {
        candidateId,
        filePath,
      });
      return;
    }

    if (
      candidate.cvParseStatus === 'done' &&
      candidate.cvStoragePath === filePath &&
      process.env.CV_PARSING_FORCE_REPROCESS !== 'true'
    ) {
      logger.info('CV ignorado porque ya estaba parseado.', {
        candidateId,
        filePath,
      });
      return;
    }

    try {
      await this.candidatesRepository.markParsingProcessing(
        candidateId,
        filePath,
      );

      const fileBuffer = await this.downloadCvToBuffer(bucketName, filePath);

      const parsedData = await this.parsingService.parseFromBuffer(
        fileBuffer,
        mimeType,
      );

      await this.candidatesRepository.markParsingDone(candidateId, parsedData);

      logger.info('CV parseado correctamente.', {
        candidateId,
        filePath,
        parserVersion: parsedData.parserVersion,
        technicalSkills:
          parsedData.technicalSkills?.length ??
          parsedData.hardSkills?.length ??
          parsedData.skills?.length ??
          0,
      });
    } catch (error) {
      const errorMessage =
        error instanceof CvParsingError
          ? error.message
          : 'Error interno al procesar CV';

      logger.error('Fallo el parsing del CV.', {
        candidateId,
        filePath,
        error: serializeError(error),
      });

      try {
        await this.candidatesRepository.markParsingFailed(
          candidateId,
          errorMessage,
        );
      } catch (statusError) {
        logger.error('Tampoco se pudo marcar el parsing como failed.', {
          candidateId,
          statusError: serializeError(statusError),
        });
      }
    }
  }
}

async function defaultDownloadToBuffer(
  bucketName: string,
  filePath: string,
): Promise<Buffer> {
  const bucket = getStorage().bucket(bucketName);
  const file = bucket.file(filePath);
  const [exists] = await file.exists();

  if (!exists) {
    throw new CvParsingError(
      `El archivo fisico no existe en Storage: ${filePath}`,
    );
  }

  const [fileBuffer] = await file.download();
  return fileBuffer;
}
