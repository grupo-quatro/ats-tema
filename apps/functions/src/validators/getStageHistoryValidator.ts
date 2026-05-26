export function validateGetStageHistoryPayload(
  query: Partial<{ applicationId: string }>,
): asserts query is { applicationId: string } {
  if (!query.applicationId || typeof query.applicationId !== 'string') {
    throw new Error('applicationId es requerido.');
  }
}
