export class GetEmailLogsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GetEmailLogsValidationError';
  }
}

type GetEmailLogsQuery =
  | { candidateId: string; applicationId?: never }
  | { applicationId: string; candidateId?: never };

export function validateGetEmailLogsPayload(
  query: Partial<{ candidateId: string; applicationId: string }>,
): asserts query is GetEmailLogsQuery {
  const hasCandidateId =
    typeof query.candidateId === 'string' && query.candidateId.length > 0;
  const hasApplicationId =
    typeof query.applicationId === 'string' && query.applicationId.length > 0;

  if (!hasCandidateId && !hasApplicationId) {
    throw new GetEmailLogsValidationError(
      'Se requiere candidateId o applicationId.',
    );
  }
}
