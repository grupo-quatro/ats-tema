import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { CvParsingService } from './parsing/cvParsingService';
import { CvParsingError } from '../core/errors/cvParsingError';

export class CvUploadService {
  private parsingService: CvParsingService;

  constructor() {
    this.parsingService = new CvParsingService();
  }

  /**
   * Función orquestadora: Descarga archivo -> Llama a IA -> Actualiza DB
   */
  async processUploadedCv(
    candidateId: string,
    bucketName: string,
    filePath: string,
    mimeType: string,
  ): Promise<void> {
    const db = getFirestore();
    const candidateRef = db.collection('candidates').doc(candidateId);

    try {
      // 1. Cambiar estado a 'processing' (Le avisa al frontend que muestre el spinner)
      await candidateRef.update({ cvParseStatus: 'processing' });

      // 2. Descargar el archivo a la memoria RAM (Buffer)
      // Justificación On-Premise: Si un día usan MinIO, solo cambian este bloque.
      const bucket = getStorage().bucket(bucketName);
      const file = bucket.file(filePath);
      const [fileBuffer] = await file.download();

      // 3. Delegar el procesamiento cognitivo al servicio de IA
      const parsedData = await this.parsingService.parseCvFromBuffer(
        fileBuffer,
        mimeType,
      );

      // 4. Guardar éxito en base de datos
      await candidateRef.update({
        cvParseStatus: 'done',
        parsedData: parsedData,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `[CvUploadService] Error crítico procesando CV del candidato ${candidateId}:`,
        error,
      );

      // Best-Effort: Si algo falla (ej. IA caída o PDF corrupto), avisar al frontend
      const errorMessage =
        error instanceof CvParsingError
          ? error.message
          : 'Error interno al procesar CV';

      await candidateRef
        .update({
          cvParseStatus: 'failed',
          cvParseError: errorMessage,
          updatedAt: new Date().toISOString(),
        })
        .catch((err) =>
          console.error('Fallo al actualizar estado de error en DB:', err),
        );
    }
  }
}
