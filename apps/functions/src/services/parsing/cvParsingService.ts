import { VertexAI, Part } from '@google-cloud/vertexai';
import { CV_PROFILE_SCHEMA } from './cvParserSchema';
import { CvParsingError } from '../../core/errors/cvParsingError';

export class CvParsingService {
  private readonly SYSTEM_PROMPT = `
    Eres un experto reclutador de TEMA. Tu tarea es extraer la información del siguiente CV.
    Instrucciones estrictas:
    1. Responde ÚNICAMENTE con un JSON válido que respete el esquema proporcionado.
    2. Las fechas deben estar en formato YYYY-MM.
    3. Normaliza las habilidades (ej. escribe 'Node.js' en lugar de 'node js').
    4. Si un dato no existe, omite el campo o usa null, no inventes información.
  `;

  /**
   * Procesa un documento desde memoria RAM (Buffer), siendo agnóstico a la infraestructura.
   */
  async parseCvFromBuffer(fileBuffer: Buffer, mimeType: string): Promise<any> {
    try {
      const vertexClient = new VertexAI({
        project: process.env.GCLOUD_PROJECT || 'ats-tema-ort',
        location: 'us-central1',
      });

      const generativeModel = vertexClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: CV_PROFILE_SCHEMA as any, // Evita errores de inferencia estricta de TS
          temperature: 0.1, // Baja temperatura para respuestas determinísticas
        },
        // IMPORTANTE: Vertex AI exige que el systemInstruction sea un objeto Content, no un string
        systemInstruction: {
          role: 'system',
          parts: [{ text: this.SYSTEM_PROMPT }],
        },
      });

      // 2. Preparar el archivo asegurando el tipo 'Part'
      const filePart: Part = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType, // Ej: 'application/pdf'
        },
      };

      // 3. Llamar a la IA
      const response = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [filePart, { text: 'Extraer datos del CV' }],
          },
        ],
      });

      const jsonText =
        response.response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!jsonText) {
        throw new Error('La IA no devolvió contenido de texto.');
      }

      // 4. Parsear y devolver
      return JSON.parse(jsonText);
    } catch (error: any) {
      // Lanzamos un error propio para que el orquestador sepa cómo manejarlo
      throw new CvParsingError(
        `Fallo al procesar el CV con IA: ${error.message}`,
      );
    }
  }
}
