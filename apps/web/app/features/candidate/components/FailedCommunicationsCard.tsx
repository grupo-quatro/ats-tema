'use client';

import {
  Box,
  Card,
  CircularProgress,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { STAGE_LABELS } from '../../pipeline/constants/stageLabels';
import { useFailedEmailLogs, useRetryFailedEmail } from '../hooks/useEmailLogs';

interface FailedCommunicationsCardProps {
  applicationId: string;
}

export function FailedCommunicationsCard({
  applicationId,
}: FailedCommunicationsCardProps) {
  const { data: logs, isLoading } = useFailedEmailLogs(applicationId);
  const retryMutation = useRetryFailedEmail(applicationId);

  if (!isLoading && (!logs || logs.length === 0)) {
    return null;
  }

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'error.light',
        bgcolor: '#fff5f5',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AlertTriangle size={16} color="#ef4444" />
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: 'error.main' }}
        >
          Comunicaciones fallidas
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Skeleton
            variant="rectangular"
            height={52}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="rectangular"
            height={52}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {logs!.map((log) => {
            const dateObj =
              log.attemptedAt instanceof Date
                ? log.attemptedAt
                : new Date(log.attemptedAt);
            const isRetrying =
              retryMutation.isPending && retryMutation.variables === log.id;

            return (
              <Box
                key={log.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'error.light',
                  borderRadius: 1.5,
                  p: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'text.primary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.templateName}
                    </Typography>
                  </Box>

                  <Tooltip title="Reintentar envío">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => retryMutation.mutate(log.id)}
                        disabled={isRetrying}
                        aria-label="Reintentar envío"
                      >
                        {isRetrying ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 11 }}
                  >
                    {STAGE_LABELS[log.stage]}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 11, flexShrink: 0 }}
                  >
                    {dateObj.toLocaleDateString('es-AR')}{' '}
                    {dateObj.toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>

                {log.error && (
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: 'error.main',
                      mt: 0.5,
                      lineHeight: 1.4,
                    }}
                  >
                    {log.error}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
}
