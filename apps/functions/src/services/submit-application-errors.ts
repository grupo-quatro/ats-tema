export class SubmitApplicationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SubmitApplicationError';
  }
}

export class CandidateNotFoundError extends Error {
  constructor(candidateId: string) {
    super(`El candidato ${candidateId} no existe en el sistema.`);
    this.name = 'CandidateNotFoundError';
  }
}

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`La posición ${jobId} no existe en el sistema.`);
    this.name = 'JobNotFoundError';
  }
}

export class JobNotOpenError extends Error {
  constructor(jobId: string) {
    super(`La posición ${jobId} no está abierta para recibir postulaciones.`);
    this.name = 'JobNotOpenError';
  }
}

export class ApplicationAlreadyExistsError extends Error {
  constructor(candidateId: string, jobId: string) {
    super(
      `Ya existe una postulación del candidato ${candidateId} para la posición ${jobId}.`,
    );
    this.name = 'ApplicationAlreadyExistsError';
  }
}
