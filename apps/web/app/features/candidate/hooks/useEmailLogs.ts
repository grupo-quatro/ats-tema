'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEmailLogs,
  getFailedEmailLogs,
  retryEmailSend,
} from '@/shared/api/emailLogsApi';

export const emailLogsQueryKey = (candidateId: string) => [
  'email-logs',
  candidateId,
];

export function useEmailLogs(candidateId: string) {
  return useQuery({
    queryKey: emailLogsQueryKey(candidateId),
    queryFn: () => getEmailLogs(candidateId).then((res) => res.logs),
    enabled: Boolean(candidateId),
  });
}

export const failedEmailLogsQueryKey = (applicationId: string) => [
  'email-logs-failed',
  applicationId,
];

export function useFailedEmailLogs(applicationId: string) {
  return useQuery({
    queryKey: failedEmailLogsQueryKey(applicationId),
    queryFn: () => getFailedEmailLogs(applicationId).then((res) => res.logs),
    enabled: Boolean(applicationId),
  });
}

export function useRetryEmailSend(candidateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => retryEmailSend(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: emailLogsQueryKey(candidateId),
      });
    },
  });
}

export function useRetryFailedEmail(applicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => retryEmailSend(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: failedEmailLogsQueryKey(applicationId),
      });
    },
  });
}
