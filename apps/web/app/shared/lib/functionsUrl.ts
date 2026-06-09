export function getFunctionUrl(name: string): string {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.NEXT_PUBLIC_FUNCTIONS_REGION ?? 'us-central1';
  const port = process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT ?? '5001';

  if (useEmulators) {
    return `http://localhost:${port}/${projectId}/${region}/${name}`;
  }
  return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
}
