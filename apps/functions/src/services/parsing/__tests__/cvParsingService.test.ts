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
      email: 'candidata.demo@example.com',
      phone: '541155551234',
      technicalSkills: [
        'TypeScript',
        'React',
        'Node.js',
        'Firebase',
        'PostgreSQL',
        'Git',
      ],
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
  "fullName": "Sofia Loria",
  "email": " Sofia@Example.COM ",
  "phone": "(011) 29388293",
  "yearsOfExperience": 80,
  "hardSkills": [" TypeScript ", "Firebase", "typescript", ""],
  "parsedExperience": [
    {
      "company": "Acme",
      "role": "Developer",
      "startDate": "2020",
      "endDate": "Presente"
    }
  ],
  "parsedEducation": [
    {
      "institution": "ORT Argentina",
      "degree": "Analista en Sistemas"
    }
  ]
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
      phone: '01129388293',
      education: 'Analista en Sistemas, ORT Argentina',
      technicalSkills: ['TypeScript', 'Firebase'],
      skills: ['TypeScript', 'Firebase'],
      hardSkills: ['TypeScript', 'Firebase'],
      parsedExperience: [
        {
          company: 'Acme',
          role: 'Developer',
          startDate: '2020',
          endDate: 'Presente',
        },
      ],
      parsedEducation: [
        {
          institution: 'ORT Argentina',
          degree: 'Analista en Sistemas',
        },
      ],
      parserVersion: 'cv-parser/1.0+gemini-2.5-flash',
    });
    expect(result.yearsOfExperience).toBeUndefined();
  });

  it('completa nombre, experiencia y educacion desde el texto cuando IA omite esos campos', async () => {
    process.env.CV_PARSING_FORCE_REAL_AI = 'true';
    process.env.GCP_PROJECT = 'ats-tema-ort';
    mocks.getText.mockResolvedValue({
      text: `Camila
Perez
Software Engineer | TypeScript & Cloud
Sobre mi
Desarrolladora backend.
Experiencia
Backend Developer | Acme Software
Mar 2024 – Presente
Frontend Developer | Nexo Digital
Ene 2022 – Feb 2024
Skills Técnicas
TypeScript, Node.js
Educación
Tecnicatura Superior en Análisis de Sistemas ORT Argentina
2023 – 2026`,
    });
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        lastName: 'Perez',
        technicalSkills: ['TypeScript', 'Node.js'],
        professionalSummary: 'Desarrolladora backend.',
      }),
    });

    const service = new CvParsingService();

    const result = await service.parseFromBuffer(Buffer.from('pdf'));

    expect(result).toMatchObject<Partial<ParsedCandidateProfileData>>({
      firstName: 'Camila',
      lastName: 'Perez',
      fullName: 'Camila Perez',
      education: 'Tecnicatura Superior en Análisis de Sistemas, ORT Argentina',
      parsedExperience: [
        {
          company: 'Acme Software',
          role: 'Backend Developer',
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
          degree: 'Tecnicatura Superior en Análisis de Sistemas',
          startDate: '2023',
          endDate: '2026',
        },
      ],
    });
  });

  it('descarta campos y elementos inválidos conservando los datos utilizables', async () => {
    process.env.CV_PARSING_FORCE_REAL_AI = 'true';
    process.env.GCP_PROJECT = 'ats-tema-ort';
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        fullName: 'Sofia Loria',
        email: 123,
        phone: { value: '11223344' },
        yearsOfExperience: '5',
        technicalSkills: ['TypeScript', 123, null, 'React'],
        parsedExperience: [
          null,
          { company: 'Acme', role: 123, unknownField: 'ignored' },
          { role: 'Developer', description: false },
          {},
        ],
        parsedEducation: 'ORT',
        unknownRootField: 'ignored',
      }),
    });

    const service = new CvParsingService();

    const result = await service.parseFromBuffer(Buffer.from('pdf'));

    expect(result).toMatchObject({
      firstName: 'Sofia',
      lastName: 'Loria',
      fullName: 'Sofia Loria',
      technicalSkills: ['TypeScript', 'React'],
      parsedExperience: [{ company: 'Acme' }, { role: 'Developer' }],
    });
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.yearsOfExperience).toBeUndefined();
    expect(result).not.toHaveProperty('unknownRootField');
  });

  it('rechaza una respuesta estructurada completamente inutilizable', async () => {
    process.env.CV_PARSING_FORCE_REAL_AI = 'true';
    process.env.GCP_PROJECT = 'ats-tema-ort';
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({
        fullName: 123,
        email: false,
        phone: null,
        technicalSkills: 'TypeScript',
        parsedExperience: [{ company: 'Acme' }],
      }),
    });

    const service = new CvParsingService();

    await expect(service.parseFromBuffer(Buffer.from('pdf'))).rejects.toThrow(
      'No se pudo parsear el CV con Vertex AI.',
    );
  });
});
