import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

import type { ParsedCandidateProfileData } from '@ats/shared-types';

import {
  CvParsingError,
  serializeError,
} from '../../core/errors/cvParsingError';
import { CV_PARSER_JSON_SCHEMA } from './cvParserSchema';

const MODEL_ID = process.env.CV_PARSER_MODEL ?? 'gemini-2.5-flash';
const DEFAULT_LOCATION = 'us-central1';
const PARSER_VERSION = `cv-parser/1.0+${MODEL_ID}`;
const DEFAULT_MIME_TYPE = 'application/pdf';
const MAX_RETRY_ATTEMPTS = 2;
const MIN_EXTRACTED_TEXT_LENGTH = 120;
const MAX_TEXT_INPUT_CHARS = 12000;
const MAX_RESPONSE_TOKENS = 1024;

const SYSTEM_PROMPT = `Eres un parser de CVs para un ATS profesional.
Tu unica tarea es mapear el contenido de un CV a la entidad Candidate.

Reglas estrictas:
- Responde solo JSON parseable por JSON.parse.
- No uses markdown, no uses fences, no agregues explicaciones.
- Usa comillas dobles para todos los nombres de propiedades y strings.
- No dejes comas colgantes.
- Devuelve un objeto plano con campos de Candidate, no reconstruyas todo el CV.
- Devuelve experiencia laboral solo en parsedExperience, como lista resumida de company, role, startDate y endDate.
- Devuelve educacion solo en parsedEducation, como lista resumida de institution, degree, startDate y endDate.
- No devuelvas cursos, idiomas ni soft skills.
- Devuelve nombres canonicos de skills, por ejemplo "React", "Node.js" y "PostgreSQL".
- technicalSkills debe ser una lista corta de skills tecnicas relevantes.
- Si un campo no aparece en el CV, omitelo. No inventes datos.
- professionalSummary debe ser breve.
- education debe ser un string corto con la formacion principal.
- yearsOfExperience solo debe incluirse si puede inferirse con claridad.`;

const MOCK_PARSED_PROFILE: ParsedCandidateProfileData = {
  firstName: 'Sofia',
  lastName: 'Demo',
  fullName: 'Sofia Demo',
  email: 'candidata.demo@example.com',
  phone: '+54 11 5555-1234',
  location: 'Buenos Aires, Argentina',
  professionalSummary:
    'Desarrolladora de software con experiencia en aplicaciones web, APIs y automatizacion de procesos.',
  technicalSkills: [
    'TypeScript',
    'React',
    'Node.js',
    'Firebase',
    'PostgreSQL',
    'Git',
  ],
  education: 'Tecnicatura Superior en Analisis de Sistemas, ORT Argentina',
  parsedExperience: [
    {
      company: 'Acme Software',
      role: 'Full Stack Developer',
      startDate: 'Mar 2024',
      endDate: 'Presente',
    },
    {
      company: 'Nexo Digital',
      role: 'Frontend Developer',
      startDate: 'Ene 2022',
      endDate: 'Feb 2024',
    },
  ],
  parsedEducation: [
    {
      institution: 'ORT Argentina',
      degree: 'Tecnicatura Superior en Analisis de Sistemas',
      startDate: '2023',
      endDate: '2026',
    },
  ],
  parserVersion: PARSER_VERSION,
};

export class CvParsingService {
  private genAIClient: unknown | null = null;

  async parseFromBuffer(
    fileBuffer: Buffer,
    mimeType = DEFAULT_MIME_TYPE,
  ): Promise<ParsedCandidateProfileData> {
    if (this.shouldUseMock()) {
      logger.info(
        '[CvParsingService] Mock habilitado. Se omite la llamada a Vertex AI.',
      );
      return { ...MOCK_PARSED_PROFILE };
    }

    return this.parseWithRetry(fileBuffer, mimeType);
  }

  private shouldUseMock(): boolean {
    if (process.env.CV_PARSING_FORCE_REAL_AI === 'true') {
      return false;
    }

    return (
      process.env.FUNCTIONS_EMULATOR === 'true' ||
      process.env.CV_PARSING_USE_MOCK === 'true'
    );
  }

