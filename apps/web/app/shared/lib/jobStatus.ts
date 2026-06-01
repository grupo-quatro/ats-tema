import type { JobStatus } from '@ats/shared-types';

type JobStatusStyle = {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
};

export const JOB_STATUS_STYLES: Record<JobStatus, JobStatusStyle> = {
  open: {
    label: 'Abierta',
    color: '#166534',
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  closed: {
    label: 'Cerrada',
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  paused: {
    label: 'Pausada',
    color: '#854d0e',
    backgroundColor: '#fef3c7',
    borderColor: '#facc15',
  },
  draft: {
    label: 'Borrador',
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
};

export function getJobStatusStyle(status: JobStatus): JobStatusStyle {
  return JOB_STATUS_STYLES[status];
}
