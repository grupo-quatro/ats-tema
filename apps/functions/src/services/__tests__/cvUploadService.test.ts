import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Candidate, ParsedCandidateProfileData } from '@ats/shared-types';

vi.mock('firebase-functions', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { CvParsingError } from '../../core/errors/cvParsingError';
import { CvUploadService } from '../cvUploadService';

const makeCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: 'candidate-1',
  profileStatus: 'draft',
  registrationType: 'specific',
  registrationSource: 'cv_upload',
  cvParseStatus: 'pending',
  createdAt: new Date('2026-05-01'),
  updatedAt: new Date('2026-05-01'),
  ...overrides,
});

const parsedProfile: ParsedCandidateProfileData = {
  firstName: 'Sofia',
  lastName: 'Loria',
  email: 'sofia@example.com',
  technicalSkills: ['TypeScript', 'Firebase'],
  professionalSummary: 'Perfil tecnico resumido.',
  parserVersion: 'cv-parser/1.0+gemini-2.5-flash',
};

const createRepositoryMock = () => ({
  findById: vi.fn(),
  updateCvStoragePath: vi.fn(),
  markParsingProcessing: vi.fn(),
  markParsingDone: vi.fn(),
  markParsingFailed: vi.fn(),
});

const createParsingServiceMock = () => ({
  parseFromBuffer: vi.fn(),
});

describe('CvUploadService.processUploadedCv', () => {
  const bucketName = 'bucket-test';
  const filePath = 'cvs/candidate-1/cv.pdf';
  const fileBuffer = Buffer.from('pdf-content');

  let repository: ReturnType<typeof createRepositoryMock>;
  let parsingService: ReturnType<typeof createParsingServiceMock>;
  let downloader: ReturnType<typeof vi.fn>;
  let service: CvUploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CV_PARSING_FORCE_REPROCESS;

    repository = createRepositoryMock();
    parsingService = createParsingServiceMock();
    downloader = vi.fn().mockResolvedValue(fileBuffer);

    service = new CvUploadService(
      repository as any,
      parsingService as any,
      downloader,
    );
  });

  it('ignora el evento cuando el candidato no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(repository.findById).toHaveBeenCalledWith('candidate-1');
    expect(repository.markParsingProcessing).not.toHaveBeenCalled();
    expect(downloader).not.toHaveBeenCalled();
    expect(parsingService.parseFromBuffer).not.toHaveBeenCalled();
  });

  it('marca not_required y no parsea cuando el candidato viene de flujo manual', async () => {
    repository.findById.mockResolvedValue(
      makeCandidate({ registrationSource: 'manual' }),
    );

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(repository.updateCvStoragePath).toHaveBeenCalledWith(
      'candidate-1',
      filePath,
      'not_required',
    );
    expect(repository.markParsingProcessing).not.toHaveBeenCalled();
    expect(downloader).not.toHaveBeenCalled();
    expect(parsingService.parseFromBuffer).not.toHaveBeenCalled();
  });

  it('ignora el evento cuando el mismo CV ya fue parseado', async () => {
    repository.findById.mockResolvedValue(
      makeCandidate({
        cvParseStatus: 'done',
        cvStoragePath: filePath,
      }),
    );

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(repository.markParsingProcessing).not.toHaveBeenCalled();
    expect(downloader).not.toHaveBeenCalled();
    expect(parsingService.parseFromBuffer).not.toHaveBeenCalled();
  });

  it('reprocesa un CV done cuando CV_PARSING_FORCE_REPROCESS=true', async () => {
    process.env.CV_PARSING_FORCE_REPROCESS = 'true';
    repository.findById.mockResolvedValue(
      makeCandidate({
        cvParseStatus: 'done',
        cvStoragePath: filePath,
      }),
    );
    parsingService.parseFromBuffer.mockResolvedValue(parsedProfile);

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(repository.markParsingProcessing).toHaveBeenCalledWith(
      'candidate-1',
      filePath,
    );
    expect(parsingService.parseFromBuffer).toHaveBeenCalledWith(
      fileBuffer,
      'application/pdf',
    );
    expect(repository.markParsingDone).toHaveBeenCalledWith(
      'candidate-1',
      parsedProfile,
    );
  });

  it('procesa el CV y persiste done cuando el parsing es exitoso', async () => {
    repository.findById.mockResolvedValue(makeCandidate());
    parsingService.parseFromBuffer.mockResolvedValue(parsedProfile);

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(repository.markParsingProcessing).toHaveBeenCalledWith(
      'candidate-1',
      filePath,
    );
    expect(downloader).toHaveBeenCalledWith(bucketName, filePath);
    expect(parsingService.parseFromBuffer).toHaveBeenCalledWith(
      fileBuffer,
      'application/pdf',
    );
    expect(repository.markParsingDone).toHaveBeenCalledWith(
      'candidate-1',
      parsedProfile,
    );
    expect(repository.markParsingFailed).not.toHaveBeenCalled();
  });

  it('marca failed cuando falla el parser', async () => {
    repository.findById.mockResolvedValue(makeCandidate());
    parsingService.parseFromBuffer.mockRejectedValue(
      new CvParsingError('Vertex AI devolvio JSON invalido.'),
    );

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(repository.markParsingProcessing).toHaveBeenCalledWith(
      'candidate-1',
      filePath,
    );
    expect(repository.markParsingDone).not.toHaveBeenCalled();
    expect(repository.markParsingFailed).toHaveBeenCalledWith(
      'candidate-1',
      'Vertex AI devolvio JSON invalido.',
    );
  });

  it('marca failed cuando falla la descarga del PDF', async () => {
    repository.findById.mockResolvedValue(makeCandidate());
    downloader.mockRejectedValue(new CvParsingError('Archivo no encontrado.'));

    await service.processUploadedCv('candidate-1', bucketName, filePath);

    expect(parsingService.parseFromBuffer).not.toHaveBeenCalled();
    expect(repository.markParsingFailed).toHaveBeenCalledWith(
      'candidate-1',
      'Archivo no encontrado.',
    );
  });
});
