'use client';

import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { JobStatus } from '@ats/shared-types';
import { useUpdatePositionStatus } from '../hooks/useUpdatePositionStatus';

interface Props {
  jobId: string;
  currentStatus: JobStatus;
}

export default function TogglePositionStatusButton({
  jobId,
  currentStatus,
}: Props) {
  const { mutate: updateStatus, isPending } = useUpdatePositionStatus();
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const isOpen = status === 'open';
  const nextStatus: JobStatus = isOpen ? 'closed' : 'open';

  return (
    <Button
      variant="contained"
      disabled={isPending}
      onClick={() =>
        updateStatus(
          { id: jobId, status: nextStatus },
          {
            onSuccess: () => {
              setStatus(nextStatus);
              router.refresh();
            },
          },
        )
      }
      sx={{
        textTransform: 'none',
        bgcolor: isOpen ? '#fee2e2' : '#dcfce7',
        color: isOpen ? '#dc2626' : '#16a34a',
        px: 4,
        py: 1.2,
        fontWeight: 700,
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        '&:hover': {
          bgcolor: isOpen ? '#fecaca' : '#bbf7d0',
        },
      }}
    >
      {isPending
        ? 'Guardando...'
        : isOpen
          ? 'Cerrar posición'
          : 'Abrir posición'}
    </Button>
  );
}
