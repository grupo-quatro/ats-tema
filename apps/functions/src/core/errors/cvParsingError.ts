export class CvParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CvParsingError';
  }
}
