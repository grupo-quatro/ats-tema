import { getStorage } from 'firebase-admin/storage';
import { VertexAI } from '@google-cloud/vertexai';
import { logger } from 'firebase-functions';

import { CV_PARSER_JSON_SCHEMA } from './cvParserSchema';
import type { ParsedCV } from '@ats/shared-types';

export class CvParsingService {
  private vertexAI: VertexAI | null = null;

  constructor() {
    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
      this.vertexAI = new VertexAI({
        project: process.env.GCLOUD_PROJECT || 'ats-tema-ort',
        location: 'us-central1',
      });
    }
  }

  /**
   * Descarga el CV de Storage, invoca a Gemini 1.5 Flash
   * con Structured Outputs y retorna la metadata estructurada limpia.
   */
  async parseDocument(cvStoragePath: string): Promise<ParsedCV> {
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
      logger.info(
        `[CvParsingService] Entorno local detectado. Retornando Mock controlado para path: ${cvStoragePath}`,
      );
      return this.getMockParsedData();
    }

    try {
      logger.info(
        `[CvParsingService] Iniciando descarga en memoria para el CV: ${cvStoragePath}`,
      );

      const bucket = getStorage().bucket();
      const fileRef = bucket.file(cvStoragePath);

      const [exists] = await fileRef.exists();
      if (!exists) {
        throw new Error(
          `El archivo físico no existe en el bucket de Storage: ${cvStoragePath}`,
        );
      }

      const [fileBuffer] = await fileRef.download();
      const base64Pdf = fileBuffer.toString('base64');

      if (!this.vertexAI) {
        throw new Error(
          'El SDK corporativo de Vertex AI no fue inicializado correctamente.',
        );
      }

      const generativeModel = this.vertexAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: CV_PARSER_JSON_SCHEMA,
          temperature: 0.1,
        },
      });

      logger.info(
        `[CvParsingService] Enviando payload multimodal a Gemini 1.5 Flash...`,
      );

      const responseStream = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Pdf,
                  mimeType: 'application/pdf',
                },
              },
              {
                text: 'Analizá el documento PDF adjunto que corresponde al currículum de un postulante. Extraé de forma precisa y estructurada todos los datos requeridos cumpliendo con rigurosidad el JSON Schema provisto.',
              },
            ],
          },
        ],
      });

      const responseText =
        responseStream.response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error(
          'Gemini retornó una respuesta cognitiva vacía o malformada.',
        );
      }

      const parsedData: ParsedCV = JSON.parse(responseText);
      logger.info(
        `[CvParsingService] Parseo de CV finalizado con éxito para path: ${cvStoragePath}`,
      );

      return parsedData;
    } catch (error) {
      logger.error(
        `[CvParsingService] Error crítico durante el pipeline cognitivo de parsing para path: ${cvStoragePath}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Datos estáticos controlados para el Firebase Local Emulator.
   * Evita bloqueos entre integrantes de Front y Back en el día a día.
   */
  private getMockParsedData(): ParsedCV {
    return {
      fullName: 'Juan Pérez Emulado',
      email: 'juan.perez.mock@ort.edu.ar',
      phone: '+54 9 11 5555-1234',
      location: 'Buenos Aires, Argentina',
      summary:
        'Desarrollador Full Stack con amplia experiencia académica orientada a metodologías ágiles en entornos de nube y arquitecturas serverless.',
      skills: [
        'TypeScript',
        'React',
        'Next.js',
        'Node.js',
        'Firebase Emulators',
      ],
      education: [
        {
          institution: 'Universidad ORT',
          degree: 'Analista de Sistemas / Ingeniería de Software',
          startDate: '2023',
          endDate: 'Actualidad',
        },
      ],
      experience: [
        {
          company: 'Proyecto ATS Tema (Sprint 3)',
          role: 'Backend Core Developer',
          startDate: 'Marzo 2026',
          endDate: 'Mayo 2026',
          description:
            'Implementación del pipeline de ingesta de talento y automatización asincrónica mediante Cloud Functions v2 y Vertex AI.',
        },
      ],
    };
  }
}
