import type { Job } from '@ats/shared-types';

import { getFunctionUrl } from '../lib/firebase';

export async function listOpenJobs(): Promise<Job[]> {
  const res = await fetch(getFunctionUrl('listOpenJobs'));
  if (!res.ok) throw new Error('Error al obtener las posiciones');
  return res.json();
}
