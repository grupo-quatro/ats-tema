import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ParsedCandidateProfileData } from '@ats/shared-types';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getText: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('firebase-admin', () => ({
  app: vi.fn(() => ({
    options: {
      projectId: 'ats-tema-ort',
    },
  })),
}));

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: mocks.getText,
    destroy: mocks.destroy,
  })),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mocks.generateContent,
    },
  })),
}));

import { CvParsingService } from '../cvParsingService';

const clearParsingEnv = () => {
  delete process.env.FUNCTIONS_EMULATOR;
  delete process.env.CV_PARSING_USE_MOCK;
  delete process.env.CV_PARSING_FORCE_REAL_AI;
  delete process.env.GCP_PROJECT;
  delete process.env.GCLOUD_PROJECT;
  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.VERTEX_LOCATION;
};

describe('CvParsingService.parseFromBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearParsingEnv();
    mocks.getText.mockResolvedValue({
      text: 'Perfil tecnico con experiencia en TypeScript, Firebase y React. '.repeat(
        5,
      ),
    });
    mocks.destroy.mockResolvedValue(undefined);
  });

  it('devuelve el perfil mock en emulator sin llamar a IA', async () => {
    process.env.FUNCTIONS_EMULATOR = 'true';

    const service = new CvParsingService();

    const result = await service.parseFromBuffer(Buffer.from('pdf'));

    expect(result).toMatchObject({
      firstName: 'Sofia',
      lastName: 'Demo',
      email: 'sofia.demo@example.com',
      technicalSkills: [
        'TypeScript',
        'React',
        'Next.js',
        'Node.js',
        'Firebase',
      ],
    });
    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(mocks.getText).not.toHaveBeenCalled();
  });

  it('usa texto extraido localmente y normaliza skills del output de IA', async () => {
    process.env.CV_PARSING_FORCE_REAL_AI = 'true';
    process.env.GCP_PROJECT = 'ats-tema-ort';
    mocks.generateContent.mockResolvedValue({
      text: `\`\`\`json
{
  "firstName": "Sofia",
  "lastName": "Loria",
  "email": "sofia@example.com",
  "hardSkills": ["TypeScript", "Firebase"]
}
\`\`\``,
    });

    const service = new CvParsingService();

    const result = await service.parseFromBuffer(Buffer.from('pdf'));

    expect(mocks.getText).toHaveBeenCalledTimes(1);
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
    expect(mocks.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        contents: [
          expect.objectContaining({
            role: 'user',
            parts: [
              expect.objectContaining({ text: expect.any(String) }),
              expect.objectContaining({
                text: expect.stringContaining('Texto extraido del CV:'),
              }),
            ],
          }),
        ],
      }),
    );

    expect(result).toMatchObject<Partial<ParsedCandidateProfileData>>({
      firstName: 'Sofia',
      lastName: 'Loria',
      fullName: 'Sofia Loria',
      email: 'sofia@example.com',
      technicalSkills: ['TypeScript', 'Firebase'],
      skills: ['TypeScript', 'Firebase'],
      parserVersion: 'cv-parser/1.0+gemini-2.5-flash',
    });
  });
});