  private async parseWithRetry(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ParsedCandidateProfileData> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await this.callVertexAI(fileBuffer, mimeType);
      } catch (error) {
        lastError = error;
        logger.warn('[CvParsingService] Fallo intento de parsing con IA.', {
          attempt,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          retryable: this.isRetryable(error),
          error: serializeError(error),
        });

        if (attempt === MAX_RETRY_ATTEMPTS || !this.isRetryable(error)) {
          break;
        }

        await this.delay(1500 * attempt);
      }
    }

    throw new CvParsingError(
      'No se pudo parsear el CV con Vertex AI.',
      lastError,
    );
  }

  private async callVertexAI(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ParsedCandidateProfileData> {
    const extractedText = await this.extractTextFromPdf(fileBuffer);
    const useTextInput = extractedText.length >= MIN_EXTRACTED_TEXT_LENGTH;
    const inputText = useTextInput
      ? this.truncateForPrompt(extractedText)
      : undefined;

    logger.info('[CvParsingService] Preparando input para IA.', {
      source: useTextInput ? 'pdf_text' : 'pdf_multimodal_fallback',
      extractedTextLength: extractedText.length,
      promptTextLength: inputText?.length ?? 0,
    });

    const client = await this.getClient();

    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: this.buildContents(fileBuffer, mimeType, inputText),
      config: {
        responseMimeType: 'application/json',
        responseSchema: CV_PARSER_JSON_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: MAX_RESPONSE_TOKENS,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const responseText = response.text ?? '';

    if (!responseText) {
      throw new CvParsingError('Vertex AI devolvio una respuesta vacia.');
    }

    const parsed = this.parseJsonResponse(responseText);

    if (!this.isValidParsedProfile(parsed)) {
      throw new CvParsingError(
        'El output de Vertex AI no cumple el minimo esperado.',
      );
    }

    const fallbackProfile = this.extractFallbackProfile(extractedText);
    const normalizedName = this.normalizeNameFields(parsed, fallbackProfile);
    const technicalSkills =
      parsed.technicalSkills ?? parsed.hardSkills ?? parsed.skills ?? [];
    const parsedExperience = parsed.parsedExperience?.length
      ? parsed.parsedExperience
      : fallbackProfile.parsedExperience;
    const parsedEducation = parsed.parsedEducation?.length
      ? parsed.parsedEducation
      : fallbackProfile.parsedEducation;
    const inferredFullName = [normalizedName.firstName, normalizedName.lastName]
      .filter(Boolean)
      .join(' ');

    return {
      ...parsed,
      ...normalizedName,
      fullName:
        parsed.fullName ??
        fallbackProfile.fullName ??
        inferredFullName ??
        undefined,
      education:
        parsed.education ??
        this.inferEducation({ ...parsed, parsedEducation }) ??
        fallbackProfile.education,
      parsedExperience,
      parsedEducation,
      technicalSkills,
      skills: parsed.skills ?? technicalSkills,
      parserVersion: PARSER_VERSION,
    };
  }

  private buildContents(
    fileBuffer: Buffer,
    mimeType: string,
    extractedText?: string,
  ) {
    if (extractedText) {
      return [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            {
              text: `Texto extraido del CV:\n\n${extractedText}`,
            },
          ],
        },
      ];
    }

    return [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType,
            },
          },
          { text: SYSTEM_PROMPT },
        ],
      },
    ];
  }

  private async getClient(): Promise<{
    models: {
      generateContent: (params: {
        model: string;
        contents: unknown;
        config: unknown;
      }) => Promise<{ text?: string }>;
    };
  }> {
    if (!this.genAIClient) {
      const project = this.resolveProjectId();
      const location = process.env.VERTEX_LOCATION ?? DEFAULT_LOCATION;
      const { GoogleGenAI } = await import('@google/genai');

      this.genAIClient = new GoogleGenAI({
        vertexai: true,
        project,
        location,
      });

      logger.info('[CvParsingService] Google Gen AI SDK inicializado.', {
        project,
        location,
        model: MODEL_ID,
      });
    }

    return this.genAIClient as {
      models: {
        generateContent: (params: {
          model: string;
          contents: unknown;
          config: unknown;
        }) => Promise<{ text?: string }>;
      };
    };
  }

  private resolveProjectId(): string {
    const project =
      process.env.GCP_PROJECT ??
      process.env.GCLOUD_PROJECT ??
      process.env.GOOGLE_CLOUD_PROJECT ??
      admin.app().options.projectId;

    if (!project) {
      throw new CvParsingError(
        'No se pudo determinar el GCP project ID para Vertex AI.',
      );
    }

    return project;
  }

  private parseJsonResponse(responseText: string): ParsedCandidateProfileData {
    const normalizedText = this.extractJsonObject(responseText);

    try {
      return JSON.parse(normalizedText) as ParsedCandidateProfileData;
    } catch (error) {
      logger.warn('[CvParsingService] Vertex AI devolvio JSON invalido.', {
        responsePreview: this.getResponsePreview(responseText),
        normalizedPreview: this.getResponsePreview(normalizedText),
        error: serializeError(error),
      });

      throw new CvParsingError('Vertex AI devolvio JSON invalido.', error);
    }
  }

  private extractJsonObject(responseText: string): string {
    const withoutFence = responseText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const firstBraceIndex = withoutFence.indexOf('{');
    const lastBraceIndex = withoutFence.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
      return withoutFence;
    }

    return withoutFence.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  private getResponsePreview(responseText: string): string {
    return responseText.slice(0, 1000);
  }

  private async extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: fileBuffer });

      try {
        const result = await parser.getText();
        return this.normalizeExtractedText(result.text);
      } finally {
        await parser.destroy();
      }
    } catch (error) {
      logger.warn(
        '[CvParsingService] No se pudo extraer texto local del PDF. Se usara fallback.',
        { error: serializeError(error) },
      );
      return '';
    }
  }

  private normalizeExtractedText(text: string): string {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  private truncateForPrompt(text: string): string {
    return text.slice(0, MAX_TEXT_INPUT_CHARS);
  }

  private normalizeNameFields(
    parsed: ParsedCandidateProfileData,
    fallbackProfile: Partial<ParsedCandidateProfileData> = {},
  ): Pick<ParsedCandidateProfileData, 'firstName' | 'lastName'> {
    const nameParts = parsed.fullName?.trim().split(/\s+/) ?? [];
    const inferredFirstName =
      parsed.firstName ?? (nameParts.length > 1 ? nameParts[0] : undefined);
    const inferredLastName =
      parsed.lastName ??
      (nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined);

    if (inferredFirstName || inferredLastName) {
      return {
        firstName: inferredFirstName ?? fallbackProfile.firstName,
        lastName: inferredLastName ?? fallbackProfile.lastName,
      };
    }

    return {
      firstName: fallbackProfile.firstName,
      lastName: fallbackProfile.lastName,
    };
  }

  private inferEducation(
    parsed: ParsedCandidateProfileData,
  ): string | undefined {
    const primaryEducation = parsed.parsedEducation?.[0];
    if (!primaryEducation) {
      return undefined;
    }

    return [primaryEducation.degree, primaryEducation.institution]
      .filter(Boolean)
      .join(', ');
  }

  private extractFallbackProfile(
    extractedText: string,
  ): Partial<ParsedCandidateProfileData> {
    const lines = extractedText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !/^-- \d+ of \d+ --$/i.test(line));

    return {
      ...this.extractFallbackName(lines),
      ...this.extractFallbackEducation(lines),
      parsedExperience: this.extractFallbackExperience(lines),
    };
  }

  private extractFallbackName(
    lines: string[],
  ): Pick<ParsedCandidateProfileData, 'firstName' | 'lastName' | 'fullName'> {
    const [firstLine, secondLine] = lines;

    if (
      !firstLine ||
      !secondLine ||
      this.looksLikeSection(firstLine) ||
      this.looksLikeSection(secondLine) ||
      firstLine.includes('|') ||
      secondLine.includes('|')
    ) {
      return {};
    }

    return {
      firstName: firstLine,
      lastName: secondLine,
      fullName: `${firstLine} ${secondLine}`,
    };
  }

  private extractFallbackExperience(
    lines: string[],
  ): NonNullable<ParsedCandidateProfileData['parsedExperience']> {
    const startIndex = this.findLineIndex(lines, 'experiencia');
    if (startIndex === -1) {
      return [];
    }

    const endIndex = this.findNextLineIndex(lines, startIndex, [
      'skills tecnicas',
      'skills técnicas',
      'educacion',
      'educación',
    ]);
    const sectionLines = lines.slice(
      startIndex + 1,
      endIndex === -1 ? lines.length : endIndex,
    );
    const experience = [];

    for (let index = 0; index < sectionLines.length; index += 1) {
      const line = sectionLines[index];
      const dateLine = sectionLines[index + 1];

      if (
        !line?.includes('|') ||
        !dateLine ||
        !this.looksLikeDateRange(dateLine)
      ) {
        continue;
      }

      const [role, company] = line.split('|').map((part) => part.trim());
      const [startDate, endDate] = this.splitDateRange(dateLine);

      experience.push({
        role,
        company,
        startDate,
        endDate,
      });
    }

    return experience;
  }

  private extractFallbackEducation(
    lines: string[],
  ): Pick<ParsedCandidateProfileData, 'education' | 'parsedEducation'> {
    const startIndex = this.findLineIndex(lines, 'educacion', 'educación');
    if (startIndex === -1) {
      return {};
    }

    const degreeLine = lines[startIndex + 1];
    const dateLine = lines[startIndex + 2];
    if (!degreeLine) {
      return {};
    }

    const knownInstitution = 'ORT Argentina';
    const hasKnownInstitution = degreeLine.includes(knownInstitution);
    const degree = hasKnownInstitution
      ? degreeLine.replace(knownInstitution, '').trim()
      : degreeLine;
    const institution = hasKnownInstitution ? knownInstitution : undefined;
    const [startDate, endDate] =
      dateLine && this.looksLikeDateRange(dateLine)
        ? this.splitDateRange(dateLine)
        : [undefined, undefined];

    return {
      education: [degree, institution].filter(Boolean).join(', '),
      parsedEducation: [
        {
          degree,
          institution,
          startDate,
          endDate,
        },
      ],
    };
  }

  private findLineIndex(lines: string[], ...targets: string[]): number {
    return lines.findIndex((line) =>
      targets.some((target) => this.normalizeForMatch(line) === target),
    );
  }

  private findNextLineIndex(
    lines: string[],
    startIndex: number,
    targets: string[],
  ): number {
    return lines.findIndex(
      (line, index) =>
        index > startIndex &&
        targets.some((target) => this.normalizeForMatch(line) === target),
    );
  }

  private looksLikeSection(line: string): boolean {
    return ['sobre mi', 'experiencia', 'skills tecnicas', 'educacion'].includes(
      this.normalizeForMatch(line),
    );
  }

  private looksLikeDateRange(line: string): boolean {
    return /\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|\d{4})\b/i.test(
      line,
    );
  }

  private splitDateRange(
    line: string,
  ): [string | undefined, string | undefined] {
    const [startDate, endDate] = line
      .split(/\s+[–-]\s+/)
      .map((part) => part.trim());

    return [startDate || undefined, endDate || undefined];
  }

  private normalizeForMatch(line: string): string {
    return line
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private isValidParsedProfile(
    data: unknown,
  ): data is ParsedCandidateProfileData {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const parsed = data as ParsedCandidateProfileData;
    return Boolean(
      parsed.firstName ||
      parsed.lastName ||
      parsed.fullName ||
      parsed.email ||
      (parsed.technicalSkills?.length ?? 0) > 0 ||
      (parsed.hardSkills?.length ?? 0) > 0 ||
      (parsed.skills?.length ?? 0) > 0,
    );
  }

  private isRetryable(error: unknown): boolean {
    const status = this.extractStatusCode(error);
    return status === 429 || status === 500 || status === 502 || status === 503;
  }

  private extractStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const candidate = error as { code?: unknown; status?: unknown };
    const value = candidate.code ?? candidate.status;

    return typeof value === 'number' ? value : undefined;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
