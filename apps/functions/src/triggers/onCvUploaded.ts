import { logger } from 'firebase-functions';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

import { CvUploadService } from '../services/cvUploadService';

const cvUploadService = new CvUploadService();

function extractCandidateIdFromPath(filePath: string): string | null {
  const match = filePath.match(/^cvs\/([^/]+)\/.+$/);

  return match?.[1] ?? null;
}

function isPdf(contentType?: string): boolean {
  return contentType === 'application/pdf';
}

export const onCVUploaded = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  const contentType = event.data.contentType;

  if (!filePath) {
    logger.warn('Se recibió un evento de Storage sin filePath.');
    return;
  }

  const candidateId = extractCandidateIdFromPath(filePath);

  if (!candidateId) {
    logger.info(
      `Archivo ignorado porque no corresponde al patrón cvs/{candidateId}/... Path=${filePath}`,
    );
    return;
  }

  if (!isPdf(contentType)) {
    logger.warn(
      `Archivo ignorado porque no es PDF. Path=${filePath}, contentType=${contentType}`,
    );
    return;
  }

  await cvUploadService.handleCvUploaded(candidateId, filePath);

  logger.info(
    `CV recibido correctamente. candidateId=${candidateId}, path=${filePath}`,
  );
});
