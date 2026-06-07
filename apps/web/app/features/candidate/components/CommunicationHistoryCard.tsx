'use client';

import {
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import { Mail, RefreshCw } from 'lucide-react';
import { STAGE_LABELS } from '../../pipeline/constants/stageLabels';
import { useEmailLogs, useRetryEmailSend } from '../hooks/useEmailLogs';

interface CommunicationHistoryCardProps {
  candidateId: string;
}

export function CommunicationHistoryCard({
  candidateId,
}: CommunicationHistoryCardProps) {
  const { data: logs, isLoading } = useEmailLogs(candidateId);
  const retryMutation = useRetryEmailSend(candidateId);

  return (
    <Card>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Mail size={16} color="#64748b" />
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: 'text.secondary' }}
        >
          Comunicaciones
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
      ) : !logs || logs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hay comunicaciones registradas.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {logs.map((log) => {
            const displayDate = log.sentAt ?? log.attemptedAt;
            const dateObj =
              displayDate instanceof Date ? displayDate : new Date(displayDate);
            const isRetrying =
              retryMutation.isPending && retryMutation.variables === log.id;

            return (
              <Box
                key={log.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 1.5,
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
                      {log.subject}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    <Chip
                      label={
                        log.status === 'sent'
                          ? 'Enviado'
                          : log.status === 'failed'
                            ? 'Fallido'
                            : 'Pendiente'
                      }
                      size="small"
                      color={
                        log.status === 'sent'
                          ? 'success'
                          : log.status === 'failed'
                            ? 'error'
                            : 'default'
                      }
                      sx={{ fontSize: 11, height: 22 }}
                    />

                    {log.status === 'failed' && (
                      <Tooltip title="Reenviar email">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => retryMutation.mutate(log.id)}
                            disabled={isRetrying}
                            aria-label="Reenviar email"
                          >
                            {isRetrying ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
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

                {log.status === 'failed' && log.error && (
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
